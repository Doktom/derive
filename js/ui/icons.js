// Jeu d'icônes SVG (grille 24×24), partagé entre l'interface (DOM) et la carte (Canvas).
// Chaque icône : tableau de tracés ; un tracé préfixé « F » est rempli, sinon il est tracé au trait.
(function () {
  const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const I = {
    // Ressources
    fourrage: ['M5 21c0-5 1-9 3-13M12 21c0-6 0-11 2-16M19 21c0-4-1-8-3-11M8.5 21c-.5-3-2-5-4-6M15.5 21c.5-3 2-5 4-6'],
    bois: ['M5 7h11M5 17h11M5 7a3 5 0 0 0 0 10', C(16, 12, 3) .replace(/a3 3/g, 'a3 5'), 'M16 11v2'],
    pierre: ['FM3 19l2.5-7 5-5 6 1.5 4.5 5.5-1 5z'],
    os: ['M8.5 8.5l7 7', C(6, 6, 2.2), C(18, 18, 2.2), C(8.5, 4.5, 1.6), C(4.5, 8.5, 1.6), C(19.5, 15.5, 1.6), C(15.5, 19.5, 1.6)],
    viande: ['M15 3a6 6 0 1 1-4.5 10L7 16.5', C(5.5, 18, 2)],
    vivres: ['M7 9h10l1.5 10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2zM9 9l-1-4h8l-1 4M12 13v4'],
    cordes: [C(12, 12, 8), C(12, 12, 4), 'M20 12h3'],
    peau: ['M6 4c2 1 4 1 6 0 2 1 4 1 6 0l-1 4 2 3-2 3 1 6c-2-1-4-1-6 0-2-1-4-1-6 0l1-6-2-3 2-3z'],
    outils: ['M4 20l9-9M13 11l6-7 1.5 1-3 9z'],
    resine: ['FM12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z'],
    cuivre: ['M3 17l4-7h10l4 7zM7 10l2-3h6l2 3'],
    lanternes: ['M9 6h6M10 3h4M8 6l-1 13h10L16 6', 'FM12 10c1.5 2 1.5 4 0 5-1.5-1-1.5-3 0-5z'],
    pointes: ['M12 2l4 9-4 11-4-11zM12 2v20'],
    recits: ['M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2zM9 8h6M9 12h6M9 16h4'],
    // Bâtiments
    nuque: ['M3 20L12 6l9 14zM12 6V2l4 1.5-4 1.5M9 20l3-6 3 6'],
    grue: ['M6 21V4M6 5l13 3M19 8v6M17 14h4l-2 3zM3 21h6M6 10l4-4'],
    harpon: ['M3 21L19 5M19 5l-5.5 1M19 5l-1 5.5M8 16c-2 0-3 1-3 3'],
    corderie: [C(12, 12, 8), 'M6.5 8.5l11 7M6.5 15.5l11-7'],
    fumoir: ['M5 21V11l7-5 7 5v10zM10 21v-5h4v5M15 4c-1.5 1 .5 2-.5 3M18 3c-1.5 1 .5 2-.5 3'],
    depeceur: ['M5 19L16 8l3 3L8 22zM16 8l3-5 2 1-2 7'],
    atelier: ['M4 20l9-9M11 6l4-3 6 6-3 4-3-3-2 2-3-3z'],
    lanternier: ['M9 6h6M10 3h4M8 6l-1 13h10L16 6M4 21h16', 'FM12 10c1.5 2 1.5 4 0 5-1.5-1-1.5-3 0-5z'],
    forge: ['M4 9h12c0 3 2 4 4 4v2h-7l1 3h3v2H7v-2h3l1-3H8c-2 0-4-2-4-6z'],
    tente: ['M2 20L12 5l10 15zM12 5v15M8.5 20l3.5-6 3.5 6'],
    conteur: ['M12 15c-2.5-2-1.5-5 0-7 1.5 2 2.5 5 0 7zM6 21l12-3M6 18l12 3', C(4, 10, 2), C(20, 10, 2)],
    grenier: ['M4 10l8-6 8 6v10H4zM4 14h16M9 20v-6M15 20v-6'],
    palissade: ['M5 21V7l1.5-3L8 7v14M11 21V6l1.5-3L14 6v15M17 21V7l1.5-3L20 7v14M3 12h19M3 17h19'],
    lanceur: ['M3 20h18M7 20l3-8 4 8M10 12l8-8', C(19, 4, 2)],
    epouilleurs: ['M6 3v18M4 6l2-3 2 3M12 9h8v5c0 3-2 5-4 6-2-1-4-3-4-6z'],
    baliste: ['M4 9c5-4 11-4 16 0M12 6v15M4 9l8 6 8-6M10 21h4'],
    // Nœuds de route
    n_depart: ['M6 21V3l11 4-11 4'],
    n_nid: [C(8, 14, 4), C(16, 14, 4), C(12, 8, 4)],
    n_oasis: ['M3 19c3-2 6 2 9 0s6-2 9 0M12 18V8M12 8C9 5 6 6 5 8M12 8c3-3 6-2 7 0M12 8c-1-3 1-5 3-5'],
    n_pacte: ['M12 3l2.5 6 6.5.5-5 4 1.5 6.5L12 17l-5.5 3 1.5-6.5-5-4 6.5-.5z'],
    n_caravane: ['M3 16c0-4 4-7 9-7s9 3 9 7zM6 16v4M10 16v4M14 16v4M18 16v4M12 9V4l4 1.5-4 1.5'],
    n_passe: ['M2 20l6-11 4 6 3-4 7 9z'],
    // Interface
    halte: ['M8 5v14M16 5v14'],
    marche: ['M9 6l6 6-6 6'],
    galop: ['M5 6l6 6-6 6M12 6l6 6-6 6'],
    play: ['FM8 5l11 7-11 7z'],
    shake: ['M3 8c3-3 6 3 9 0s6 3 9 0M3 16c3-3 6 3 9 0s6 3 9 0'],
    coeur: ['FM12 20s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z'],
    pop: [C(12, 7, 3), 'M6 21c0-4 3-7 6-7s6 3 6 7'],
    croissance: ['M7 8h10l2 4-2 4H7l-2-4zM12 3v5M12 16v5'],
    vague: ['M8 12a4 5 0 1 0 8 0a4 5 0 1 0-8 0M8 9L4 7M8 12H3M8 15l-4 2M16 9l4-2M16 12h5M16 15l4 2'],
    route: ['M5 20c0-6 14-6 14-12M5 20h0', C(5, 20, 2), C(19, 6, 2)],
    memoire: ['M12 3a7 7 0 0 1 7 7c0 3-2 5-3 6v4H8v-4c-1-1-3-3-3-6a7 7 0 0 1 7-7zM9 13l3-3 3 3'],
    reglages: [C(12, 12, 3), 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'],
    loupe: [C(10, 10, 6), 'M15 15l6 6'],
    fleche: ['M12 3v18M5 14l7 7 7-7'],
    // Vue et interface
    rotg: ['M4 4v6h6M4.5 10A8 8 0 1 1 4 14'],
    rotd: ['M20 4v6h-6M19.5 10A8 8 0 1 0 20 14'],
    hautv: ['M5 20c3-8 11-8 14 0M12 12V3M8 7l4-4 4 4'],
    basv: ['M5 8c3 8 11 8 14 0M12 3v9M8 8l4 4 4-4'],
    cadre: ['M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', C(12, 12, 2)],
    plus: ['M12 5v14M5 12h14'],
    moins: ['M5 12h14'],
    aide: [C(12, 12, 9), 'M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8M12 17h0'],
    aiguille: ['FM12 3l5 10h-10z', 'M12 13v8'],
    flux: ['M3 7h12l-3-3M15 7l-3 3M21 17H9l3-3M9 17l3 3'],
    songe: ['M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z', 'FM17 3l.8 2.2L20 6l-2.2.8L17 9l-.8-2.2L14 6l2.2-.8z'],
    os_v: ['M8.5 8.5l7 7', C(6, 6, 2.2), C(18, 18, 2.2)],
    chair_v: ['FM12 20s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z'],
    brume_v: ['M3 9c3-2 6 2 9 0s6-2 9 0M3 14c3-2 6 2 9 0s6-2 9 0M6 19c2-1.5 4 1.5 6 0s4-1.5 6 0']
  };
  G.ICONS = I;

  // HTML : <svg> inline, couleur via currentColor.
  G.icon = function (id, cls) {
    const parts = I[id] || I.loupe;
    const paths = parts.map(d => d[0] === 'F'
      ? `<path d="${d.slice(1)}" fill="currentColor" stroke="none"/>`
      : `<path d="${d}"/>`).join('');
    return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  };

  // Canvas : Path2D mis en cache.
  const cache = {};
  G.iconPaths = function (id) {
    if (cache[id]) return cache[id];
    const parts = I[id] || I.loupe;
    cache[id] = parts.map(d => d[0] === 'F' ? { fill: true, p: new Path2D(d.slice(1)) } : { fill: false, p: new Path2D(d) });
    return cache[id];
  };

  // Dessine une icône centrée en (x, y), de taille s (pixels).
  G.drawIcon = function (ctx, id, x, y, s, color, lw) {
    const parts = G.iconPaths(id);
    ctx.save();
    ctx.translate(x - s / 2, y - s / 2);
    ctx.scale(s / 24, s / 24);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = lw || 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const q of parts) { if (q.fill) ctx.fill(q.p); else ctx.stroke(q.p); }
    ctx.restore();
  };
})();
