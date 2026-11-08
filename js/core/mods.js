// Agrège tous les bonus (technologies, pactes, offrandes, mémoire, difficulté) dans G.M.
G.mods = (function () {
  const BASE = {
    harvest: 0, reach: 0, speed: 0, drain: 0, gallopDrain: 0, recits: 0, dmg: 0, porters: 0, porterSpeed: 0,
    charge: 0, growth: 0, tentPop: 0, vivresUse: 0, vivres: 0, craft: 0, vigMax: 0, maxLevel: 0
  };

  function add(M, mods, n) {
    if (!mods) return;
    n = n === undefined ? 1 : n;
    for (const k in mods) {
      if (k.startsWith('dens_')) { const d = k.slice(5); M.dens[d] = (M.dens[d] || 0) + mods[k] * n; }
      else M[k] = (M[k] || 0) + mods[k] * n;
    }
  }

  function compute() {
    const M = Object.assign({}, BASE, { dens: {} });
    const run = G.run, meta = G.meta;
    if (meta) for (const id in meta.heritage) if (G.HERITAGE[id]) add(M, G.HERITAGE[id].mods, meta.heritage[id]);
    if (run) {
      for (const t of run.techs) if (G.TECHS[t]) add(M, G.TECHS[t].mods);
      for (const p of run.pacts) if (G.PACTS[p]) add(M, G.PACTS[p].mods);
      for (const o of run.offerings) if (G.OFFERINGS[o]) add(M, G.OFFERINGS[o].mods);
    }
    G.M = M;
    return M;
  }

  return { compute };
})();
