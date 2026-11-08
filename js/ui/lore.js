// Bulle de Tic, le pique-bœuf chroniqueur.
G.lore = (function () {
  let last = {}, hideAt = 0, idleAt = 0;
  function say(key, vars) {
    if (G.offlineSim || G.botSim) return;
    if (!G.meta || !G.meta.settings.lore) return;
    const lines = G.LORE[key];
    if (!lines) return;
    const now = performance.now() / 1000;
    if (last[key] && now - last[key] < 20 && key !== 'start') return;
    last[key] = now;
    let txt = lines[Math.floor(Math.random() * lines.length)];
    if (vars) for (const k in vars) txt = txt.replace('{' + k + '}', vars[k]);
    const el = document.getElementById('tic');
    if (!el) return;
    el.querySelector('.tic-text').textContent = txt;
    el.classList.add('show');
    hideAt = now + Math.max(7, txt.length / 14);
    idleAt = now + 150;
  }
  function update() {
    const now = performance.now() / 1000;
    const el = document.getElementById('tic');
    if (el && hideAt && now > hideAt) { el.classList.remove('show'); hideAt = 0; }
    if (!idleAt) idleAt = now + 90;
    if (now > idleAt && G.run && !G.run.ended) { say('idle'); idleAt = now + 150; }
  }
  return { say, update };
})();
