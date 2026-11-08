// Le monde qui défile : gisements générés devant la bête, qui glissent le long de ses flancs.
G.world = (function () {
  const SPAWN_Y = -7, DENSITY = 1, LAT = 6;

  function pool(run) {
    const reg = G.REGIONS[run.region], node = G.NODES[G.route.current(run).type];
    const p = {};
    for (const k in reg.pool) {
      if (G.DEPOSITS[k].region > run.region) continue;
      p[k] = reg.pool[k] * ((node.mult && node.mult[k]) || 1) * (1 + (G.M.dens[k] || 0));
    }
    return p;
  }

  function pickType(p, r) {
    let tot = 0; for (const k in p) tot += p[k];
    let x = r * tot;
    for (const k in p) { x -= p[k]; if (x <= 0) return k; }
    return Object.keys(p)[0];
  }

  function spawn(run, y) {
    const type = pickType(pool(run), Math.random());
    const def = G.DEPOSITS[type];
    const side = Math.random() < 0.5 ? -1 : 1;
    // Plus de gisements près des flancs que loin.
    const d = Math.pow(Math.random(), 1.5) * LAT + (def.big ? 1 : 0);
    const amt = Math.round(def.amt[0] + Math.random() * (def.amt[1] - def.amt[0]));
    const dep = {
      did: run.nextDid++, type, res: def.res, side,
      x: run.cx + 0.5 + side * (G.BEAST.maxHW + 1 + d), y,
      amt, max: amt, ph: Math.random() * 6.28
    };
    dep.bx = dep.x;
    run.deposits.push(dep);
    return dep;
  }

  // Remplit le paysage au début d'une partie.
  function prefill(run) {
    for (let y = SPAWN_Y; y < run.L + 6; y += 1 / DENSITY) spawn(run, y + Math.random() * 0.8);
  }

  function tick(dt, dist) {
    const run = G.run;
    const node = G.NODES[G.route.current(run).type];
    if (dist > 0) {
      run.travel += dist;
      run.stepDist += dist;
      run.spawnAcc += dist * DENSITY * (node.dense || 1);
      while (run.spawnAcc >= 1) { run.spawnAcc -= 1; spawn(run, SPAWN_Y - Math.random()); }
    }
    const lim = run.L + 8;
    for (let i = run.deposits.length - 1; i >= 0; i--) {
      const d = run.deposits[i];
      d.y += dist;
      if (G.DEPOSITS[d.type].moves) { d.ph += dt * 0.4; d.x = d.bx + Math.sin(d.ph) * 0.7; }
      if (d.y > lim || d.amt <= 0.01) run.deposits.splice(i, 1);
    }
    if (run.stepDist >= G.STEP_LEN && !G.route.atPass(run)) G.route.advance(run);
  }

  function byId(did) { return G.run.deposits.find(d => d.did === did); }

  return { tick, prefill, spawn, byId };
})();
