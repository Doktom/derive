// Démarrage, boucle de jeu, hors ligne, sauvegarde automatique.
(function () {
  const ECO = 0.2, FIGHT = 0.05, OFFLINE_MAX = 2 * 3600;
  let acc = 0, last = performance.now(), saveAcc = 0;

  function offline(seconds) {
    if (seconds < 30 || !G.run || G.run.ended) return;
    const s = Math.min(OFFLINE_MAX, seconds);
    const before = Object.assign({}, G.run.res), L0 = G.run.L, l0 = G.run.route.l;
    const pace = G.run.pace;
    if (pace === 'halte') G.run.pace = 'marche';
    G.offlineSim = true;
    try {
      for (let t = 0; t < s && !G.run.ended; t += 2) { G.defense.update(2); G.economy.tick(2); }
    } finally { G.offlineSim = false; G.run.pace = pace; }
    const gained = G.RES_ORDER.filter(r => (G.run.res[r] || 0) - (before[r] || 0) > 1)
      .map(r => '+' + G.util.fmt(G.run.res[r] - before[r]) + ' ' + G.RESOURCES[r].name.toLowerCase()).slice(0, 6).join(', ');
    G.ui.openModal(`<h2>Pendant votre absence</h2><p>La bête a marché ${G.util.fmtTime(s)}${seconds > OFFLINE_MAX ? ' (limite de 2 h)' : ''}, en pilote automatique sur la route la plus sûre. Les parasites ne l'ont pas suivie.</p>
      <ul class="plist"><li>Étapes franchies : ${G.run.route.l - l0}</li><li>Vertèbres gagnées : ${G.run.L - L0}</li><li>${gained || 'Stocks stables'}</li></ul>
      <button class="btn primary wide" data-action="closeModal">Reprendre la marche</button>`, { kind: 'offline' });
  }

  function boot() {
    const saved = G.state.load();
    G.meta = (saved && saved.meta) || G.state.newMeta();
    G.meta.settings = Object.assign({ lore: true, rateUnit: 'min' }, G.meta.settings || {});
    G.render.init(document.getElementById('map'));
    G.ui.bind();
    if (saved && saved.run && !saved.run.ended) {
      G.run = saved.run;
      G.mods.compute();
      G.economy.rebuildGrid();
      G.logistics.totals();
      G.render.fit();
      offline((Date.now() - (saved.savedAt || Date.now())) / 1000);
    } else {
      // Une bête de démonstration marche derrière l'écran de départ.
      G.logic.newGame(0);
      G.run.demo = true;
      G.run.pending = [];
      G.render.fit();
      G.ui.startModal();
    }
    G.ui.refresh(true);
    requestAnimationFrame(loop);
    window.addEventListener('beforeunload', () => G.state.save());
  }

  function loop(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    const run = G.run;
    if (run && !run.ended) {
      const running = !G.paused && !G.userPaused;
      if (running) {
        acc += dt * G.ui.state.speed;
        let n = 0;
        while (acc >= ECO && n < 60) {
          for (let k = 0; k < ECO / FIGHT; k++) G.defense.update(FIGHT);
          G.economy.tick(ECO);
          G.bot.tick(ECO);
          acc -= ECO; n++;
          if (G.run.ended) break;
        }
        if (n >= 60) acc = 0;
      }
      saveAcc += dt;
      if (saveAcc > 10) { saveAcc = 0; if (!run.demo) G.state.save(); }
    }
    G.lore.update();
    G.ui.refresh();
    G.render.draw(now);
    requestAnimationFrame(loop);
  }

  window.addEventListener('load', boot);
})();
