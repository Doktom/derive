// Rendu de la carte (Canvas 2D) : sol qui défile, gisements, Colosse, bâtiments, porteurs, combats, jour/nuit.
// On dessine en unités « case » grâce à setTransform : 1 unité = 1 case.
G.render = (function () {
  let cv, ctx, Wp = 0, Hp = 0, dpr = 1;
  const cam = { x: 5.5, y: 6, z: 1, follow: true };
  let groundPat = null, groundRegion = -1, grain = null, backCache = null, backKey = '';
  let walkPhase = 0, lastT = 0, shakeUntil = 0;
  const BASE_T = 34;
  const CAT_COLORS = { recolte: '#6f8d55', atelier: '#b06a3b', vie: '#c3954d', defense: '#874538', base: '#6a4f86' };

  function T() { return BASE_T * cam.z; }

  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    grain = makeGrain();
  }
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.parentElement.getBoundingClientRect();
    Wp = r.width; Hp = r.height;
    cv.width = Math.round(Wp * dpr); cv.height = Math.round(Hp * dpr);
    cv.style.width = Wp + 'px'; cv.style.height = Hp + 'px';
  }
  function fit() {
    const run = G.run;
    if (!run || !Wp) return;
    const needW = run.W + 15, needH = run.L + 9;
    cam.z = G.util.clamp(Math.min(Wp / (needW * BASE_T), Hp / (needH * BASE_T)), 0.35, 2.2);
    cam.x = run.cx + 0.5; cam.y = run.L / 2 - 0.5;
  }

  // ---- Utilitaires ----
  function hash(n) { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(G.util.clamp(k < 0 ? v * (1 + k) : v + (255 - v) * k, 0, 255));
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function screenToWorld(px, py) { return { x: (px - Wp / 2) / T() + cam.x, y: (py - Hp / 2) / T() + cam.y }; }
  function screenToTile(px, py) { const w = screenToWorld(px, py); return { x: Math.floor(w.x), y: Math.floor(w.y), wx: w.x, wy: w.y }; }

  // ---- Textures ----
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.random() * 55;
      img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.9; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // Sol d'une région : 16×16 cases à 32 px/case, motif répétable.
  function makeGround(reg) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = reg.ground[0]; g.fillRect(0, 0, S, S);
    const rnd = G.util.rng(1234 + reg.id.length * 77);
    const blob = (col, n, rmin, rmax, a) => {
      for (let i = 0; i < n; i++) {
        const x = rnd() * S, y = rnd() * S, r = rmin + rnd() * (rmax - rmin);
        for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill();
        }
      }
    };
    blob(reg.ground[1], 26, 40, 120, 0.55);
    blob(reg.ground[2], 20, 30, 90, 0.5);
    g.fillStyle = rgba(reg.speck, 0.5);
    for (let i = 0; i < 900; i++) { g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 1.5); }
    g.strokeStyle = rgba(reg.speck, 0.55); g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 140; i++) {
      const x = rnd() * S, y = rnd() * S;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + k * 2, y); g.lineTo(x + k * 2 + (rnd() - 0.5) * 4, y - 3 - rnd() * 4); g.stroke(); }
    }
    for (let i = 0; i < 60; i++) {
      const x = rnd() * S, y = rnd() * S, r = 1.5 + rnd() * 3;
      g.fillStyle = rgba('#7d7266', 0.35); g.beginPath(); g.ellipse(x, y, r * 1.3, r, rnd() * 3, 0, 7); g.fill();
    }
    return c;
  }

  // ---- Sol ----
  function drawGround(run, t) {
    const reg = G.REGIONS[run.region];
    if (groundRegion !== run.region) { groundPat = ctx.createPattern(makeGround(reg), 'repeat'); groundRegion = run.region; }
    const k = T() / 32;
    const off = (run.travel * 32) % 512;
    // Motif en espace écran, recalé sur la caméra.
    const m = new DOMMatrix().translateSelf(Wp / 2 - cam.x * T(), Hp / 2 - cam.y * T() + off * k).scaleSelf(k, k);
    groundPat.setTransform(m);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = groundPat; ctx.fillRect(0, 0, Wp, Hp);
    // Ombres de nuages
    for (let i = 0; i < 4; i++) {
      const span = 40;
      const wy = ((run.travel * 0.6 + t * 0.15 + i * 13) % span) - 10;
      const wx = run.cx + (hash(i) - 0.5) * 30 + Math.sin(t * 0.02 + i) * 3;
      const p = worldToScreen(wx, wy), r = (5 + hash(i + 9) * 5) * T();
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, 'rgba(60,45,30,0.10)'); gr.addColorStop(1, 'rgba(60,45,30,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.4, r, 0.3, 0, 7); ctx.fill();
    }
  }
  function worldToScreen(x, y) { return { x: (x - cam.x) * T() + Wp / 2, y: (y - cam.y) * T() + Hp / 2 }; }
  function worldTransform(sx, sy) {
    ctx.setTransform(dpr * T(), 0, 0, dpr * T(), dpr * (Wp / 2 - cam.x * T() + sx), dpr * (Hp / 2 - cam.y * T() + sy));
  }

  // ---- Gisements ----
  function drawDeposit(d, t, hover) {
    const def = G.DEPOSITS[d.type], col = G.RESOURCES[d.res].color;
    const f = 0.45 + 0.55 * Math.sqrt(Math.max(0, d.amt) / d.max);
    const s = (def.big ? 1.5 : 0.95) * f;
    const seed = d.did * 7.31;
    ctx.save(); ctx.translate(d.x, d.y);
    // ombre
    ctx.fillStyle = 'rgba(60,40,20,0.16)';
    ctx.beginPath(); ctx.ellipse(0.12, 0.15, s * 1.05, s * 0.75, 0, 0, 7); ctx.fill();
    switch (d.type) {
      case 'prairie': {
        ctx.fillStyle = rgba(col, 0.55); ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.75, hash(seed) * 3, 0, 7); ctx.fill();
        ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = 0.05; ctx.lineCap = 'round';
        const n = Math.round(10 * f + 4);
        for (let i = 0; i < n; i++) {
          const a = hash(seed + i) * 6.28, r = Math.sqrt(hash(seed + i * 3)) * s * 0.8;
          const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75, sw = Math.sin(t * 1.5 + i) * 0.04;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 0.06 + sw, y - 0.22); ctx.moveTo(x, y); ctx.lineTo(x + 0.07 + sw, y - 0.18); ctx.stroke();
        }
        break;
      }
      case 'broussailles': case 'resineux': {
        const n = Math.round(4 * f + 2);
        for (let i = 0; i < n; i++) {
          const a = hash(seed + i) * 6.28, r = hash(seed + i * 5) * s * 0.7;
          const x = Math.cos(a) * r, y = Math.sin(a) * r, rr = 0.22 + hash(seed + i * 2) * 0.18;
          ctx.fillStyle = d.type === 'resineux' ? (i % 2 ? '#4f6a43' : '#5d7a4d') : (i % 2 ? '#8a7a45' : '#77703f');
          if (d.type === 'resineux') {
            ctx.beginPath();
            for (let k = 0; k < 7; k++) { const aa = k / 7 * 6.28; const rad = k % 2 ? rr * 0.5 : rr; ctx.lineTo(x + Math.cos(aa) * rad * 1.3, y + Math.sin(aa) * rad * 1.3); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e2a227'; ctx.beginPath(); ctx.arc(x + 0.05, y + 0.04, 0.05, 0, 7); ctx.fill();
          } else { ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); }
        }
        break;
      }
      case 'arbre': {
        ctx.fillStyle = '#7b6a55'; ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, 7); ctx.fill();
        ctx.strokeStyle = '#5e4f3e'; ctx.lineWidth = 0.05;
        for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(0.04 * k, -0.03 * k, s * 0.8 * k / 5, 0, 7); ctx.stroke(); }
        ctx.strokeStyle = '#9a8a72'; ctx.lineWidth = 0.12;
        for (let k = 0; k < 4; k++) { const a = hash(seed + k) * 6.28; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75); ctx.lineTo(Math.cos(a) * s * 1.25, Math.sin(a) * s * 1.2); ctx.stroke(); }
        break;
      }
      case 'rocher': case 'affleurement': {
        const n = Math.round(2 * f + 1);
        for (let i = 0; i < n; i++) {
          const x = (hash(seed + i) - 0.5) * s, y = (hash(seed + i * 3) - 0.5) * s * 0.7, r = s * (0.45 + hash(seed + i * 7) * 0.3);
          ctx.fillStyle = i % 2 ? '#9a9286' : '#867e72';
          ctx.beginPath();
          for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + hash(seed + i + k); const rr = r * (0.75 + hash(seed + k * 11 + i) * 0.35); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.25, r * 0.35, r * 0.2, -0.5, 0, 7); ctx.fill();
          if (d.type === 'affleurement') {
            ctx.fillStyle = '#3e9f8c';
            for (let k = 0; k < 3; k++) { const a = hash(seed + k * 13 + i) * 6.28; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); ctx.lineTo(x + Math.cos(a + 0.3) * r * 0.8, y + Math.sin(a + 0.3) * r * 0.6); ctx.lineTo(x + Math.cos(a - 0.3) * r * 0.7, y + Math.sin(a - 0.3) * r * 0.5); ctx.fill(); }
          }
        }
        break;
      }
      case 'ossuaire': {
        ctx.strokeStyle = '#efe5cc'; ctx.lineCap = 'round';
        const n = Math.round(6 * f + 3);
        for (let i = 0; i < n; i++) {
          const x = (hash(seed + i) - 0.5) * s * 1.6, y = (hash(seed + i * 3) - 0.5) * s * 1.1, a = hash(seed + i * 5) * 3.14, l = 0.18 + hash(i + seed) * 0.15;
          ctx.lineWidth = 0.07; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
          ctx.fillStyle = '#efe5cc'; ctx.beginPath(); ctx.arc(x - Math.cos(a) * l, y - Math.sin(a) * l, 0.06, 0, 7); ctx.arc(x + Math.cos(a) * l, y + Math.sin(a) * l, 0.06, 0, 7); ctx.fill();
        }
        break;
      }
      case 'carcasse': {
        ctx.strokeStyle = '#efe5cc'; ctx.lineCap = 'round'; ctx.lineWidth = 0.13;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
        const ribs = Math.round(5 * f + 2);
        for (let i = 0; i < ribs; i++) {
          const y = -s * 0.8 + i * (1.6 * s / ribs);
          ctx.lineWidth = 0.09;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(-s * 0.8, y - 0.1, -s * 0.7, y + 0.35); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(s * 0.8, y - 0.1, s * 0.7, y + 0.35); ctx.stroke();
        }
        ctx.fillStyle = '#efe5cc'; ctx.beginPath(); ctx.ellipse(0, -s - 0.25, 0.3, 0.38, 0, 0, 7); ctx.fill();
        break;
      }
      case 'troupeau': {
        const n = Math.max(1, Math.round(5 * f));
        for (let i = 0; i < n; i++) {
          const x = (hash(seed + i) - 0.5) * s * 1.6 + Math.sin(t * 0.6 + i) * 0.08, y = (hash(seed + i * 3) - 0.5) * s * 1.1;
          const dir = hash(seed + i * 9) < 0.5 ? -1 : 1;
          ctx.fillStyle = 'rgba(50,30,20,0.18)'; ctx.beginPath(); ctx.ellipse(x + 0.04, y + 0.06, 0.24, 0.13, 0, 0, 7); ctx.fill();
          ctx.fillStyle = i % 2 ? '#8a5a3b' : '#a06b45';
          ctx.beginPath(); ctx.ellipse(x, y, 0.24, 0.13, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(x + dir * 0.25, y - 0.04, 0.08, 0, 7); ctx.fill();
          ctx.strokeStyle = '#e6d9bb'; ctx.lineWidth = 0.03; ctx.beginPath(); ctx.moveTo(x + dir * 0.28, y - 0.1); ctx.lineTo(x + dir * 0.36, y - 0.17); ctx.stroke();
        }
        break;
      }
      case 'ruine': {
        ctx.fillStyle = '#a4977f';
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.5, 0.11, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#8b6db5'; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(-0.3, 0.2); ctx.lineTo(0, -0.35); ctx.lineTo(0.3, 0.2); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
    }
    if (hover) { ctx.strokeStyle = 'rgba(255,248,230,0.9)'; ctx.lineWidth = 0.05; ctx.setLineDash([0.15, 0.1]); ctx.beginPath(); ctx.arc(0, 0, s * 1.2, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }

  // ---- Colosse ----
  function bodyPath(run, pad) {
    const cx = run.cx, pts = [];
    const L = run.L;
    pts.push([cx + 0.5, -0.6 - pad * 0.3]);
    for (let y = 0; y < L; y++) { const h = G.beast.hw(y); pts.push([cx + h + 1 + pad, y + 0.5]); }
    pts.push([cx + 0.5, L + 0.5 + pad * 0.4]);
    for (let y = L - 1; y >= 0; y--) { const h = G.beast.hw(y); pts.push([cx - h - pad, y + 0.5]); }
    const p = new Path2D();
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], mm = mid(a, b); p.quadraticCurveTo(a[0], a[1], mm[0], mm[1]); }
    p.closePath();
    return p;
  }

  function drawLegs(run, t) {
    const cx = run.cx + 0.5, sp = G.beast.speed();
    const amp = Math.min(1, sp / 0.12);
    const pairs = [Math.round(run.L * 0.2), Math.round(run.L * 0.68)];
    ctx.lineCap = 'round';
    pairs.forEach((py, pi) => {
      [-1, 1].forEach(s => {
        const ph = walkPhase + (s > 0 ? Math.PI : 0) + (pi ? Math.PI : 0);
        const h = G.beast.hw(py);
        const hx = cx + s * (h + 0.4), hy = py + 0.5;
        const fx = cx + s * (h + 2.6), fy = py + 0.5 + Math.sin(ph) * 1.1 * amp;
        const kx = cx + s * (h + 1.9), ky = (hy + fy) / 2 - 0.6 - Math.max(0, Math.cos(ph)) * 0.4 * amp;
        ctx.strokeStyle = '#5b4a36'; ctx.lineWidth = 1.05;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(kx, ky, fx, fy); ctx.stroke();
        ctx.strokeStyle = '#6e5b43'; ctx.lineWidth = 0.75;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(kx, ky, fx, fy); ctx.stroke();
        ctx.fillStyle = '#4a3b2b'; ctx.beginPath(); ctx.ellipse(fx + s * 0.1, fy, 0.65, 0.5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e6d9bb';
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(fx + s * 0.55, fy + k * 0.28, 0.09, 0, 7); ctx.fill(); }
      });
    });
  }

  function drawHeadTail(run, t) {
    const cx = run.cx + 0.5, sway = Math.sin(walkPhase * 0.5) * 0.25 * Math.min(1, G.beast.speed() / 0.12);
    // Queue
    const L = run.L;
    ctx.fillStyle = '#5f4d38';
    ctx.beginPath();
    ctx.moveTo(cx - 1.4, L - 0.3);
    ctx.quadraticCurveTo(cx - 0.6 + sway * 2, L + 2.2, cx + sway * 4, L + 4.4);
    ctx.quadraticCurveTo(cx + 0.6 + sway * 2, L + 2.2, cx + 1.4, L - 0.3);
    ctx.closePath(); ctx.fill();
    // Tête
    const hx = cx + sway, hy = -1.9;
    ctx.fillStyle = '#5f4d38';
    ctx.beginPath(); ctx.ellipse(hx, hy, 2.0, 1.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6f5c44';
    ctx.beginPath(); ctx.ellipse(hx, hy + 0.2, 1.7, 1.5, 0, 0, 7); ctx.fill();
    // cornes
    ctx.strokeStyle = '#e6d9bb'; ctx.lineWidth = 0.28; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + s * 1.2, hy - 0.6); ctx.quadraticCurveTo(hx + s * 2.4, hy - 1.2, hx + s * 2.1, hy - 2.4); ctx.stroke(); }
    // yeux
    const blink = (Math.sin(t * 0.7) > 0.985) ? 0.02 : 0.16;
    ctx.fillStyle = '#20160e';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * 0.85, hy - 0.4, 0.2, blink, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,240,200,0.8)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * 0.85 - 0.06, hy - 0.46, 0.05, 0, 7); ctx.fill(); }
    // naseaux
    ctx.fillStyle = '#3a2d20';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * 0.35, hy - 1.35, 0.12, 0.08, 0, 0, 7); ctx.fill(); }
  }

  function drawBack(run, t) {
    const key = run.L + '|' + run.region;
    const body = bodyPath(run, 0.45);
    // Corps
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,10,0.35)'; ctx.shadowBlur = 0.8 * T() * dpr; ctx.shadowOffsetY = 0.25 * T() * dpr;
    ctx.fillStyle = '#5f4d38'; ctx.fill(body);
    ctx.restore();
    const g = ctx.createRadialGradient(run.cx + 0.5, run.L * 0.45, 0.5, run.cx + 0.5, run.L * 0.45, Math.max(run.L, 11) * 0.6);
    g.addColorStop(0, '#9c8a64'); g.addColorStop(0.7, '#86734f'); g.addColorStop(1, '#6b5a3f');
    ctx.fillStyle = g; ctx.fill(bodyPath(run, 0.2));
    // Écailles (plaques)
    for (let y = 0; y < run.L; y++) {
      const h = G.beast.hw(y);
      for (let x = run.cx - h; x <= run.cx + h; x++) {
        const n = hash(x * 31 + y * 17);
        const flank = Math.abs(x - run.cx) === h, spine = x === run.cx;
        ctx.fillStyle = spine ? 'rgba(235,220,180,0.22)' : flank ? 'rgba(60,45,25,0.18)' : 'rgba(255,245,215,' + (0.06 + n * 0.08) + ')';
        roundRect(x + 0.07, y + 0.07, 0.86, 0.86, 0.22); ctx.fill();
        ctx.strokeStyle = 'rgba(60,45,25,0.16)'; ctx.lineWidth = 0.03; ctx.stroke();
        if (G.beast.isScar(x, y)) {
          ctx.fillStyle = 'rgba(45,30,20,0.55)'; roundRect(x + 0.1, y + 0.1, 0.8, 0.8, 0.2); ctx.fill();
          ctx.strokeStyle = 'rgba(200,170,140,0.55)'; ctx.lineWidth = 0.05;
          ctx.beginPath(); ctx.moveTo(x + 0.25, y + 0.25); ctx.lineTo(x + 0.75, y + 0.75); ctx.moveTo(x + 0.7, y + 0.28); ctx.lineTo(x + 0.3, y + 0.72); ctx.stroke();
        }
        if (n > 0.86 && !spine) { ctx.fillStyle = 'rgba(110,140,70,0.35)'; ctx.beginPath(); ctx.arc(x + 0.3 + n * 0.3, y + 0.6, 0.12, 0, 7); ctx.fill(); }
      }
    }
    // Arête de l'échine
    ctx.fillStyle = 'rgba(240,228,195,0.35)';
    for (let y = 0; y < run.L; y++) { ctx.beginPath(); ctx.moveTo(run.cx + 0.5, y + 0.2); ctx.lineTo(run.cx + 0.62, y + 0.5); ctx.lineTo(run.cx + 0.5, y + 0.8); ctx.lineTo(run.cx + 0.38, y + 0.5); ctx.fill(); }
    // Veines
    const pulse = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
    const veins = run.veins.map(k => k.split(',').map(Number)).filter(([x, y]) => G.beast.inBack(x, y));
    const vs = {}; for (const [x, y] of veins) vs[x + ',' + y] = 1;
    vs[run.heart.x + ',' + run.heart.y] = 1;
    // Liaisons : orthogonales, et diagonales seulement sans détour orthogonal.
    const vp = new Path2D();
    for (const [x, y] of veins.concat([[run.heart.x, run.heart.y]])) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (!vs[(x + dx) + ',' + (y + dy)]) continue;
        if (dx && dy && (vs[(x + dx) + ',' + y] || vs[x + ',' + (y + dy)])) continue;
        const wob = (hash(x * 13 + y * 7 + dx) - 0.5) * 0.35;
        vp.moveTo(x + 0.5, y + 0.5);
        vp.quadraticCurveTo(x + 0.5 + dx / 2 + (dy ? wob : 0), y + 0.5 + dy / 2 + (dx ? wob : 0), x + dx + 0.5, y + dy + 0.5);
      }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(90,30,25,0.25)'; ctx.lineWidth = 0.17; ctx.stroke(vp);
    ctx.strokeStyle = 'rgba(205,82,64,' + (0.45 + 0.35 * pulse) + ')'; ctx.lineWidth = 0.08; ctx.stroke(vp);
    ctx.fillStyle = 'rgba(205,82,64,' + (0.10 + 0.15 * pulse) + ')';
    for (const [x, y] of veins) { ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, 0.32, 0, 7); ctx.fill(); }
    // Cœur
    const hr = 0.32 + pulse * 0.1;
    ctx.fillStyle = 'rgba(190,55,45,0.85)';
    ctx.beginPath(); ctx.arc(run.heart.x + 0.5, run.heart.y + 0.5, hr, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,180,' + (0.3 + pulse * 0.5) + ')'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.arc(run.heart.x + 0.5, run.heart.y + 0.5, hr + 0.12 + pulse * 0.2, 0, 7); ctx.stroke();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---- Bâtiments ----
  const ST_COLORS = { attente: '#e0a43a', plein: '#4f86b8', faim: '#c9443a', munitions: '#c9443a', vide: '#9a9184', pause: '#7d7466' };
  function drawBuilding(b, run, t, sel) {
    const d = G.BUILDINGS[b.type], x = b.x, y = b.y;
    const col = b.ruined ? '#8f877a' : CAT_COLORS[d.cat];
    ctx.fillStyle = 'rgba(40,25,10,0.25)';
    ctx.beginPath(); ctx.ellipse(x + 0.56, y + 0.62, 0.42, 0.33, 0, 0, 7); ctx.fill();
    if (b.type === 'tente' || b.type === 'nuque') {
      ctx.fillStyle = b.ruined ? col : (b.type === 'nuque' ? '#8a6aa8' : '#c9a06a');
      ctx.beginPath(); ctx.moveTo(x + 0.08, y + 0.86); ctx.lineTo(x + 0.5, y + 0.1); ctx.lineTo(x + 0.92, y + 0.86); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.moveTo(x + 0.5, y + 0.1); ctx.lineTo(x + 0.92, y + 0.86); ctx.lineTo(x + 0.5, y + 0.86); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3d2c1e'; ctx.beginPath(); ctx.moveTo(x + 0.4, y + 0.86); ctx.lineTo(x + 0.5, y + 0.6); ctx.lineTo(x + 0.6, y + 0.86); ctx.fill();
      if (b.type === 'nuque') {
        ctx.strokeStyle = '#3d2c1e'; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(x + 0.5, y + 0.1); ctx.lineTo(x + 0.5, y - 0.25); ctx.stroke();
        ctx.fillStyle = '#c0623b'; ctx.beginPath(); ctx.moveTo(x + 0.5, y - 0.25); ctx.lineTo(x + 0.5 + 0.3 + Math.sin(t * 3) * 0.04, y - 0.17); ctx.lineTo(x + 0.5, y - 0.08); ctx.fill();
      }
    } else {
      ctx.fillStyle = col; roundRect(x + 0.1, y + 0.1, 0.8, 0.8, 0.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(x + 0.14, y + 0.13, 0.72, 0.3, 0.14); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,10,0.45)'; ctx.lineWidth = 0.035; roundRect(x + 0.1, y + 0.1, 0.8, 0.8, 0.2); ctx.stroke();
      G.drawIcon(ctx, b.type, x + 0.5, y + 0.5, 0.56, b.ruined ? '#d8d0c2' : '#fbf3e1', 2.3);
    }
    if (b.ruined) {
      ctx.strokeStyle = '#4a3f33'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(x + 0.25, y + 0.2); ctx.lineTo(x + 0.45, y + 0.5); ctx.lineTo(x + 0.35, y + 0.8); ctx.moveTo(x + 0.7, y + 0.25); ctx.lineTo(x + 0.55, y + 0.55); ctx.stroke();
    }
    // Niveaux
    if (b.level > 1) {
      ctx.fillStyle = '#f2d27a';
      for (let i = 0; i < b.level - 1; i++) { ctx.beginPath(); ctx.arc(x + 0.22 + i * 0.14, y + 0.92, 0.055, 0, 7); ctx.fill(); }
    }
    // État
    const st = b._st;
    if (st && ST_COLORS[st] && b.type !== 'nuque') {
      ctx.fillStyle = ST_COLORS[st]; ctx.strokeStyle = '#fbf3e1'; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.arc(x + 0.86, y + 0.14, 0.1, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (G.BUILDINGS[b.type].unique && b.type === 'nuque') {
      const n = b.inp.fourrage || 0;
      ctx.fillStyle = 'rgba(40,25,10,0.5)'; ctx.fillRect(x + 0.1, y + 0.98, 0.8, 0.08);
      ctx.fillStyle = '#93ab4f'; ctx.fillRect(x + 0.1, y + 0.98, 0.8 * Math.min(1, n / 40), 0.08);
    }
    const mh = G.logic.maxHp(b);
    if (!b.ruined && b.hp < mh - 0.5) {
      ctx.fillStyle = 'rgba(40,25,10,0.6)'; ctx.fillRect(x + 0.1, y - 0.06, 0.8, 0.08);
      ctx.fillStyle = b.hp / mh > 0.4 ? '#7fae58' : '#c9443a'; ctx.fillRect(x + 0.1, y - 0.06, 0.8 * b.hp / mh, 0.08);
    }
    if (sel) {
      ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 0.07; ctx.setLineDash([0.16, 0.1]);
      roundRect(x + 0.02, y + 0.02, 0.96, 0.96, 0.24); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  function drawCraneLines(run, t) {
    for (const b of run.buildings) {
      const d = G.BUILDINGS[b.type];
      if (!d.harvest || b.ruined || !b.target) continue;
      const dep = G.world.byId(b.target);
      if (!dep) continue;
      const x1 = b.x + 0.5, y1 = b.y + 0.5;
      const bob = Math.sin(t * 3 + b.bid) * 0.08;
      const ex = x1 + (dep.x - x1) * 0.92, ey = y1 + (dep.y - y1) * 0.92 + bob;
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 0.09; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,215,180,0.9)'; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = '#3d2c1e'; ctx.beginPath(); ctx.arc(ex, ey, 0.08, 0, 7); ctx.fill();
    }
  }

  function drawTransit(run) {
    const n = run.transit.length;
    if (!n) return;
    const step = n > 400 ? Math.ceil(n / 400) : 1;
    for (let i = 0; i < n; i += step) {
      const c = run.transit[i];
      const k = G.util.clamp((run.time - c.t0) / Math.max(0.01, c.t1 - c.t0), 0, 1);
      const x = c.fx + (c.tx - c.fx) * k, y = c.fy + (c.ty - c.fy) * k - Math.sin(k * Math.PI) * 0.15;
      ctx.fillStyle = 'rgba(40,25,10,0.5)'; ctx.beginPath(); ctx.arc(x, y + 0.04, 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = G.RESOURCES[c.res].color; ctx.beginPath(); ctx.arc(x, y, 0.09, 0, 7); ctx.fill();
    }
  }

  function drawUnits(run, t) {
    for (const e of run.enemies) {
      const def = G.ENEMIES[e.type], s = def.size;
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.strokeStyle = '#2a1712'; ctx.lineWidth = 0.04;
      for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {
        const w = Math.sin(t * 12 + k + e.eid) * 0.05;
        ctx.beginPath(); ctx.moveTo(sd * s * 0.5, (k - 1) * s * 0.4); ctx.lineTo(sd * s * 1.1, (k - 1) * s * 0.55 + w); ctx.stroke();
      }
      ctx.fillStyle = def.boss ? '#5a1f2a' : '#6e2b25';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.65, s * 0.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,180,0.25)'; ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.25, s * 0.25, s * 0.3, 0, 0, 7); ctx.fill();
      ctx.restore();
      if (e.hp < e.max) {
        ctx.fillStyle = 'rgba(30,15,10,0.6)'; ctx.fillRect(e.x - 0.3, e.y - s - 0.18, 0.6, 0.07);
        ctx.fillStyle = '#d9583f'; ctx.fillRect(e.x - 0.3, e.y - s - 0.18, 0.6 * Math.max(0, e.hp / e.max), 0.07);
      }
    }
    for (const s of run.soldiers) {
      if (s.dead > run.time) continue;
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.beginPath(); ctx.ellipse(s.x + 0.03, s.y + 0.08, 0.14, 0.08, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.arc(s.x, s.y, 0.12, 0, 7); ctx.fill();
      ctx.fillStyle = '#3f8f86'; ctx.beginPath(); ctx.arc(s.x, s.y - 0.02, 0.07, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5b4a36'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(s.x + 0.1, s.y + 0.1); ctx.lineTo(s.x + 0.2, s.y - 0.25); ctx.stroke();
    }
  }

  function drawFx(run) {
    for (let i = run.fx.length - 1; i >= 0; i--) {
      const f = run.fx[i], k = (run.time - f.t) / f.life;
      if (k >= 1 || k < 0) { run.fx.splice(i, 1); continue; }
      if (f.k === 'harpon') {
        const dep = G.world.byId(f.did); const x2 = dep ? dep.x : f.x2, y2 = dep ? dep.y : f.y2;
        const kk = Math.min(1, k * 2.5);
        const hx = f.x1 + (x2 - f.x1) * kk, hy = f.y1 + (y2 - f.y1) * kk;
        ctx.strokeStyle = 'rgba(230,215,180,' + (1 - k) + ')'; ctx.lineWidth = 0.04;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#3d2c1e'; ctx.beginPath(); ctx.arc(hx, hy, 0.09, 0, 7); ctx.fill();
      } else if (f.k === 'esquille' || f.k === 'carreau') {
        const hx = f.x1 + (f.x2 - f.x1) * k, hy = f.y1 + (f.y2 - f.y1) * k;
        ctx.strokeStyle = f.k === 'carreau' ? '#c46e37' : '#f2ead2'; ctx.lineWidth = f.k === 'carreau' ? 0.08 : 0.05;
        const bx = hx - (f.x2 - f.x1) * 0.12, by = hy - (f.y2 - f.y1) * 0.12;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(hx, hy); ctx.stroke();
      } else if (f.k === 'mort') {
        ctx.fillStyle = 'rgba(110,43,37,' + (0.6 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(f.x1, f.y1, 0.2 + k * 0.4, 0, 7); ctx.fill();
      }
    }
  }

  function drawPlacement(run, ui) {
    const type = ui.placing;
    if (type) {
      for (let y = 0; y < run.L; y++) {
        const h = G.beast.hw(y);
        for (let x = run.cx - h; x <= run.cx + h; x++) {
          if (G.logic.placeError(type, x, y)) continue;
          ctx.fillStyle = G.beast.isVein(x, y) && !G.BUILDINGS[type].military && G.BUILDINGS[type].recipe ? 'rgba(242,193,78,0.38)' : 'rgba(150,210,120,0.32)';
          roundRect(x + 0.08, y + 0.08, 0.84, 0.84, 0.2); ctx.fill();
        }
      }
    }
    const h = ui.hover;
    if (h && G.beast.inBack(h.x, h.y)) {
      ctx.strokeStyle = 'rgba(255,248,230,0.85)'; ctx.lineWidth = 0.05;
      roundRect(h.x + 0.04, h.y + 0.04, 0.92, 0.92, 0.22); ctx.stroke();
      const t = type || (ui.sel && ui.sel.x === h.x && ui.sel.y === h.y ? ui.sel.type : null);
      if (type) rangeCircle(type, h.x, h.y, 1);
    }
    if (ui.sel && !ui.sel.ruined) {
      rangeCircle(ui.sel.type, ui.sel.x, ui.sel.y, ui.sel.level);
      // Chaîne de production : fournisseurs en bleu, clients en orange.
      ctx.lineWidth = 0.05; ctx.lineCap = 'round'; ctx.setLineDash([0.18, 0.12]);
      for (const r of G.logic.relations(ui.sel)) {
        ctx.strokeStyle = r.supplier ? 'rgba(90,150,210,0.85)' : 'rgba(225,140,60,0.85)';
        ctx.beginPath(); ctx.moveTo(ui.sel.x + 0.5, ui.sel.y + 0.5); ctx.lineTo(r.x + 0.5, r.y + 0.5); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }
  function rangeCircle(type, x, y, level) {
    const d = G.BUILDINGS[type];
    let r = 0;
    if (d.harvest || d.harpoon) r = G.economy.reachOf({ type, level });
    else if (d.tower) r = d.tower.range + (G.beast.isSpine(x, y) ? 1 : 0) + 0.3 * (level - 1);
    else if (d.squad) r = G.SOLDIER.aggro;
    if (!r) return;
    ctx.strokeStyle = 'rgba(255,248,230,0.7)'; ctx.fillStyle = 'rgba(255,248,230,0.07)'; ctx.lineWidth = 0.04;
    ctx.setLineDash([0.2, 0.12]);
    ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }

  function drawWaveWarn(run, t) {
    const w = run.wave;
    if (!w.side || w.active) return;
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.fillStyle = 'rgba(201,68,58,' + (0.5 + a * 0.4) + ')';
    const cx = run.cx + 0.5;
    const arrows = [];
    if (w.side === 'rear') for (const dx of [-2, 0, 2]) arrows.push([cx + dx, run.L + 2.5, 0, -1]);
    else { const s = w.side === 'left' ? -1 : 1; for (const yy of [0.25, 0.5, 0.75]) arrows.push([cx + s * (G.BEAST.maxHW + 3.2), run.L * yy, -s, 0]); }
    for (const [x, y, dx, dy] of arrows) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath(); ctx.moveTo(0.6, 0); ctx.lineTo(-0.3, -0.45); ctx.lineTo(-0.1, 0); ctx.lineTo(-0.3, 0.45); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // Jour et nuit : cycle de 6 minutes de jeu.
  function dayDark(run) {
    const ph = (run.time % 360) / 360;
    const n = (1 - Math.cos(ph * Math.PI * 2)) / 2;
    return G.util.clamp((n - 0.55) / 0.45, 0, 1);
  }
  function drawNight(run, t) {
    const dk = dayDark(run);
    const ph = (run.time % 360) / 360;
    const dusk = Math.max(0, 1 - Math.abs(ph - 0.33) / 0.08) + Math.max(0, 1 - Math.abs(ph - 0.67) / 0.08);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (dusk > 0) { ctx.fillStyle = 'rgba(214,120,110,' + (0.12 * Math.min(1, dusk)) + ')'; ctx.fillRect(0, 0, Wp, Hp); }
    if (dk <= 0.01) return;
    ctx.fillStyle = 'rgba(22,26,62,' + (0.42 * dk) + ')'; ctx.fillRect(0, 0, Wp, Hp);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of run.buildings) {
      if (b.ruined) continue;
      const lit = { tente: 1.2, nuque: 2, conteur: 1.8, lanternier: 2.2, fumoir: 1.3, forge: 1.6 }[b.type];
      if (!lit) continue;
      const p = worldToScreen(b.x + 0.5, b.y + 0.5), r = lit * T() * (0.9 + Math.sin(t * 5 + b.bid) * 0.05);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255,190,90,' + (0.35 * dk) + ')'); g.addColorStop(1, 'rgba(255,170,70,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawPaper() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
    const p = ctx.createPattern(grain, 'repeat');
    ctx.fillStyle = p; ctx.fillRect(0, 0, Wp, Hp);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(Wp / 2, Hp / 2, Math.min(Wp, Hp) * 0.35, Wp / 2, Hp / 2, Math.max(Wp, Hp) * 0.75);
    g.addColorStop(0, 'rgba(80,50,20,0)'); g.addColorStop(1, 'rgba(80,50,20,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, Wp, Hp);
  }

  function draw(now) {
    const run = G.run;
    if (!ctx || !run) return;
    const t = now / 1000;
    const dt = Math.min(0.1, t - (lastT || t)); lastT = t;
    walkPhase += dt * G.beast.speed() * 22 * (G.ui ? G.ui.speedMult() : 1) * (G.userPaused ? 0 : 1);
    let sx = 0, sy = 0;
    if (performance.now() < shakeUntil) { sx = (Math.random() - 0.5) * 10; sy = (Math.random() - 0.5) * 10; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wp, Hp);
    drawGround(run, t);
    worldTransform(sx * 0.3, sy * 0.3);
    const ui = G.ui ? G.ui.state : {};
    for (const d of run.deposits) drawDeposit(d, t, ui.hoverDep === d.did);
    worldTransform(sx, sy);
    drawLegs(run, t);
    drawHeadTail(run, t);
    drawBack(run, t);
    drawCraneLines(run, t);
    for (const b of run.buildings) drawBuilding(b, run, t, ui.sel === b);
    drawTransit(run);
    drawUnits(run, t);
    drawFx(run);
    drawPlacement(run, ui);
    drawWaveWarn(run, t);
    drawNight(run, t);
    drawPaper();
  }

  function shake() { shakeUntil = performance.now() + 800; }

  // Contrôles de caméra
  function pan(dx, dy) { cam.x -= dx / T(); cam.y -= dy / T(); }
  function zoomAt(px, py, f) {
    const before = screenToWorld(px, py);
    cam.z = G.util.clamp(cam.z * f, 0.3, 3);
    const after = screenToWorld(px, py);
    cam.x += before.x - after.x; cam.y += before.y - after.y;
  }

  return { init, resize, fit, draw, screenToTile, screenToWorld, shake, pan, zoomAt, cam, dayDark };
})();
