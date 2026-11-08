// Tick économique : habitants, main-d'œuvre, récolte (grues, harpons), ateliers, débits.
G.economy = (function () {
  const L = () => G.LEVELS;

  function lm(b) { return 1 + L().prod * (b.level - 1); }
  function veinMult(b) { return G.beast.isVein(b.x, b.y) ? 1.4 : 1; }

  // ---- Grille ----
  function rebuildGrid() {
    const g = {};
    for (const b of G.run.buildings) g[b.x + ',' + b.y] = b;
    G.run._grid = g;
    G.gridVer = (G.gridVer || 0) + 1;
  }
  function at(x, y) {
    if (!G.run._grid) rebuildGrid();
    return G.run._grid[x + ',' + y] || null;
  }

  // ---- Débits (affichage) ----
  const acc = {}; let accT = 0;
  G.flow = {};
  function count(res, amt) {
    const a = acc[res] || (acc[res] = { p: 0, c: 0 });
    if (amt > 0) { a.p += amt; G.run.stats.prodTotal += amt; } else a.c -= amt;
  }
  function flushFlow(dt) {
    accT += dt;
    if (accT < 1) return;
    for (const r of G.RES_ORDER) {
      const a = acc[r] || { p: 0, c: 0 };
      const f = G.flow[r] || (G.flow[r] = { p: 0, c: 0 });
      f.p = f.p * 0.85 + (a.p / accT) * 0.15;
      f.c = f.c * 0.85 + (a.c / accT) * 0.15;
      a.p = 0; a.c = 0;
    }
    accT = 0;
  }

  // ---- Capacités ----
  function outCap(b, r) {
    const d = G.BUILDINGS[b.type];
    if (d.harvest) return 30 * lm(b);
    if (d.harpoon) return 45 * lm(b);
    if (d.recipe && d.recipe.out[r]) return Math.max(G.LOGI.minOut, G.LOGI.outSec * d.recipe.out[r] * lm(b));
    return G.LOGI.minOut;
  }
  function storeCap(b) {
    const d = G.BUILDINGS[b.type];
    if (b.type === 'nuque') return Infinity;
    return (d.storage || 0) * (1 + L().storage * (b.level - 1));
  }
  // Ce qu'un bâtiment veut recevoir : { ressource: capacité d'entrée }.
  function wants(b) {
    const d = G.BUILDINGS[b.type], w = {};
    const k = lm(b);
    if (d.recipe) for (const r in d.recipe.in) w[r] = Math.max(G.LOGI.minIn, G.LOGI.inSec * d.recipe.in[r] * k);
    if (d.consume) for (const r in d.consume) w[r] = d.inCap || Math.max(G.LOGI.minIn, G.LOGI.inSec * d.consume[r] * k * 1.5);
    if (d.harpoon) for (const r in d.harpoon.ammo) w[r] = 6 * k;
    if (d.tower) for (const r in d.tower.ammo) w[r] = Math.max(4, 25 * d.tower.ammo[r] / d.tower.cd);
    return w;
  }

  // ---- Main-d'œuvre ----
  function jobs(b) { const d = G.BUILDINGS[b.type]; return d.jobs ? d.jobs * (1 + L().jobs * (b.level - 1)) : 0; }
  function housing(b) {
    const d = G.BUILDINGS[b.type];
    if (!d.housing) return 0;
    let h = d.housing * (1 + L().housing * (b.level - 1));
    if (b.type === 'tente') h += G.M.tentPop || 0;
    return h;
  }

  function inRangeDeposits(b, reach, filter) {
    const cx = b.x + 0.5, cy = b.y + 0.5, out = [];
    const s = G.beast.side(b.x);
    for (const d of G.run.deposits) {
      if (d.amt <= 0.01) continue;
      if (s !== 0 && d.side !== s) continue;
      if (filter && !filter(d)) continue;
      const dist = Math.hypot(d.x - cx, d.y - cy);
      if (dist <= reach) out.push(d);
    }
    return out;
  }
  function reachOf(b) {
    const d = G.BUILDINGS[b.type];
    const base = d.harvest ? d.harvest.reach : d.harpoon ? d.harpoon.reach : 0;
    return base + (G.M.reach || 0) + 0.25 * (b.level - 1);
  }
  // Mode automatique des grues : ce qui manque le plus, pondéré par la taille du gisement.
  function scarce(d) {
    const stock = (G.run.res && G.run.res[d.res]) || 0;
    return (G.RESOURCES[d.res].abstract ? 3 : 1) * Math.min(d.amt, 40) / (1 + stock / 60);
  }
  function outSpace(b, r) { return Math.max(0, outCap(b, r) - (b.out[r] || 0)); }

  function gain(b, r, amt) {
    if (amt <= 0) return;
    if (G.RESOURCES[r].abstract) { G.run.recits += amt; count(r, amt); return; }
    b.out[r] = (b.out[r] || 0) + amt;
    count(r, amt);
  }

  // ---- Tick ----
  function tick(dt) {
    const run = G.run, M = G.M;
    run.time += dt;
    // Habitants et emplois
    let pop = 0, jb = 0;
    for (const b of run.buildings) {
      if (b.ruined) continue;
      const d = G.BUILDINGS[b.type];
      if (d.housing) pop += housing(b) * (b.type === 'tente' ? (b._fed === undefined ? 1 : b._fed) : 1);
      if (!b.paused) jb += jobs(b);
    }
    run._pop = pop; run._jobs = jb;
    const wf = jb > 0 ? Math.min(1, pop / jb) : 1;
    run._wf = wf;

    for (const b of run.buildings) {
      const d = G.BUILDINGS[b.type];
      if (b.ruined) { b._eff = 0; b._st = 'ruine'; continue; }
      const eff = b.paused ? 0 : (d.jobs ? wf : 1);
      b._eff = eff; b._st = b.paused ? 'pause' : '';
      const k = lm(b) * veinMult(b);

      if (d.consume && b.type !== 'nuque') {
        for (const r in d.consume) {
          const need = d.consume[r] * lm(b) * (r === 'vivres' ? 1 + (M.vivresUse || 0) : 1) * dt;
          const have = b.inp[r] || 0;
          if (have >= need) { b.inp[r] = have - need; count(r, -need); b._fed = Math.min(1, (b._fed === undefined ? 1 : b._fed) + dt / 4); }
          else { b._fed = Math.max(0, (b._fed === undefined ? 1 : b._fed) - dt / 12); b._st = 'faim'; }
        }
      }

      if (d.recipe && eff > 0) {
        let f = eff;
        for (const r in d.recipe.in) {
          const need = d.recipe.in[r] * lm(b) * dt;
          f = Math.min(f, (b.inp[r] || 0) / need);
        }
        if (f < 0.999 && !b._st) b._st = 'attente';
        for (const r in d.recipe.out) if (!G.RESOURCES[r].abstract && (b.out[r] || 0) >= outCap(b, r)) { f = 0; b._st = 'plein'; }
        if (f > 0) {
          for (const r in d.recipe.in) { const c = d.recipe.in[r] * lm(b) * dt * f; b.inp[r] -= c; count(r, -c); }
          for (const r in d.recipe.out) {
            let m = k * Math.max(0.1, 1 + (M.craft || 0));
            if (r === 'vivres') m *= 1 + (M.vivres || 0);
            if (r === 'recits') m *= 1 + (M.recits || 0);
            gain(b, r, d.recipe.out[r] * dt * f * m);
          }
        }
      }

      if (d.harvest && eff > 0) {
        let t = b.target ? G.world.byId(b.target) : null;
        const reach = reachOf(b);
        if (t && (t.amt <= 0.01 || Math.hypot(t.x - b.x - 0.5, t.y - b.y - 0.5) > reach)) t = null;
        if (t && b.filter && t.res !== b.filter) t = null;
        if (!t) {
          const c = inRangeDeposits(b, reach, x => !G.DEPOSITS[x.type].harpoonOnly && (!b.filter || x.res === b.filter) && (G.RESOURCES[x.res].abstract || outSpace(b, x.res) > 0.5));
          t = c.sort((a, z) => scarce(z) - scarce(a))[0] || null;
          b.target = t ? t.did : null;
        }
        if (t) {
          const rate = d.harvest.rate * k * Math.max(0.1, 1 + (M.harvest || 0)) * eff;
          const space = G.RESOURCES[t.res].abstract ? Infinity : outSpace(b, t.res);
          const take = Math.min(rate * dt, t.amt, space);
          if (space <= 0.01) { b._st = 'plein'; b.target = null; }
          t.amt -= take; gain(b, t.res, take);
        } else if (!b._st) b._st = 'vide';
      }

      if (d.harpoon && eff > 0) {
        b.cd -= dt * eff;
        if (b.cd <= 0) {
          const ammo = d.harpoon.ammo;
          let ok = true;
          for (const r in ammo) if ((b.inp[r] || 0) < ammo[r]) ok = false;
          if (!ok) { b._st = 'munitions'; b.cd = 0; }
          else {
            const c = inRangeDeposits(b, reachOf(b), x => G.RESOURCES[x.res].abstract || outSpace(b, x.res) > 2);
            const pref = x => (G.DEPOSITS[x.type].harpoonOnly ? 1000 : 0) + (G.DEPOSITS[x.type].big ? 500 : 0) + (x.res === 'recits' ? 300 : 0) + x.amt;
            const t = c.sort((a, z) => pref(z) - pref(a))[0];
            if (t) {
              const space = G.RESOURCES[t.res].abstract ? Infinity : outSpace(b, t.res);
              const take = Math.min(d.harpoon.take * k * Math.max(0.1, 1 + (M.harvest || 0)), t.amt, space);
              t.amt -= take; gain(b, t.res, take);
              for (const r in ammo) { b.inp[r] -= ammo[r]; count(r, -ammo[r]); }
              b.cd = d.harpoon.cd;
              if (!G.offlineSim) run.fx.push({ k: 'harpon', x1: b.x + 0.5, y1: b.y + 0.5, did: t.did, x2: t.x, y2: t.y, t: run.time, life: 0.6 });
            } else { b.cd = 0.5; if (!b._st) b._st = 'vide'; }
          }
        }
      }
    }
    G.logistics.update(dt);
    G.beast.tick(dt);
    G.world.tick(dt, G.beast.speed() * dt);
    flushFlow(dt);
  }

  return { rebuildGrid, at, count, tick, outCap, storeCap, wants, jobs, housing, lm, veinMult, reachOf, inRangeDeposits };
})();
