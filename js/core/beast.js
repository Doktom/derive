// Le Colosse : forme du dos, veines, faim, vigueur, croissance, allure.
G.beast = (function () {
  const B = () => G.BEAST;

  // Demi-largeur de la rangée y : s'évase depuis la tête, s'effile vers la queue.
  // Ajouter une vertèbre (L+1) ne retire jamais de case : les rangées de queue ne font que s'élargir.
  function hw(y, L) {
    L = L || G.run.L;
    if (y < 0 || y >= L) return -1;
    return Math.max(0, Math.min(B().maxHW, Math.floor(2 + y * 1.5), Math.floor(1 + (L - 1 - y) * 1.2)));
  }
  function inBack(x, y) {
    const h = hw(y);
    return h >= 0 && Math.abs(x - G.run.cx) <= h;
  }
  function isFlank(x, y) { return inBack(x, y) && Math.abs(x - G.run.cx) === hw(y); }
  function isSpine(x, y) { return x === G.run.cx && inBack(x, y); }
  function isHeart(x, y) { return x === G.run.heart.x && y === G.run.heart.y; }
  let veinSet = null, veinRun = null;
  function isVein(x, y) {
    if (veinRun !== G.run) { veinSet = {}; for (const k of G.run.veins) veinSet[k] = 1; veinRun = G.run; }
    return !!veinSet[x + ',' + y] && inBack(x, y);
  }
  function side(x) { return x < G.run.cx ? -1 : x > G.run.cx ? 1 : 0; }

  function vigMax() { return B().vigueur + (G.M.vigMax || 0); }
  function pace() { return B().paces[G.run.pace] || B().paces.marche; }
  function hungerFactor() {
    const s = G.run.satiete;
    return s <= 0 ? 0 : s < 25 ? 0.5 : 1;
  }
  function speed() { return pace().speed * Math.max(0.2, 1 + G.M.speed) * hungerFactor(); }
  function drain() {
    let d = pace().drain * Math.max(0.2, 1 + G.M.drain);
    if (G.run.pace === 'galop') d *= Math.max(0.2, 1 + G.M.gallopDrain);
    return d;
  }
  function growthCost() { return B().growthBase * Math.pow(B().growthMult, G.run.L - B().startLen); }

  let hungerSaid = 0;
  function tick(dt) {
    const run = G.run;
    run.satiete -= drain() * dt;
    const nuque = run.buildings.find(b => b.type === 'nuque');
    if (nuque && !nuque.ruined) {
      const want = Math.max(0, (100 - run.satiete) / B().fourragePts);
      const e = Math.min(nuque.inp.fourrage || 0, want, 1.5 * dt);
      if (e > 0) {
        nuque.inp.fourrage -= e;
        run.satiete += e * B().fourragePts;
        G.economy.count('fourrage', -e);
        if (run.satiete >= 70) run.growth += e * (1 + G.M.growth);
      }
    }
    run.satiete = G.util.clamp(run.satiete, 0, 100);
    const node = G.route.current(run);
    if (run.satiete > 40) run.vigueur += pace().regen * (G.NODES[node.type].oasis ? 4 : 1) * dt;
    if (run.satiete <= 0) run.vigueur -= 0.25 * dt;
    run.vigueur = Math.min(vigMax(), run.vigueur);
    if (!G.offlineSim && run.time - hungerSaid > 60) {
      if (run.satiete <= 0) { G.lore.say('starving'); hungerSaid = run.time; }
      else if (run.satiete < 25) { G.lore.say('hungry'); hungerSaid = run.time; }
    }
    if (run.L < B().maxLen && run.growth >= growthCost()) {
      run.growth -= growthCost();
      run.L++;
      run.stats.growths++;
      G.economy.rebuildGrid();
      if (!G.offlineSim) { G.lore.say('growth'); G.ui && G.ui.toast('Une vertèbre pousse : le dos s\'allonge d\'une rangée.', 'good'); }
    }
    if (run.vigueur <= 0 && !run.ended) G.logic.endRun('death');
  }

  // S'ébrouer : tue ou blesse les parasites, fait tomber les cargaisons, secoue les bâtiments.
  function canShake() { return G.run.time - G.run.shakeAt >= B().shakeCd; }
  function shake() {
    const run = G.run;
    if (!canShake()) return false;
    run.shakeAt = run.time;
    for (const e of run.enemies) e.hp -= 60;
    for (const c of run.transit) { const t = run.buildings.find(b => b.bid === c.to); if (t) t.inc[c.res] = Math.max(0, (t.inc[c.res] || 0) - c.amt); }
    run.transit = [];
    for (const b of run.buildings) if (!b.ruined && b.type !== 'nuque') b.hp = Math.max(1, b.hp - G.logic.maxHp(b) * 0.06);
    run.satiete = Math.max(0, run.satiete - 8);
    G.render && G.render.shake();
    G.lore.say('shake');
    return true;
  }

  return { hw, inBack, isFlank, isSpine, isHeart, isVein, side, vigMax, pace, speed, drain, growthCost, tick, canShake, shake };
})();
