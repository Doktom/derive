// Rendu 3D axonométrique low poly (Three.js r128), caméra orthographique.
// Même contrat que render.js : init, resize, fit, draw, screenToTile, screenToWorld, shake, pan, zoomAt, cam, dayDark.
// Repère : X = colonne de case, Z = rangée de case, Y = hauteur. La bête marche vers −Z.
G.render = (function () {
  const T = window.THREE;
  const PX = 30;               // pixels par unité au zoom 1
  const AZ0 = 0.56, EL0 = 0.66;     // azimut et élévation de la vue par défaut
  const EL_MIN = 0.42, EL_MAX = 1.4; // de la vue rasante à la vue presque de dessus
  const BASE = 3, DOME = 1.5;  // hauteur du bord du dos, bombé de la carapace
  const P = 32, CELL = 32 / 13; // période du sol (répétition en Z) et taille de ses facettes
  const cam = { x: 5.5, y: 6, z: 1 };

  let cv, renderer, scene, camera, Wp = 0, Hp = 0;
  let sun, hemi;
  let beast, buildingsG, depositsG, groundG, hullMesh, veinMesh, heartMesh, overlayMesh, headG, tailSegs = [], legs = [], cloudsG;
  let matV, matRuin, matVein, matHeart, matOverlay, glowMat;
  let rangeRing, rangeDisc, hoverRing;
  let inst = {};
  let MODELS = {}, DEP_MODELS = {};
  let builtKey = '', groundRegion = -1, overlayKey = '', runSeed = null;
  const bObj = new Map(), dObj = new Map();
  let walkPhase = 0, lastT = 0, shakeUntil = 0;
  // Angles de la caméra : az et el sont affichés, azT et elT sont les cibles vers lesquelles ils glissent.
  let az = AZ0, el = EL0, azT = AZ0, elT = EL0, needle = null;
  const camDir = new T.Vector3(), R = { x: 1, z: 0 }, Fg = { x: 0, z: -1 };
  function setAngles() {
    camDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    R.x = Math.cos(az); R.z = -Math.sin(az);
    Fg.x = -Math.sin(az); Fg.z = -Math.cos(az);
    needle = needle || document.getElementById('view-needle');
    if (needle) needle.style.transform = 'rotate(' + az + 'rad)'; // la tête du Colosse à l'écran
  }
  setAngles();

  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  const clamp = G.util.clamp;

  // ---- Géométrie : assemblage de primitives à facettes, avec couleurs par sommet ----
  function Kit() { this.parts = []; this.seed = 1; }
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();
  Kit.prototype.add = function (geo, color, o) {
    o = o || {};
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set((o.r && o.r[0]) || 0, (o.r && o.r[1]) || 0, (o.r && o.r[2]) || 0);
    _q.setFromEuler(_e);
    _p.set((o.p && o.p[0]) || 0, (o.p && o.p[1]) || 0, (o.p && o.p[2]) || 0);
    if (Array.isArray(o.s)) _s.set(o.s[0], o.s[1], o.s[2]); else _s.setScalar(o.s || 1);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    this.parts.push({ pos: g.attributes.position.array, color, jitter: o.jitter === undefined ? 0.07 : o.jitter });
    return this;
  };
  Kit.prototype.tri = function (a, b, c, color) { this.parts.push({ pos: [a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]], color, jitter: 0 }); return this; };
  Kit.prototype.quad = function (a, b, c, d, color) { return this.tri(a, b, c, color).tri(a, c, d, color); };
  Kit.prototype.build = function () {
    let n = 0;
    for (const p of this.parts) n += p.pos.length;
    const pos = new Float32Array(n), col = new Float32Array(n);
    let o = 0, tri = 0;
    for (const p of this.parts) {
      _c.set(p.color);
      for (let i = 0; i < p.pos.length; i += 9) {
        const k = 1 + (hash(tri++ * 0.77 + this.seed) - 0.5) * 2 * p.jitter;
        for (let v = 0; v < 3; v++) {
          pos[o + v * 3] = p.pos[i + v * 3]; pos[o + v * 3 + 1] = p.pos[i + v * 3 + 1]; pos[o + v * 3 + 2] = p.pos[i + v * 3 + 2];
          col[o + v * 3] = Math.min(1, _c.r * k); col[o + v * 3 + 1] = Math.min(1, _c.g * k); col[o + v * 3 + 2] = Math.min(1, _c.b * k);
        }
        o += 9;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeVertexNormals(); // non indexée : normales par facette
    return g;
  };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (a, b, h, n) => new T.CylinderGeometry(a, b, h, n || 6, 1);
  const cone = (r, h, n) => new T.ConeGeometry(r, h, n || 5, 1);
  const ico = (r) => new T.IcosahedronGeometry(r, 0);
  const dod = (r) => new T.DodecahedronGeometry(r, 0);
  const oct = (r) => new T.OctahedronGeometry(r, 0);

  const WOOD = 0x8a6238, DARKWOOD = 0x5e4228, BONE = 0xece0c4, HIDE = 0xc9a26a, STONE = 0x9a9286, DSTONE = 0x756e64, ROPE = 0xc5a466, GOLD = 0xf2c14e, TEAL = 0x3e9f8c, RUST = 0xc46e37;

  // ---- Modèles des bâtiments (socle en y = 0, tournés vers −Z) ----
  function buildModels() {
    const M = {};
    const plinth = (k, c) => k.add(box(0.84, 0.08, 0.84), c || DARKWOOD, { p: [0, 0.04, 0] });
    const make = (fn) => { const k = new Kit(); fn(k); return k.build(); };

    M.tente = { geo: make(k => {
      k.add(cone(0.5, 0.82, 5), HIDE, { p: [0, 0.41, 0] });
      k.add(box(0.2, 0.34, 0.04), 0x3d2c1e, { p: [0.05, 0.17, 0.4], r: [0, 0.6, 0] });
      k.add(cyl(0.02, 0.02, 0.3, 4), DARKWOOD, { p: [0, 0.92, 0] });
    }) };
    M.nuque = { geo: make(k => {
      k.add(cyl(0.62, 0.72, 0.1, 7), STONE, { p: [0, 0.05, 0] });
      k.add(cone(0.68, 1.3, 6), 0x8a6aa8, { p: [0, 0.75, 0] });
      k.add(cone(0.3, 0.45, 6), 0xc0623b, { p: [0, 1.5, 0] });
      k.add(cyl(0.025, 0.025, 0.7, 4), DARKWOOD, { p: [0, 1.95, 0] });
      k.add(box(0.42, 0.22, 0.02), 0xc0623b, { p: [0.22, 2.18, 0] });
      k.add(box(0.3, 0.46, 0.05), 0x3d2c1e, { p: [0.1, 0.23, 0.56], r: [0, 0.5, 0] });
      k.add(cyl(0.3, 0.26, 0.2, 7), 0x7a5a36, { p: [-0.55, 0.14, 0.35] });
      k.add(ico(0.2), 0x93ab4f, { p: [-0.55, 0.3, 0.35] });
    }) };
    M.grue = {
      geo: make(k => { plinth(k); k.add(cyl(0.3, 0.38, 0.22, 6), DARKWOOD, { p: [0, 0.18, 0] }); k.add(cyl(0.09, 0.12, 0.85, 5), WOOD, { p: [0, 0.68, 0] }); }),
      arm: make(k => {
        k.add(box(0.1, 0.1, 1.15), WOOD, { p: [0, 0, -0.42] });
        k.add(box(0.24, 0.24, 0.26), DSTONE, { p: [0, -0.02, 0.26] });
        k.add(cyl(0.03, 0.03, 0.3, 4), ROPE, { p: [0, -0.15, -0.98] });
      }), armY: 1.1, tip: 0.98, tipY: 1.0
    };
    M.harpon = {
      geo: make(k => { plinth(k); k.add(box(0.55, 0.3, 0.55), DARKWOOD, { p: [0, 0.23, 0] }); k.add(cyl(0.12, 0.16, 0.26, 5), WOOD, { p: [0, 0.5, 0] }); }),
      arm: make(k => {
        k.add(box(0.14, 0.14, 0.9), WOOD, { p: [0, 0, -0.1] });
        k.add(box(0.9, 0.06, 0.08), DARKWOOD, { p: [0, 0, -0.34] });
        k.add(cyl(0.025, 0.025, 1.3, 4), BONE, { p: [0, 0.11, -0.3], r: [Math.PI / 2, 0, 0] });
        k.add(cone(0.08, 0.26, 4), RUST, { p: [0, 0.11, -1.05], r: [-Math.PI / 2, 0, 0] });
        k.add(cyl(0.13, 0.13, 0.12, 6), ROPE, { p: [0, 0.14, 0.26], r: [0, 0, Math.PI / 2] });
      }), armY: 0.7, tip: 1.05, tipY: 0.8
    };
    M.corderie = { geo: make(k => {
      plinth(k);
      for (const s of [-1, 1]) k.add(box(0.1, 0.62, 0.1), WOOD, { p: [s * 0.32, 0.38, 0] });
      k.add(cyl(0.22, 0.22, 0.6, 7), ROPE, { p: [0, 0.5, 0], r: [0, 0, Math.PI / 2] });
      k.add(cyl(0.05, 0.05, 0.84, 4), DARKWOOD, { p: [0, 0.5, 0], r: [0, 0, Math.PI / 2] });
      k.add(cyl(0.18, 0.2, 0.18, 6), 0x93ab4f, { p: [0.18, 0.17, 0.26] });
    }) };
    M.fumoir = { geo: make(k => {
      plinth(k, DSTONE);
      k.add(box(0.66, 0.44, 0.66), STONE, { p: [0, 0.3, 0] });
      k.add(cone(0.56, 0.42, 4), 0x6f5236, { p: [0, 0.73, 0], r: [0, Math.PI / 4, 0] });
      k.add(box(0.16, 0.5, 0.16), DSTONE, { p: [0.17, 0.85, -0.14] });
      k.add(box(0.26, 0.26, 0.04), 0x2b1d14, { p: [-0.05, 0.25, 0.34] });
    }) };
    M.depeceur = { geo: make(k => {
      plinth(k);
      for (const s of [-1, 1]) k.add(box(0.07, 0.86, 0.07), WOOD, { p: [s * 0.33, 0.47, -0.08] });
      k.add(box(0.76, 0.07, 0.07), WOOD, { p: [0, 0.88, -0.08] });
      k.add(box(0.5, 0.56, 0.03), 0xad7c55, { p: [0, 0.56, -0.08] });
      k.add(box(0.5, 0.1, 0.26), DARKWOOD, { p: [0, 0.2, 0.26] });
    }) };
    M.atelier = { geo: make(k => {
      plinth(k);
      k.add(box(0.72, 0.1, 0.42), WOOD, { p: [0, 0.42, 0.06] });
      for (const [x, z] of [[-0.3, -0.1], [0.3, -0.1], [-0.3, 0.22], [0.3, 0.22]]) k.add(box(0.07, 0.34, 0.07), DARKWOOD, { p: [x, 0.22, z] });
      k.add(cyl(0.035, 0.035, 0.5, 4), BONE, { p: [-0.08, 0.51, 0.08], r: [0, 0.9, Math.PI / 2] });
      k.add(oct(0.07), BONE, { p: [0.2, 0.54, -0.02] });
      k.add(cone(0.3, 0.3, 4), HIDE, { p: [0, 0.98, -0.1], r: [0, Math.PI / 4, 0], s: [1.4, 1, 1] });
      for (const s of [-1, 1]) k.add(cyl(0.025, 0.025, 0.76, 4), DARKWOOD, { p: [s * 0.32, 0.5, -0.1] });
    }) };
    M.lanternier = { geo: make(k => {
      plinth(k);
      k.add(box(0.5, 0.3, 0.5), WOOD, { p: [0, 0.23, 0] });
      k.add(cyl(0.03, 0.03, 0.75, 4), DARKWOOD, { p: [-0.26, 0.6, 0.1] });
      k.add(box(0.5, 0.04, 0.04), DARKWOOD, { p: [-0.02, 0.96, 0.1] });
      k.add(oct(0.13), GOLD, { p: [0.18, 0.78, 0.1], jitter: 0 });
      k.add(oct(0.11), 0xf0a93a, { p: [0, 0.48, -0.1], jitter: 0 });
    }) };
    M.forge = { geo: make(k => {
      plinth(k, DSTONE);
      k.add(cyl(0.34, 0.42, 0.5, 6), STONE, { p: [-0.1, 0.32, -0.1] });
      k.add(cyl(0.2, 0.3, 0.42, 6), DSTONE, { p: [-0.1, 0.78, -0.1] });
      k.add(oct(0.15), 0xe8702a, { p: [-0.1, 0.56, 0.2], jitter: 0 });
      k.add(box(0.3, 0.1, 0.16), 0x4a4a50, { p: [0.24, 0.36, 0.26] });
      k.add(box(0.14, 0.26, 0.14), 0x3a3a40, { p: [0.24, 0.2, 0.26] });
    }) };
    M.conteur = { geo: make(k => {
      k.add(cyl(0.44, 0.48, 0.05, 8), 0x7a6444, { p: [0, 0.03, 0] });
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; k.add(dod(0.08), STONE, { p: [Math.cos(a) * 0.24, 0.1, Math.sin(a) * 0.24] }); }
      k.add(cone(0.13, 0.36, 5), 0xf0902f, { p: [0, 0.24, 0], jitter: 0 });
      k.add(cone(0.07, 0.24, 4), GOLD, { p: [0.02, 0.26, 0.01], jitter: 0 });
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * 6.28 + 0.5, x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.38;
        k.add(cyl(0.06, 0.1, 0.24, 5), [0xb4524a, 0x3e8f86, 0xc9a35a][i], { p: [x, 0.17, z] });
        k.add(ico(0.075), 0xdcb48a, { p: [x, 0.36, z] });
      }
    }) };
    M.grenier = { geo: make(k => {
      for (const x of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) k.add(cyl(0.05, 0.06, 0.32, 5), DARKWOOD, { p: [x, 0.16, z] });
      k.add(box(0.8, 0.44, 0.8), WOOD, { p: [0, 0.54, 0] });
      k.add(cyl(0.54, 0.54, 0.9, 3), 0xb4835a, { p: [0, 0.98, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 1.05] });
      k.add(box(0.24, 0.26, 0.03), 0x3d2c1e, { p: [0, 0.5, 0.41] });
    }) };
    M.palissade = { geo: make(k => {
      plinth(k, DSTONE);
      for (let i = -2; i <= 2; i++) {
        const h = 0.74 + hash(i + 4) * 0.2;
        k.add(cyl(0.08, 0.09, h, 5), WOOD, { p: [i * 0.17, 0.08 + h / 2, 0] });
        k.add(cone(0.085, 0.2, 5), BONE, { p: [i * 0.17, 0.18 + h, 0] });
      }
      k.add(box(0.86, 0.08, 0.05), DARKWOOD, { p: [0, 0.5, 0.09] });
    }) };
    M.lanceur = {
      geo: make(k => { plinth(k); k.add(box(0.6, 0.18, 0.6), WOOD, { p: [0, 0.17, 0] }); }),
      arm: make(k => {
        for (const s of [-1, 1]) k.add(box(0.07, 0.42, 0.07), DARKWOOD, { p: [s * 0.22, 0.1, 0] });
        k.add(box(0.5, 0.06, 0.06), DARKWOOD, { p: [0, 0.3, 0] });
        k.add(box(0.07, 0.07, 0.86), BONE, { p: [0, 0.28, 0.1], r: [-0.5, 0, 0] });
        k.add(cyl(0.13, 0.08, 0.1, 6), BONE, { p: [0, 0.48, 0.48] });
      }), armY: 0.3, aim: true
    };
    M.baliste = {
      geo: make(k => { plinth(k, DSTONE); k.add(cyl(0.34, 0.42, 0.38, 7), STONE, { p: [0, 0.27, 0] }); }),
      arm: make(k => {
        k.add(box(0.14, 0.14, 1.02), WOOD, { p: [0, 0.08, 0] });
        k.add(box(1.0, 0.07, 0.09), DARKWOOD, { p: [0, 0.1, -0.3], r: [0, 0, 0] });
        for (const s of [-1, 1]) k.add(cone(0.05, 0.24, 4), TEAL, { p: [s * 0.54, 0.1, -0.3], r: [0, 0, s * -Math.PI / 2] });
        k.add(cone(0.07, 0.3, 4), RUST, { p: [0, 0.18, -0.68], r: [-Math.PI / 2, 0, 0] });
      }), armY: 0.47, aim: true
    };
    M.epouilleurs = { geo: make(k => {
      plinth(k);
      k.add(box(0.62, 0.42, 0.62), 0x7d4a3e, { p: [0, 0.29, 0] });
      k.add(cyl(0.5, 0.5, 0.7, 3), 0x5f3a31, { p: [0, 0.68, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 1.1] });
      for (const s of [-1, 1]) {
        k.add(cyl(0.02, 0.02, 0.92, 4), DARKWOOD, { p: [s * 0.38, 0.5, 0.36] });
        k.add(cone(0.05, 0.16, 4), BONE, { p: [s * 0.38, 1.02, 0.36] });
      }
      k.add(cyl(0.16, 0.16, 0.04, 6), TEAL, { p: [0, 0.34, 0.33], r: [Math.PI / 2, 0, 0] });
    }) };
    return M;
  }

  // ---- Modèles des gisements ----
  function buildDepositModels() {
    const M = {};
    const variants = (fn, n) => { const out = []; for (let v = 0; v < (n || 3); v++) { const k = new Kit(); k.seed = v * 9 + 2; fn(k, v); out.push(k.build()); } return out; };
    const scatter = (k, v, i) => [(hash(v * 31 + i * 7) - 0.5) * 1.6, (hash(v * 17 + i * 13) - 0.5) * 1.3];

    M.prairie = variants((k, v) => {
      k.add(cyl(1.05, 1.15, 0.06, 7), 0x93ab4f, { p: [0, 0.03, 0], s: [1, 1, 0.85] });
      for (let i = 0; i < 16; i++) {
        const [x, z] = scatter(k, v, i), h = 0.28 + hash(i + v) * 0.3;
        k.add(cone(0.09, h, 3), i % 3 ? 0x7f9a42 : 0xb8c56a, { p: [x * 0.65, h / 2 + 0.05, z * 0.65] });
      }
    });
    M.broussailles = variants((k, v) => {
      for (let i = 0; i < 5; i++) {
        const [x, z] = scatter(k, v, i), r = 0.26 + hash(i * 3 + v) * 0.22;
        k.add(cyl(0.04, 0.06, 0.3, 4), DARKWOOD, { p: [x * 0.6, 0.14, z * 0.6] });
        k.add(ico(r), i % 2 ? 0x8a7a45 : 0x6f7a3f, { p: [x * 0.6, 0.3 + r * 0.6, z * 0.6], s: [1, 0.85, 1] });
      }
    });
    M.rocher = variants((k, v) => {
      for (let i = 0; i < 3; i++) {
        const [x, z] = scatter(k, v, i), r = 0.42 + hash(i * 5 + v) * 0.36;
        k.add(dod(r), i % 2 ? STONE : DSTONE, { p: [x * 0.5, r * 0.5, z * 0.5], r: [hash(i) * 3, hash(i + 1) * 3, 0], s: [1.15, 0.72, 0.95] });
      }
    });
    M.affleurement = variants((k, v) => {
      k.add(dod(0.62), DSTONE, { p: [0, 0.26, 0], s: [1.25, 0.6, 1.05] });
      for (let i = 0; i < 6; i++) {
        const [x, z] = scatter(k, v, i), h = 0.42 + hash(i + v * 2) * 0.55;
        k.add(cone(0.14, h, 4), i % 2 ? TEAL : 0x62c2ac, { p: [x * 0.42, 0.34 + h / 2, z * 0.42], r: [(hash(i) - 0.5) * 0.5, 0, (hash(i + 2) - 0.5) * 0.5] });
      }
    });
    M.ossuaire = variants((k, v) => {
      for (let i = 0; i < 8; i++) {
        const [x, z] = scatter(k, v, i), a = hash(i * 3 + v) * 3.14, l = 0.4 + hash(i) * 0.3, y = 0.08;
        k.add(cyl(0.035, 0.035, l, 4), BONE, { p: [x * 0.7, y, z * 0.7], r: [0, a, Math.PI / 2] });
        for (const s of [-1, 1]) k.add(oct(0.07), BONE, { p: [x * 0.7 + Math.cos(a) * s * l / 2, y, z * 0.7 - Math.sin(a) * s * l / 2] });
      }
      k.add(ico(0.16), BONE, { p: [0.2, 0.12, -0.1], s: [1, 0.8, 1.2] });
    });
    M.troupeau = variants((k, v) => {
      for (let i = 0; i < 5; i++) {
        const [x, z] = scatter(k, v, i), dir = hash(i * 9 + v) < 0.5 ? -1 : 1, col = i % 2 ? 0x8a5a3b : 0xa06b45;
        k.add(box(0.48, 0.24, 0.24), col, { p: [x * 0.7, 0.3, z * 0.7] });
        k.add(box(0.2, 0.2, 0.18), col, { p: [x * 0.7 + dir * 0.3, 0.42, z * 0.7] });
        for (const s of [-1, 1]) k.add(cone(0.03, 0.16, 3), BONE, { p: [x * 0.7 + dir * 0.34, 0.58, z * 0.7 + s * 0.08] });
        for (const a of [-0.17, 0.17]) for (const b of [-0.08, 0.08]) k.add(box(0.05, 0.2, 0.05), 0x4a3324, { p: [x * 0.7 + a, 0.1, z * 0.7 + b] });
      }
    });
    M.carcasse = variants((k) => {
      k.add(cyl(0.1, 0.1, 2.4, 5), BONE, { p: [0, 0.2, 0], r: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 7; i++) {
        const z = -1 + i * 0.32, r = 0.62 + Math.sin((i + 1) / 8 * 3.14) * 0.3;
        k.add(new T.TorusGeometry(r, 0.055, 4, 7, Math.PI), BONE, { p: [0, 0.2, z] });
      }
      k.add(dod(0.4), BONE, { p: [0, 0.34, -1.55], s: [0.9, 0.8, 1.2] });
      for (const s of [-1, 1]) k.add(cone(0.08, 0.7, 4), BONE, { p: [s * 0.35, 0.7, -1.5], r: [0.2, 0, s * -0.7] });
    }, 2);
    M.ruine = variants((k, v) => {
      k.add(cyl(0.95, 1.05, 0.08, 7), 0xa4977f, { p: [0, 0.04, 0] });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28, h = 0.2 + hash(i + v) * 0.6;
        k.add(box(0.2, h, 0.2), STONE, { p: [Math.cos(a) * 0.72, h / 2 + 0.06, Math.sin(a) * 0.72], r: [0, a, (hash(i) - 0.5) * 0.25] });
      }
      k.add(cone(0.42, 0.72, 4), 0x8b6db5, { p: [0, 0.42, 0] });
    }, 2);
    M.arbre = variants((k, v) => {
      k.add(cyl(0.3, 0.55, 1.6, 6), 0x7b6a55, { p: [0, 0.8, 0] });
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * 6.28 + v, h = 0.95 + hash(i + v) * 0.55;
        k.add(cone(0.15, 1.15, 4), i % 2 ? 0x9a8a72 : 0x6b5c49, { p: [Math.cos(a) * 0.38, 1.5 + h * 0.3, Math.sin(a) * 0.38], r: [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7] });
      }
      k.add(cyl(0.72, 0.85, 0.16, 7), 0x5e4f3e, { p: [0, 0.08, 0] });
    });
    M.resineux = variants((k, v) => {
      for (let i = 0; i < 3; i++) {
        const [x, z] = scatter(k, v, i), s = 0.8 + hash(i + v) * 0.5;
        k.add(cyl(0.06, 0.08, 0.3, 4), DARKWOOD, { p: [x * 0.6, 0.15, z * 0.6] });
        k.add(cone(0.42 * s, 0.7 * s, 6), 0x4f6a43, { p: [x * 0.6, 0.3 + 0.35 * s, z * 0.6] });
        k.add(cone(0.3 * s, 0.56 * s, 6), 0x5d7a4d, { p: [x * 0.6, 0.3 + 0.8 * s, z * 0.6] });
        k.add(oct(0.08), 0xe2a227, { p: [x * 0.6 + 0.18, 0.5, z * 0.6 + 0.3], jitter: 0 });
      }
    });
    return M;
  }

  // ---- Surface de la carapace ----
  function hwc(z, L) { return Math.max(0.5, Math.min(G.BEAST.maxHW, 2 + 1.5 * (z - 0.5), 1 + 1.2 * (L - 0.5 - z)) + 0.5); }
  function surface(x, z) {
    const run = G.run, L = run.L;
    const u = clamp(Math.abs(x - (run.cx + 0.5)) / hwc(z, L), 0, 1);
    const a = Math.pow(clamp(Math.min((z + 1) / 3, (L + 1 - z) / 4), 0, 1), 0.7);
    return BASE + DOME * (1 - u * u) * a;
  }
  function tileY(x, y) { return surface(x + 0.5, y + 0.5) + 0.09; }
  // Hauteur d'une unité : sur le dos, ou en train d'escalader le flanc.
  function unitY(x, z) {
    const run = G.run;
    if (G.beast.inBack(Math.floor(x), Math.floor(z))) return surface(x, z) + 0.1;
    const zz = clamp(z, 0, run.L);
    const o = Math.max(Math.abs(x - (run.cx + 0.5)) - hwc(zz, run.L), z - run.L, -z);
    return Math.max(0.05, BASE * (1 - clamp(o / 1.8, 0, 1)));
  }

  // ---- Corps de la bête (reconstruit quand elle grandit) ----
  function rebuildBeast(run) {
    const B = G.beast, cx = run.cx, L = run.L;
    const plates = new Kit();
    for (let y = 0; y < L; y++) {
      const h = B.hw(y);
      for (let x = cx - h; x <= cx + h; x++) {
        const n = hash(x * 31 + y * 17), flank = B.isFlank(x, y), spine = x === cx, scar = B.isScar(x, y), vein = B.isVein(x, y);
        let col = new T.Color(spine ? 0xbda97c : flank ? 0x74633f : (n > 0.84 ? 0x7f8f52 : 0x9b8a60));
        col.offsetHSL(0, 0, (n - 0.5) * 0.07);
        if (vein) col.lerp(new T.Color(0xb0583f), 0.42);
        if (scar) col.set(0x44362a);
        const c = col.getHex();
        const pt = (px, pz, dy) => [px, surface(px, pz) + dy, pz];
        const i = 0.055, lift = scar ? 0.02 : 0.09;
        const a = pt(x + i, y + i, lift), b = pt(x + 1 - i, y + i, lift), cc = pt(x + 1 - i, y + 1 - i, lift), d = pt(x + i, y + 1 - i, lift);
        plates.quad(a, d, cc, b, c);
        const dark = 0x4e4030, a0 = pt(x + i, y + i, -0.03), b0 = pt(x + 1 - i, y + i, -0.03), c0 = pt(x + 1 - i, y + 1 - i, -0.03), d0 = pt(x + i, y + 1 - i, -0.03);
        plates.quad(a0, a, b, b0, dark); plates.quad(b0, b, cc, c0, dark); plates.quad(c0, cc, d, d0, dark); plates.quad(d0, d, a, a0, dark);
        const f = (px, pz) => pt(px, pz, -0.04);
        plates.quad(f(x, y), f(x, y + 1), f(x + 1, y + 1), f(x + 1, y), 0x4a3b2c);
      }
    }
    // Pourtour : anneaux extrudés autour du dos.
    const rim = [];
    const cxc = cx + 0.5, ext = k => Math.max(B.hw(k - 1), B.hw(k), 0) + 0.5;
    rim.push([cxc, -0.5]);
    for (let k = 0; k <= L; k++) rim.push([cxc + ext(k), k]);
    rim.push([cxc, L + 0.5]);
    for (let k = L; k >= 0; k--) rim.push([cxc - ext(k), k]);
    const N = rim.length;
    const norm = rim.map((p, i) => {
      const a = rim[(i - 1 + N) % N], b = rim[(i + 1) % N];
      let nx = b[1] - a[1], nz = a[0] - b[0];
      const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      return (p[0] - cxc) * nx + (p[1] - L / 2) * nz < 0 ? [-nx, -nz] : [nx, nz];
    });
    const ring = (off, y) => rim.map((p, i) => [p[0] + norm[i][0] * off, y, p[1] + norm[i][1] * off]);
    const rings = [ring(0.02, BASE + 0.02), ring(0.38, BASE - 0.22), ring(1.05, BASE - 1.05), ring(0.82, BASE - 2.0), ring(0.1, BASE - 2.35)];
    const ringCols = [0x6f5c42, 0x665339, 0x5c4a33, 0x4f3f2c, 0x43351f];
    const hull = new Kit();
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, c = new T.Color(ringCols[r]);
        c.offsetHSL(0, 0, (hash(i * 3.3 + r) - 0.5) * 0.06);
        hull.quad(rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i], c.getHex());
      }
    }
    const bellyC = [cxc, BASE - 2.4, L / 2];
    for (let i = 0; i < N; i++) hull.tri(rings[4][(i + 1) % N], bellyC, rings[4][i], 0x3b2e1c);
    // Le pourtour est orienté de l'extérieur : on complète les plaques.
    hull.parts.push(...plates.parts);
    if (hullMesh.geometry) hullMesh.geometry.dispose();
    hullMesh.geometry = hull.build();

    // Veines : rubans sur la carapace.
    const veins = run.veins.map(k => k.split(',').map(Number)).filter(([x, y]) => B.inBack(x, y));
    const vs = {}; for (const [x, y] of veins) vs[x + ',' + y] = 1;
    vs[run.heart.x + ',' + run.heart.y] = 1;
    const vk = new Kit();
    const W = 0.075, ly = 0.13;
    for (const [x, y] of veins.concat([[run.heart.x, run.heart.y]])) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (!vs[(x + dx) + ',' + (y + dy)]) continue;
        if (dx && dy && (vs[(x + dx) + ',' + y] || vs[x + ',' + (y + dy)])) continue;
        const ax = x + 0.5, az = y + 0.5, bx = ax + dx, bz = az + dy, l = Math.hypot(dx, dy), nx = -dy / l * W, nz = dx / l * W;
        const H = (px, pz) => surface(px, pz) + ly;
        vk.quad([ax + nx, H(ax, az), az + nz], [bx + nx, H(bx, bz), bz + nz], [bx - nx, H(bx, bz), bz - nz], [ax - nx, H(ax, az), az - nz], 0xffffff);
      }
    }
    if (veinMesh.geometry) veinMesh.geometry.dispose();
    veinMesh.geometry = vk.build();
    heartMesh.position.set(run.heart.x + 0.5, tileY(run.heart.x, run.heart.y) + 0.26, run.heart.y + 0.5);

    // Membres
    const pairs = [Math.round(L * 0.2), Math.round(L * 0.68)];
    let n = 0;
    pairs.forEach((py) => [-1, 1].forEach(s => {
      const l = legs[n++];
      l.hip.position.set(cxc + s * (B.hw(py) + 1.0), BASE - 1.0, py + 0.5);
      l.hip.rotation.z = s * 0.2;
      l.side = s;
    }));
    headG.position.set(cxc, BASE - 0.55, -0.1);
    tailSegs[0].position.set(cxc, BASE - 1.15, L + 0.2);
  }

  function buildLimbs() {
    for (let i = 0; i < 4; i++) {
      const upper = new Kit(), lower = new Kit();
      upper.add(cyl(1.0, 0.76, 1.25, 7), 0x6e5b43, { p: [0, -0.56, 0] });
      lower.add(cyl(0.76, 0.86, 0.9, 7), 0x5b4a36, { p: [0, -0.45, 0] });
      lower.add(cyl(1.1, 1.22, 0.24, 8), 0x4a3b2b, { p: [0, -0.9, 0.05] });
      for (let t = -1; t <= 1; t++) lower.add(oct(0.2), BONE, { p: [t * 0.55, -0.9, -1.05 + Math.abs(t) * 0.18], s: [1, 0.6, 1.2] });
      const hip = new T.Group(), up = new T.Mesh(upper.build(), matV), knee = new T.Group(), low = new T.Mesh(lower.build(), matV);
      up.castShadow = low.castShadow = true;
      knee.position.y = -1.1;
      knee.add(low); hip.add(up); hip.add(knee);
      beast.add(hip);
      legs.push({ hip, knee, side: 1 });
    }
    // Tête
    const h = new Kit();
    h.add(box(2.7, 1.8, 2.4), 0x5f4d38, { p: [0, -0.15, -0.3] });
    h.add(dod(1.55), 0x6f5c44, { p: [0, 0.3, -2.1], s: [1.1, 0.82, 1.22] });
    h.add(cyl(0.78, 1.12, 1.4, 7), 0x7c684d, { p: [0, -0.05, -3.45], r: [Math.PI / 2, 0, 0] });
    h.add(cyl(0.72, 0.78, 0.14, 7), 0x4a3b2b, { p: [0, -0.05, -4.2], r: [Math.PI / 2, 0, 0] });
    for (const s of [-1, 1]) {
      h.add(cone(0.32, 2.6, 5), BONE, { p: [s * 2.0, 1.45, -1.8], r: [0.25, 0, s * -0.95] });
      h.add(oct(0.23), 0x1a120b, { p: [s * 1.2, 0.72, -2.95], jitter: 0 });
      h.add(oct(0.09), 0xf6ead0, { p: [s * 1.24, 0.82, -3.12], jitter: 0 });
      h.add(oct(0.1), 0x2c2016, { p: [s * 0.32, 0.5, -4.15], jitter: 0 });
    }
    const headMesh = new T.Mesh(h.build(), matV);
    headMesh.castShadow = true;
    headG.add(headMesh);
    // Tic, perché sur le front
    const tic = new Kit();
    tic.add(ico(0.2), 0x5a4636, { s: [1, 0.85, 1.3] });
    tic.add(ico(0.13), 0x6b5442, { p: [0, 0.16, -0.2] });
    tic.add(cone(0.05, 0.2, 3), 0xe3a43a, { p: [0, 0.16, -0.38], r: [-Math.PI / 2, 0, 0] });
    tic.add(cone(0.08, 0.3, 3), 0x4a382a, { p: [0, 0.03, 0.32], r: [Math.PI / 2 + 0.3, 0, 0] });
    const ticMesh = new T.Mesh(tic.build(), matV);
    ticMesh.name = 'tic';
    ticMesh.position.set(0.4, 1.68, -2.3);
    headG.add(ticMesh);
    // Queue : segments emboîtés
    let parent = beast;
    const nSeg = 7;
    for (let i = 0; i < nSeg; i++) {
      const r0 = 1.15 * (1 - i / nSeg) + 0.08, r1 = 1.15 * (1 - (i + 1) / nSeg) + 0.08;
      const k = new Kit();
      k.add(cyl(r1, r0, 1.05, 6), i % 2 ? 0x5f4d38 : 0x6a563e, { p: [0, 0, 0.5], r: [Math.PI / 2, 0, 0] });
      if (i < nSeg - 1) k.add(cone(0.2 * (1 - i / nSeg) + 0.05, 0.5, 4), BONE, { p: [0, r0 * 0.85 + 0.12, 0.5] });
      const seg = new T.Group(), m = new T.Mesh(k.build(), matV);
      m.castShadow = true;
      seg.add(m);
      if (i > 0) { seg.position.z = 0.98; seg.rotation.x = 0.1; }
      parent.add(seg);
      parent = seg;
      tailSegs.push(seg);
    }
  }

  // ---- Sol ----
  function rebuildGround(run) {
    const reg = G.REGIONS[run.region];
    while (groundG.children.length) { const c = groundG.children.pop(); c.geometry.dispose(); }
    const k = new Kit();
    const hAt = (x, z) => Math.sin(x * 0.37 + 1) * 0.18 + Math.sin(z / P * 6.283 * 2 + x * 0.2) * 0.16 + Math.sin(z / P * 6.283 * 3 - x * 0.5 + 2) * 0.1 - 0.25;
    const cols = reg.ground.map(c => new T.Color(c));
    // Assez large pour rester sous la vue quand on tourne la caméra ou qu'on la baisse.
    const X0 = -112, Z0 = -144, nx = 92, nz = 113;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = X0 + i * CELL, z = Z0 + j * CELL;
      const v = (a, b) => [x + a * CELL, hAt(x + a * CELL, z + b * CELL), z + b * CELL];
      const a = v(0, 0), b = v(1, 0), c = v(1, 1), d = v(0, 1);
      const jz = ((j % 13) + 13) % 13; // motif périodique
      for (const [tri, s] of [[[a, d, c], 1], [[a, c, b], 2]]) {
        const n = hash(i * 13.1 + jz * 7.7 + s * 3.3), col = cols[n < 0.45 ? 0 : n < 0.75 ? 1 : 2].clone();
        col.offsetHSL(0, 0, (hash(i * 3 + jz * 11 + s) - 0.5) * 0.04);
        k.tri(tri[0], tri[1], tri[2], col.getHex());
      }
    }
    // Décor : cailloux et touffes, répétés à chaque période.
    const speck = new T.Color(reg.speck).getHex();
    for (let p = 0; p < 9; p++) {
      for (let i = 0; i < 110; i++) {
        const x = X0 + hash(i * 1.7) * 226, z = Z0 + p * P + hash(i * 2.9) * P;
        if (i % 3) k.add(cone(0.1, 0.3 + hash(i) * 0.2, 3), speck, { p: [x, hAt(x, z) + 0.14, z], jitter: 0.1 });
        else k.add(oct(0.1 + hash(i) * 0.2), 0x8a8071, { p: [x, hAt(x, z) + 0.05, z], s: [1.2, 0.7, 1] });
      }
    }
    const m = new T.Mesh(k.build(), matV);
    m.receiveShadow = true;
    groundG.add(m);
    scene.background = new T.Color(reg.ground[0]);
  }

  // ---- Initialisation ----
  function instanced(geo, mat, count) {
    const m = new T.InstancedMesh(geo, mat, count);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const white = new T.Color(0xffffff);
    for (let i = 0; i < count; i++) m.setColorAt(i, white); // sinon les instances sans couleur seraient noires
    m.count = 0; // après le remplissage : setColorAt dimensionne ses couleurs d'après count
    scene.add(m);
    return m;
  }

  function init(canvas) {
    cv = canvas;
    try { renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { console.warn('WebGL indisponible, retour à la version 2D', e); location.replace('index.html'); return; }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = new T.OrthographicCamera(-10, 10, 10, -10, 1, 700);
    const saved = G.meta && G.meta.settings;
    if (saved && saved.camAz !== undefined) { az = azT = saved.camAz; el = elT = clamp(saved.camEl, EL_MIN, EL_MAX); setAngles(); }
    matV = new T.MeshLambertMaterial({ vertexColors: true });
    matRuin = new T.MeshLambertMaterial({ vertexColors: true, color: 0x6f6a62 });
    matVein = new T.MeshBasicMaterial({ color: 0xcd5240 });
    matHeart = new T.MeshBasicMaterial({ color: 0xc0372d });
    matOverlay = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
    hemi = new T.HemisphereLight(0xfff1d8, 0x8a7350, 0.7); scene.add(hemi);
    sun = new T.DirectionalLight(0xfff0d0, 0.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 5; sc.far = 220;
    sun.shadow.bias = -0.0012; sun.shadow.radius = 2;
    scene.add(sun); scene.add(sun.target);
    groundG = new T.Group(); scene.add(groundG);
    depositsG = new T.Group(); scene.add(depositsG);
    beast = new T.Group(); scene.add(beast);
    buildingsG = new T.Group(); beast.add(buildingsG);
    hullMesh = new T.Mesh(new T.BufferGeometry(), matV); hullMesh.castShadow = hullMesh.receiveShadow = true; beast.add(hullMesh);
    veinMesh = new T.Mesh(new T.BufferGeometry(), matVein); beast.add(veinMesh);
    heartMesh = new T.Mesh(new T.IcosahedronGeometry(0.34, 0), matHeart); beast.add(heartMesh);
    headG = new T.Group(); beast.add(headG);
    buildLimbs();
    MODELS = buildModels();
    DEP_MODELS = buildDepositModels();

    overlayMesh = new T.Mesh(new T.BufferGeometry(), matOverlay); overlayMesh.renderOrder = 3; beast.add(overlayMesh);
    const ringMat = new T.MeshBasicMaterial({ color: 0xfff8e6, transparent: true, opacity: 0.75, depthTest: false, side: T.DoubleSide });
    rangeRing = new T.Mesh(new T.RingGeometry(0.975, 1, 72).rotateX(-Math.PI / 2), ringMat); rangeRing.renderOrder = 6; rangeRing.visible = false; scene.add(rangeRing);
    rangeDisc = new T.Mesh(new T.CircleGeometry(1, 72).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xfff8e6, transparent: true, opacity: 0.1, depthTest: false, side: T.DoubleSide }));
    rangeDisc.renderOrder = 5; rangeDisc.visible = false; scene.add(rangeDisc);
    hoverRing = new T.Mesh(new T.RingGeometry(0.92, 1, 24).rotateX(-Math.PI / 2), ringMat); hoverRing.renderOrder = 6; hoverRing.visible = false; scene.add(hoverRing);

    // Halo nocturne
    const gc = document.createElement('canvas'); gc.width = gc.height = 64;
    const g = gc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,190,100,1)'); gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowMat = new T.SpriteMaterial({ map: new T.CanvasTexture(gc), blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });

    // Pools d'objets instanciés
    const white = () => new T.MeshBasicMaterial({ color: 0xffffff });
    const fig = new Kit(); fig.add(cyl(0.05, 0.09, 0.22, 5), 0xc9a06a, { p: [0, 0.13, 0] }); fig.add(ico(0.065), 0xdcb48a, { p: [0, 0.3, 0] });
    inst.fig = instanced(fig.build(), new T.MeshLambertMaterial({ vertexColors: true }), 500);
    inst.pack = instanced(new T.OctahedronGeometry(0.1, 0), new T.MeshLambertMaterial({ color: 0xffffff }), 500);
    const tick = new Kit();
    tick.add(ico(0.5), 0xffffff, { s: [0.72, 0.5, 1], p: [0, 0.3, 0], jitter: 0.12 });
    tick.add(ico(0.16), 0xcccccc, { p: [0, 0.3, -0.5], jitter: 0 });
    for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) tick.add(cone(0.05, 0.62, 3), 0x444444, { p: [s * 0.42, 0.14, i * 0.28], r: [0, 0, s * 1.2], jitter: 0 });
    inst.tick = instanced(tick.build(), new T.MeshLambertMaterial({ vertexColors: true }), 300);
    const sol = new Kit();
    sol.add(cyl(0.07, 0.1, 0.26, 5), 0x3f8f86, { p: [0, 0.15, 0] }); sol.add(ico(0.08), 0xe8d8b0, { p: [0, 0.35, 0] }); sol.add(cyl(0.015, 0.015, 0.62, 4), BONE, { p: [0.13, 0.3, 0] });
    inst.sol = instanced(sol.build(), new T.MeshLambertMaterial({ vertexColors: true }), 100);
    inst.beam = instanced(new T.CylinderGeometry(1, 1, 1, 5, 1), white(), 500);
    inst.badge = instanced(new T.OctahedronGeometry(0.12, 0), white(), 260);
    inst.pip = instanced(new T.OctahedronGeometry(0.055, 0), new T.MeshBasicMaterial({ color: 0xf2d27a }), 500);
    inst.puff = instanced(new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ color: 0xcfc6b6 }), 160);
    inst.arrow = instanced(new T.ConeGeometry(0.55, 1.1, 4), new T.MeshBasicMaterial({ color: 0xc9443a }), 3);
    const barMat = new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true });
    inst.bar = instanced(new T.PlaneGeometry(1, 1), barMat, 500); inst.bar.renderOrder = 8;

    // Ombres de nuages : invisibles, elles ne projettent que leur ombre.
    cloudsG = new T.Group(); scene.add(cloudsG);
    const cloudMat = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    for (let i = 0; i < 2; i++) {
      const k = new Kit();
      for (let j = 0; j < 4; j++) k.add(ico(1.8 + hash(j + i) * 1.6), 0xffffff, { p: [(hash(j * 3 + i) - 0.5) * 7, 0, (hash(j * 7 + i) - 0.5) * 5], s: [1.3, 0.4, 1] });
      const m = new T.Mesh(k.build(), cloudMat);
      m.castShadow = true; m.frustumCulled = false;
      cloudsG.add(m);
    }
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!cv) return;
    const r = cv.parentElement.getBoundingClientRect();
    Wp = r.width; Hp = r.height;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(Wp, Hp, false);
    updateCamera(0, 0);
  }

  function updateCamera(sx, sy) {
    const hw = Wp / (2 * PX * cam.z), hh = Hp / (2 * PX * cam.z);
    camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
    camera.updateProjectionMatrix();
    const D = 220;
    const k = 1 / (PX * cam.z);
    camera.position.set(cam.x + camDir.x * D + R.x * sx * k, BASE + camDir.y * D, cam.y + camDir.z * D + R.z * sx * k + sy * k);
    camera.lookAt(cam.x + R.x * sx * k, BASE, cam.y + R.z * sx * k + sy * k);
    camera.updateMatrixWorld();
  }

  function fit() {
    const run = G.run;
    if (!run || !Wp) return;
    const cxc = run.cx + 0.5, up = new T.Vector3(0, 1, 0).sub(camDir.clone().multiplyScalar(camDir.y)).normalize();
    let w = 0, h = 0;
    for (const [x, y, z] of [[cxc - 10, 0, -5], [cxc + 10, 0, -5], [cxc - 10, 0, run.L + 5], [cxc + 10, 0, run.L + 5], [cxc, 6, -5], [cxc, 6, run.L + 3]]) {
      const dx = x - cxc, dz = z - run.L / 2;
      w = Math.max(w, Math.abs(dx * R.x + dz * R.z));
      h = Math.max(h, Math.abs(dx * up.x + (y - BASE) * up.y + dz * up.z));
    }
    cam.z = clamp(Math.min(Wp / (2 * w * PX), Hp / (2 * h * PX)), 0.32, 2.6);
    cam.x = cxc; cam.y = run.L / 2;
    updateCamera(0, 0);
  }

  // ---- Conversion écran → monde ----
  const _ray = { o: new T.Vector3(), d: new T.Vector3() };
  function ray(px, py) {
    _ray.o.set((px / Wp) * 2 - 1, -(py / Hp) * 2 + 1, -1).unproject(camera);
    camera.getWorldDirection(_ray.d);
    return _ray;
  }
  function onPlane(r, y) { const t = (y - r.o.y) / r.d.y; return { x: r.o.x + r.d.x * t, z: r.o.z + r.d.z * t, t }; }

  function screenToTile(px, py) {
    const run = G.run, r = ray(px, py);
    let best = null;
    const test = (x, y, h) => {
      const p = onPlane(r, h);
      if (p.x >= x && p.x < x + 1 && p.z >= y && p.z < y + 1 && (!best || p.t < best.t)) best = { x, y, wx: p.x, wy: p.z, t: p.t };
    };
    // Le volume des bâtiments d'abord (cliquer sur un toit sélectionne le bâtiment).
    for (const b of run.buildings) for (const dh of [0.75, 0.4]) test(b.x, b.y, tileY(b.x, b.y) + dh);
    if (best) return best;
    for (let y = 0; y < run.L; y++) {
      const h = G.beast.hw(y);
      for (let x = run.cx - h; x <= run.cx + h; x++) test(x, y, tileY(x, y));
    }
    if (best) return best;
    const g = onPlane(r, 0);
    return { x: -99, y: -99, wx: g.x, wy: g.z };
  }
  function screenToWorld(px, py) { const g = onPlane(ray(px, py), BASE); return { x: g.x, y: g.z }; }

  // ---- Synchronisation des objets ----
  function setInst(m, i, x, y, z, sx, sy, sz, q, color) {
    _p.set(x, y, z); _s.set(sx, sy, sz);
    _m.compose(_p, q || _qId, _s);
    m.setMatrixAt(i, _m);
    if (color !== undefined) { _c.set(color); m.setColorAt(i, _c); }
  }
  const _qId = new T.Quaternion(), _qTmp = new T.Quaternion(), _up = new T.Vector3(0, 1, 0), _dir = new T.Vector3();
  let beamN = 0;
  function beam(x1, y1, z1, x2, y2, z2, r, color) {
    if (beamN >= inst.beam.instanceMatrix.count) return;
    _dir.set(x2 - x1, y2 - y1, z2 - z1);
    const l = _dir.length();
    if (l < 1e-3) return;
    _dir.divideScalar(l);
    _qTmp.setFromUnitVectors(_up, _dir);
    setInst(inst.beam, beamN++, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, r, l, r, _qTmp, color);
  }
  function finish(m, n) {
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  const ST_COLORS = { attente: 0xe0a43a, plein: 0x4f86b8, faim: 0xc9443a, munitions: 0xc9443a, vide: 0x9a9184, pause: 0x7d7466 };
  const GLOW = { tente: 1.5, nuque: 3, conteur: 2.4, lanternier: 2.8, fumoir: 1.6, forge: 2.2 };

  function makeBuildingObj(b) {
    const model = MODELS[b.type];
    const o = new T.Group();
    const body = new T.Mesh(model.geo, matV);
    body.castShadow = body.receiveShadow = true;
    o.add(body);
    let arm = null;
    if (model.arm) {
      arm = new T.Mesh(model.arm, matV);
      arm.castShadow = true;
      arm.position.y = model.armY;
      arm.rotation.y = G.beast.side(b.x) < 0 ? Math.PI / 2 : -Math.PI / 2;
      o.add(arm);
    }
    if (GLOW[b.type]) {
      const s = new T.Sprite(glowMat);
      s.scale.setScalar(GLOW[b.type] * 2);
      s.position.y = 0.6;
      o.add(s);
    }
    buildingsG.add(o);
    return { o, body, arm, ruined: false, level: 0 };
  }

  function angleTo(cur, target, k) {
    let d = target - cur;
    while (d > Math.PI) d -= 6.283185;
    while (d < -Math.PI) d += 6.283185;
    return cur + d * k;
  }

  function syncBuildings(run, t, ui) {
    const seen = new Set();
    let pip = 0, badge = 0, bar = 0, puff = 0;
    const camQ = camera.quaternion;
    const aim = {};
    for (const f of run.fx) {
      if (f.k === 'harpon' || f.k === 'esquille' || f.k === 'carreau') aim[Math.floor(f.x1) + ',' + Math.floor(f.y1)] = f;
    }
    for (const b of run.buildings) {
      seen.add(b.bid);
      let O = bObj.get(b.bid);
      if (!O) { O = makeBuildingObj(b); bObj.set(b.bid, O); }
      const y0 = tileY(b.x, b.y);
      O.o.position.set(b.x + 0.5, y0, b.y + 0.5);
      if (O.ruined !== b.ruined) {
        O.ruined = b.ruined;
        O.body.material = b.ruined ? matRuin : matV;
        if (O.arm) O.arm.material = O.body.material;
        O.body.rotation.z = b.ruined ? 0.16 : 0;
        O.body.position.y = b.ruined ? -0.12 : 0;
      }
      if (O.level !== b.level) { O.level = b.level; const s = 1 + 0.07 * (b.level - 1); O.o.scale.set(s, 1 + 0.13 * (b.level - 1), s); }
      // Bras orientable
      const def = G.BUILDINGS[b.type], model = MODELS[b.type];
      if (O.arm && !b.ruined) {
        let ta = null;
        if (def.harvest && b.target) { const d = G.world.byId(b.target); if (d) ta = Math.atan2(-(d.x - b.x - 0.5), -(d.y - b.y - 0.5)); }
        const f = aim[b.x + ',' + b.y];
        if (f) ta = Math.atan2(-(f.x2 - f.x1), -(f.y2 - f.y1));
        if (ta !== null) O.arm.rotation.y = angleTo(O.arm.rotation.y, ta, 0.14);
        if (def.harvest && b.target) {
          const d = G.world.byId(b.target);
          if (d) {
            const a = O.arm.rotation.y, tl = model.tip * O.o.scale.x;
            const tx = b.x + 0.5 - Math.sin(a) * tl, tz = b.y + 0.5 - Math.cos(a) * tl, ty = y0 + model.tipY * O.o.scale.y + beast.position.y;
            beam(tx, ty, tz, d.x, 0.35 + Math.sin(t * 3 + b.bid) * 0.05, d.y, 0.022, 0xe6d7b4);
          }
        }
      }
      // Niveaux
      for (let i = 1; i < b.level && pip < 500; i++) setInst(inst.pip, pip++, b.x + 0.22 + (i - 1) * 0.15, y0 + 0.14, b.y + 0.93, 1, 1, 1);
      // État
      const st = b._st;
      if (st && ST_COLORS[st] && b.type !== 'nuque' && badge < 260) {
        setInst(inst.badge, badge++, b.x + 0.5, y0 + 1.25 + O.level * 0.13 + Math.sin(t * 3 + b.bid) * 0.05, b.y + 0.5, 1, 1, 1, null, ST_COLORS[st]);
      }
      // Fumée
      if ((b.type === 'fumoir' || b.type === 'forge') && !b.ruined && b._eff > 0 && !b.paused && puff < 160 - 3) {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.28 + i / 3 + b.bid * 0.37) % 1, s = (0.07 + 0.17 * ph);
          setInst(inst.puff, puff++, b.x + 0.5 + 0.15 + Math.sin(ph * 5 + i) * 0.12, y0 + 1.1 + ph * 1.5, b.y + 0.5 - 0.12, s, s, s);
        }
      }
      // Solidité
      const mh = G.logic.maxHp(b);
      if (!b.ruined && b.hp < mh * 0.92 && bar < 498) {
        const yb = y0 + 1.55, f = clamp(b.hp / mh, 0, 1);
        setInst(inst.bar, bar++, b.x + 0.5, yb, b.y + 0.5, 0.86, 0.11, 1, camQ, 0x2e1f12);
        setInst(inst.bar, bar++, b.x + 0.5, yb, b.y + 0.5, 0.84 * f, 0.07, 1, camQ, f > 0.4 ? 0x7fae58 : 0xc9443a);
      }
    }
    for (const [bid, O] of bObj) if (!seen.has(bid)) { buildingsG.remove(O.o); bObj.delete(bid); }
    finish(inst.pip, pip); finish(inst.badge, badge); finish(inst.puff, puff);
    return bar;
  }

  function syncDeposits(run, ui) {
    const seen = new Set();
    for (const d of run.deposits) {
      seen.add(d.did);
      let m = dObj.get(d.did);
      if (!m) {
        const vs = DEP_MODELS[d.type];
        m = new T.Mesh(vs[d.did % vs.length], matV);
        m.castShadow = true; m.receiveShadow = true;
        m.rotation.y = hash(d.did) * 6.28;
        depositsG.add(m); dObj.set(d.did, m);
      }
      // Les gisements grandissent à l'horizon et rétrécissent au loin : la caméra libre verrait sinon leur apparition.
      const edge = clamp(Math.min((d.y + 8) / 2.5, (run.L + 8 - d.y) / 2.5), 0.01, 1);
      const f = edge * (G.DEPOSITS[d.type].big ? 1.25 : 1) * (0.5 + 0.5 * Math.sqrt(Math.max(0, d.amt) / d.max));
      m.position.set(d.x, -0.08, d.y);
      m.scale.setScalar(f);
      if (ui.hoverDep === d.did) {
        hoverRing.visible = true;
        hoverRing.position.set(d.x, 0.2, d.y);
        hoverRing.scale.setScalar(1.5 * f);
      }
    }
    for (const [did, m] of dObj) if (!seen.has(did)) { depositsG.remove(m); dObj.delete(did); }
  }

  function syncUnits(run, t, barStart) {
    let n = 0, pk = 0;
    const count = run.transit.length, step = count > 500 ? Math.ceil(count / 500) : 1;
    for (let i = 0; i < count; i += step) {
      const c = run.transit[i];
      const k = clamp((run.time - c.t0) / Math.max(0.01, c.t1 - c.t0), 0, 1);
      const x = c.fx + (c.tx - c.fx) * k, z = c.fy + (c.ty - c.fy) * k;
      const y = unitY(x, z) + Math.abs(Math.sin(k * 40)) * 0.04;
      _qTmp.setFromAxisAngle(_up, Math.atan2(-(c.tx - c.fx), -(c.ty - c.fy)));
      setInst(inst.fig, n, x, y, z, 1, 1, 1, _qTmp);
      setInst(inst.pack, pk, x, y + 0.44, z, 1, 1, 1, null, G.RESOURCES[c.res].color);
      n++; pk++;
    }
    finish(inst.fig, n); finish(inst.pack, pk);

    let tk = 0, bar = barStart;
    const camQ = camera.quaternion;
    for (const e of run.enemies) {
      if (tk >= 300) break;
      const def = G.ENEMIES[e.type], y = unitY(e.x, e.y), s = def.size * 2;
      _qTmp.setFromAxisAngle(_up, Math.sin(t * 7 + e.eid) * 0.25 + hash(e.eid) * 6.28);
      setInst(inst.tick, tk++, e.x, y + Math.abs(Math.sin(t * 11 + e.eid)) * 0.05, e.y, s, s, s, _qTmp, def.boss ? 0x7a2437 : 0x8a342c);
      if (e.hp < e.max && bar < 498) {
        const f = clamp(e.hp / e.max, 0, 1), yb = y + s * 0.9 + 0.3;
        setInst(inst.bar, bar++, e.x, yb, e.y, 0.66, 0.1, 1, camQ, 0x2e1f12);
        setInst(inst.bar, bar++, e.x, yb, e.y, 0.64 * f, 0.06, 1, camQ, 0xd9583f);
      }
    }
    finish(inst.tick, tk); finish(inst.bar, bar);

    let sl = 0;
    for (const s of run.soldiers) {
      if (s.dead > run.time || sl >= 100) continue;
      setInst(inst.sol, sl++, s.x, unitY(s.x, s.y), s.y, 1.25, 1.25, 1.25);
    }
    finish(inst.sol, sl);
  }

  function syncFx(run) {
    for (let i = run.fx.length - 1; i >= 0; i--) {
      const f = run.fx[i], k = (run.time - f.t) / f.life;
      if (k >= 1 || k < 0) { run.fx.splice(i, 1); continue; }
      if (f.k === 'harpon') {
        const d = G.world.byId(f.did), x2 = d ? d.x : f.x2, z2 = d ? d.y : f.y2, kk = Math.min(1, k * 2.5);
        const y1 = tileY(Math.floor(f.x1), Math.floor(f.y1)) + 0.85, hx = f.x1 + (x2 - f.x1) * kk, hz = f.y1 + (z2 - f.y1) * kk, hy = y1 + (0.4 - y1) * kk;
        beam(f.x1, y1, f.y1, hx, hy, hz, 0.025, 0xe6d7b4);
        beam(hx, hy, hz, hx + (x2 - f.x1) * 0.04, hy, hz + (z2 - f.y1) * 0.04, 0.06, 0x3d2c1e);
      } else if (f.k === 'esquille' || f.k === 'carreau') {
        const y1 = tileY(Math.floor(f.x1), Math.floor(f.y1)) + 0.7, y2 = unitY(f.x2, f.y2) + 0.25;
        const hx = f.x1 + (f.x2 - f.x1) * k, hz = f.y1 + (f.y2 - f.y1) * k, hy = y1 + (y2 - y1) * k + Math.sin(k * Math.PI) * 0.8;
        const dx = (f.x2 - f.x1) * 0.08, dz = (f.y2 - f.y1) * 0.08;
        beam(hx - dx, hy, hz - dz, hx, hy, hz, f.k === 'carreau' ? 0.07 : 0.05, f.k === 'carreau' ? 0xc46e37 : 0xf2ead2);
      }
    }
  }

  function tileOutline(x, y, color, r) {
    const a = tileY(x, y) + 0.09;
    const p = [[x + 0.04, y + 0.04], [x + 0.96, y + 0.04], [x + 0.96, y + 0.96], [x + 0.04, y + 0.96]];
    for (let i = 0; i < 4; i++) { const q = p[(i + 1) % 4]; beam(p[i][0], a, p[i][1], q[0], a, q[1], r, color); }
  }

  function rangeOf(type, x, y, level) {
    const d = G.BUILDINGS[type];
    if (d.harvest || d.harpoon) return G.economy.reachOf({ type, level });
    if (d.tower) return d.tower.range + (G.beast.isSpine(x, y) ? 1 : 0) + 0.3 * (level - 1);
    if (d.squad) return G.SOLDIER.aggro;
    return 0;
  }
  function showRange(type, x, y, level) {
    const r = rangeOf(type, x, y, level);
    if (!r) return;
    rangeRing.visible = rangeDisc.visible = true;
    // Récolte : portée au sol, où sont les gisements. Défense : au niveau du dos, où grimpent les parasites.
    const d = G.BUILDINGS[type], yr = d.tower || d.squad ? tileY(x, y) + 0.3 : 0.25;
    rangeRing.position.set(x + 0.5, yr, y + 0.5); rangeRing.scale.setScalar(r);
    rangeDisc.position.copy(rangeRing.position); rangeDisc.scale.setScalar(r);
  }

  function syncOverlay(run, ui) {
    rangeRing.visible = rangeDisc.visible = false;
    const type = ui.placing;
    const key = (type || '') + '|' + run.L + '|' + (G.gridVer || 0);
    if (key !== overlayKey) {
      overlayKey = key;
      if (overlayMesh.geometry) overlayMesh.geometry.dispose();
      if (type) {
        const k = new Kit();
        for (let y = 0; y < run.L; y++) {
          const h = G.beast.hw(y);
          for (let x = run.cx - h; x <= run.cx + h; x++) {
            if (G.logic.placeError(type, x, y)) continue;
            const c = G.beast.isVein(x, y) && G.BUILDINGS[type].recipe ? 0xf2c14e : 0x96d278;
            const v = (px, pz) => [px, surface(px, pz) + 0.17, pz];
            k.quad(v(x + 0.07, y + 0.07), v(x + 0.07, y + 0.93), v(x + 0.93, y + 0.93), v(x + 0.93, y + 0.07), c);
          }
        }
        overlayMesh.geometry = k.build();
      } else overlayMesh.geometry = new T.BufferGeometry();
    }
    const h = ui.hover;
    if (h && G.beast.inBack(h.x, h.y)) {
      tileOutline(h.x, h.y, 0xfff8e6, 0.03);
      if (type) showRange(type, h.x, h.y, 1);
    }
    if (ui.sel && run.buildings.includes(ui.sel)) {
      const b = ui.sel;
      tileOutline(b.x, b.y, 0xf2c14e, 0.05);
      if (!b.ruined) {
        showRange(b.type, b.x, b.y, b.level);
        const y1 = tileY(b.x, b.y) + 0.45;
        for (const r of G.logic.relations(b)) beam(b.x + 0.5, y1, b.y + 0.5, r.x + 0.5, tileY(r.x, r.y) + 0.45, r.y + 0.5, 0.035, r.supplier ? 0x5a96d2 : 0xe18c3c);
      }
    }
  }

  function syncWarn(run, t) {
    const w = run.wave;
    if (!w.side || w.active) { finish(inst.arrow, 0); return; }
    const cx = run.cx + 0.5, bob = Math.sin(t * 6) * 0.25;
    const pts = [];
    if (w.side === 'rear') for (const dx of [-3, 0, 3]) pts.push([cx + dx, run.L + 5.2 - bob, 0, -1]);
    else { const s = w.side === 'left' ? -1 : 1; for (const yy of [0.25, 0.5, 0.75]) pts.push([cx + s * (G.BEAST.maxHW + 5.5 + bob), run.L * yy, -s, 0]); }
    pts.forEach((p, i) => {
      _dir.set(p[2], 0, p[3]);
      _qTmp.setFromUnitVectors(_up, _dir);
      setInst(inst.arrow, i, p[0], 1.4, p[1], 1, 1, 1, _qTmp);
    });
    finish(inst.arrow, pts.length);
  }

  // ---- Jour et nuit ----
  function dayDark(run) {
    const ph = (run.time % 360) / 360;
    const n = (1 - Math.cos(ph * Math.PI * 2)) / 2;
    return clamp((n - 0.68) / 0.32, 0, 1);
  }
  const SUN_DAY = new T.Color(0xfff0d0), SUN_DUSK = new T.Color(0xff9a5c), SUN_NIGHT = new T.Color(0xa8b8ec);
  const SKY_DAY = new T.Color(0xfff1d8), SKY_NIGHT = new T.Color(0xb0b8e6), GND_DAY = new T.Color(0x8a7350), GND_NIGHT = new T.Color(0x66668e);
  function syncLight(run) {
    const dk = dayDark(run), ph = (run.time % 360) / 360;
    const dusk = clamp(Math.max(1 - Math.abs(ph - 0.33) / 0.09, 1 - Math.abs(ph - 0.67) / 0.09), 0, 1);
    const a = -0.7 + ph * 1.4;
    const tx = run.cx + 0.5, tz = run.L / 2;
    sun.target.position.set(tx, 0, tz);
    sun.position.set(tx + Math.sin(a) * 58 + 24, 74, tz + Math.cos(a) * 24 + 26);
    sun.color.copy(SUN_DAY).lerp(SUN_DUSK, dusk * (1 - dk)).lerp(SUN_NIGHT, dk);
    sun.intensity = 0.6 - 0.2 * dk;
    hemi.color.copy(SKY_DAY).lerp(SKY_NIGHT, dk);
    hemi.groundColor.copy(GND_DAY).lerp(GND_NIGHT, dk);
    hemi.intensity = 0.54 - 0.08 * dk;
    glowMat.opacity = 0.32 * dk;
  }

  // ---- Image ----
  function draw(now) {
    const run = G.run;
    if (!renderer || !run) return;
    const t = now / 1000, dt = Math.min(0.1, t - (lastT || t)); lastT = t;
    if (Math.abs(azT - az) > 1e-4 || Math.abs(elT - el) > 1e-4) {
      const s = 1 - Math.exp(-dt * 11);
      az += (azT - az) * s; el += (elT - el) * s;
      setAngles();
    }
    const speedK = G.ui ? G.ui.speedMult() : 1;
    const sp = G.beast.speed(), amp = Math.min(1, sp / 0.12) * (speedK > 0 ? 1 : 0);
    walkPhase += dt * sp * 22 * speedK;

    if (runSeed !== run.seed) {
      runSeed = run.seed;
      for (const [, O] of bObj) buildingsG.remove(O.o); bObj.clear();
      for (const [, m] of dObj) depositsG.remove(m); dObj.clear();
      builtKey = '';
    }
    const key = run.seed + '|' + run.L;
    if (key !== builtKey) { builtKey = key; rebuildBeast(run); overlayKey = ''; }
    if (groundRegion !== run.region) { groundRegion = run.region; rebuildGround(run); }

    groundG.position.z = run.travel % P;
    beast.position.y = Math.abs(Math.sin(walkPhase)) * 0.09 * amp;
    legs.forEach((l, i) => {
      const ph = walkPhase + (l.side > 0 ? Math.PI : 0) + (i >= 2 ? Math.PI : 0);
      l.hip.rotation.x = Math.sin(ph) * 0.34 * amp;
      l.knee.rotation.x = -Math.max(0, Math.cos(ph)) * 0.5 * amp;
    });
    const sway = Math.sin(walkPhase * 0.5) * Math.max(0.15, amp);
    headG.rotation.y = sway * 0.13;
    headG.rotation.x = Math.sin(walkPhase) * 0.03 * amp + Math.sin(t * 0.6) * 0.015;
    const tic = headG.getObjectByName('tic');
    if (tic) tic.position.y = 1.68 + Math.max(0, Math.sin(t * 1.4)) * Math.max(0, Math.sin(t * 9)) * 0.14;
    tailSegs.forEach((s, i) => { s.rotation.y = Math.sin(walkPhase * 0.5 + i * 0.7) * (0.06 + i * 0.022) * Math.max(0.3, amp); });
    const pulse = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
    heartMesh.scale.setScalar(1 + pulse * 0.35);
    heartMesh.rotation.y = t * 0.4;
    matVein.color.setRGB(0.62 + pulse * 0.3, 0.26 + pulse * 0.08, 0.2);
    cloudsG.children.forEach((c, i) => {
      const span = 110;
      c.position.set(run.cx - 20 + i * 22 + Math.sin(t * 0.03 + i) * 8, 38, ((run.travel * 0.7 + t * 0.35 + i * 37) % span) - 40);
    });

    beamN = 0;
    hoverRing.visible = false;
    let sx = 0, sy = 0;
    if (performance.now() < shakeUntil) { sx = (Math.random() - 0.5) * 12; sy = (Math.random() - 0.5) * 12; }
    updateCamera(sx, sy);
    const ui = G.ui ? G.ui.state : {};
    const bar = syncBuildings(run, t, ui);
    syncDeposits(run, ui);
    syncFx(run);
    syncOverlay(run, ui);
    syncUnits(run, t, bar);
    syncWarn(run, t);
    finish(inst.beam, beamN);
    syncLight(run);
    renderer.render(scene, camera);
  }

  function shake() { shakeUntil = performance.now() + 800; }
  function pan(dx, dy) {
    const k = 1 / (PX * cam.z), g = 1 / Math.sin(el);
    cam.x = clamp(cam.x - R.x * dx * k + Fg.x * dy * k * g, -40, 52);
    cam.y = clamp(cam.y - R.z * dx * k + Fg.z * dy * k * g, -48, (G.run ? G.run.L : 12) + 48);
    updateCamera(0, 0);
  }
  // ---- Rotation de la caméra ----
  function remember() {
    if (!G.meta) return;
    G.meta.settings.camAz = ((azT % 6.283185) + 6.283185) % 6.283185;
    G.meta.settings.camEl = elT;
  }
  // Glisser : les angles suivent la souris sans inertie.
  function orbit(dx, dy) {
    azT -= dx * 0.0075;
    elT = clamp(elT + dy * 0.005, EL_MIN, EL_MAX);
    az = azT; el = elT;
    setAngles(); updateCamera(0, 0); remember();
  }
  // Boutons et clavier : par crans, en glissant jusqu'à la cible.
  function rotate(a) { azT += a; remember(); }
  function tilt(a) { elT = clamp(elT + a, EL_MIN, EL_MAX); remember(); }
  function resetView() {
    const a = ((az - AZ0 + Math.PI) % 6.283185 + 6.283185) % 6.283185 - Math.PI + AZ0, e = el;
    az = azT = AZ0; el = elT = EL0; setAngles();
    fit();
    az = a; el = e; setAngles(); remember(); // on recadre sur la vue finale, puis on y glisse par le plus court
  }
  function angles() { return { az, el, azT, elT }; }
  function zoomAt(px, py, f) {
    const a = screenToWorld(px, py);
    cam.z = clamp(cam.z * f, 0.3, 3.2);
    updateCamera(0, 0);
    const b = screenToWorld(px, py);
    cam.x += a.x - b.x; cam.y += a.y - b.y;
    updateCamera(0, 0);
  }

  function info() { return renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } : null; }
  // Position à l'écran du centre d'une case (outil de test).
  function tileToScreen(x, y) {
    const v = new T.Vector3(x + 0.5, tileY(x, y), y + 0.5).project(camera);
    return { x: (v.x + 1) / 2 * Wp, y: (1 - v.y) / 2 * Hp };
  }

  return { init, resize, fit, draw, screenToTile, screenToWorld, shake, pan, zoomAt, cam, dayDark, info, tileToScreen, orbit, rotate, tilt, resetView, angles };
})();
