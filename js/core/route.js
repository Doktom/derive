// Carte de route : une région = une suite d'étapes ; à chaque carrefour, le joueur choisit la suite.
G.route = (function () {
  function weighted(pool, r, exclude) {
    let tot = 0;
    for (const k in pool) if (!exclude[k]) tot += pool[k];
    let x = r() * tot;
    for (const k in pool) { if (exclude[k]) continue; x -= pool[k]; if (x <= 0) return k; }
    return Object.keys(pool)[0];
  }

  function generate(run, r) {
    r = r || Math.random;
    const layers = [[{ type: 'depart', links: [] }]];
    for (let k = 1; k <= G.ROUTE_LAYERS; k++) {
      const n = r() < 0.45 ? 3 : 2, used = {}, layer = [];
      for (let i = 0; i < n; i++) {
        const t = weighted(G.NODE_POOL, r, used);
        used[t] = 1;
        layer.push({ type: t, links: [] });
      }
      layers.push(layer);
    }
    layers.push([{ type: 'passe', links: [] }]);
    // Au moins un sanctuaire par région.
    if (!layers.some(l => l.some(n => n.type === 'sanctuaire'))) {
      const l = layers[2];
      l[Math.floor(r() * l.length)].type = 'sanctuaire';
    }
    // Liens : chaque nœud rejoint le ou les nœuds les plus proches de la couche suivante.
    for (let k = 0; k < layers.length - 1; k++) {
      const a = layers[k], b = layers[k + 1];
      const pos = (i, n) => (i + 0.5) / n;
      a.forEach((node, i) => {
        const p = pos(i, a.length);
        const order = b.map((_, j) => j).sort((x, y) => Math.abs(pos(x, b.length) - p) - Math.abs(pos(y, b.length) - p));
        node.links = [order[0]];
        if (order.length > 1 && (a.length === 1 || r() < 0.55)) node.links.push(order[1]);
      });
      b.forEach((_, j) => {
        if (!a.some(n => n.links.includes(j))) {
          let best = 0, bd = 9;
          a.forEach((n, i) => { const d = Math.abs(pos(i, a.length) - pos(j, b.length)); if (d < bd) { bd = d; best = i; } });
          a[best].links.push(j);
        }
      });
      a.forEach(n => n.links.sort((x, y) => x - y));
    }
    return { layers, l: 0, i: 0, next: null };
  }

  function current(run) { const R = run.route; return R.layers[R.l][R.i]; }
  function options(run) {
    const R = run.route, node = current(run);
    if (R.l >= R.layers.length - 1) return [];
    return node.links;
  }
  function choose(run, j) {
    if (options(run).includes(j)) run.route.next = j;
  }
  function atPass(run) { return current(run).type === 'passe'; }

  // Appelé par l'économie quand l'étape est parcourue.
  function advance(run) {
    const R = run.route;
    if (atPass(run)) { run.stepDist = G.STEP_LEN; return; }
    const opts = options(run);
    let j = R.next;
    if (j === null || !opts.includes(j)) j = autoPick(run, opts);
    R.l++; R.i = j; R.next = null;
    run.stepDist = 0;
    run.market = null;
    enter(run, current(run));
  }

  // Choix automatique (pilote, hors ligne) : la bête préfère ce dont elle manque.
  function autoPick(run, opts) {
    const R = run.route;
    const score = j => {
      const t = R.layers[R.l + 1][j].type;
      if (t === 'paturage' && run.satiete < 50) return 5;
      if (t === 'oasis' && run.vigueur < G.beast.vigMax() * 0.6) return 4;
      if (t === 'nid' && (G.offlineSim || G.run.rig === 0)) return 0.5;
      return ({ sanctuaire: 3, ruines: 2.5, paturage: 2, troupeaux: 2, ossuaire: 2, filon: 1.8, bosquets: 1.8, caravane: 1.2, oasis: 1, nid: 1 })[t] || 1;
    };
    return opts.slice().sort((a, b) => score(b) - score(a))[0];
  }

  function enter(run, node) {
    const def = G.NODES[node.type];
    if (def.enterRecits) { run.recits += def.enterRecits * (run.region + 1); }
    if (def.pact) G.logic.queuePact();
    if (def.market) run.market = G.logic.makeMarket();
    if (def.nest) {
      if (G.RIGUEUR[run.rig].waves && !G.offlineSim) { run.nestReward = true; G.defense.startWave(true); }
      else G.logic.queueOffering();
    }
    const key = { nid: 'nid', oasis: 'oasis', ruines: 'ruines', caravane: 'caravane', sanctuaire: 'sanctuaire', passe: 'passe' }[node.type] || 'node';
    if (G.lore) G.lore.say(key);
  }

  return { generate, current, options, choose, advance, atPass, enter };
})();
