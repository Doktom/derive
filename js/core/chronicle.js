// Chronique de la marche : rencontres à choix et effets temporaires.
G.chronicle = (function () {
  function scale() { return 1 + 0.6 * G.run.region; }

  function cost(c) {
    if (!c.cost) return null;
    const out = {};
    for (const r in c.cost) out[r] = Math.ceil(c.cost[r] * scale());
    return out;
  }
  function canChoose(c) { const k = cost(c); return !k || G.logistics.canPay(k); }

  function applyFx(fx) {
    const run = G.run, s = scale();
    if (fx.res) { const g = {}; for (const r in fx.res) g[r] = Math.round(fx.res[r] * s); G.logistics.grant(g); }
    if (fx.recits) run.recits += fx.recits * s;
    if (fx.satiete) run.satiete = G.util.clamp(run.satiete + fx.satiete, 0, 100);
    if (fx.vigueur) run.vigueur = Math.min(G.beast.vigMax(), run.vigueur + fx.vigueur);
    if (fx.growth) run.growth += fx.growth * s;
    if (fx.timed) run.timed.push({ name: fx.timed.name, until: run.time + fx.timed.dur, mods: fx.timed.mods });
    if (fx.pact) G.logic.queuePact();
    if (fx.offering) G.logic.queueOffering();
    if (fx.gamble) {
      const win = Math.random() < fx.gamble.p;
      applyFx(win ? fx.gamble.win : fx.gamble.lose);
      if (!G.botSim) G.ui && G.ui.toast(win ? fx.gamble.winMsg : fx.gamble.loseMsg, win ? 'good' : 'bad');
    }
  }

  function choose(ev, i) {
    const c = ev.choices[i];
    if (!c || !canChoose(c)) return false;
    const k = cost(c);
    if (k) G.logistics.pay(k, G.run.cx, 0);
    applyFx(c.fx);
    G.mods.compute();
    if (G.run.vigueur <= 0 && !G.run.ended) G.logic.endRun('death');
    return true;
  }

  function pickEvent() {
    const run = G.run, waves = G.RIGUEUR[run.rig].waves;
    const seen = run.seenEvents || (run.seenEvents = []);
    let pool = G.EVENTS.filter(e => (!e.waves || waves) && !seen.includes(e.id));
    if (!pool.length) { seen.length = 0; pool = G.EVENTS.filter(e => !e.waves || waves); }
    const e = pool[Math.floor(Math.random() * pool.length)];
    seen.push(e.id);
    return e;
  }

  function update() {
    const run = G.run;
    if (run.timed.length && run.timed.some(t => t.until <= run.time)) {
      run.timed = run.timed.filter(t => t.until > run.time);
      G.mods.compute();
    }
    if (G.offlineSim) { run.nextEvent = Math.max(run.nextEvent, run.time + 120); return; }
    if (run.time < run.nextEvent || run.wave.active || run.pending.length || run.ended) return;
    const e = pickEvent();
    run.pending.push({ kind: 'event', id: e.id });
    run.nextEvent = run.time + G.EVENT_GAP[0] + Math.random() * (G.EVENT_GAP[1] - G.EVENT_GAP[0]);
  }

  return { update, cost, canChoose, choose };
})();
