// La saga : un songe par nuit, trois Voix, l'Éveil du Veilleur, les compagnons, les fins au Col.
// Tout est gardé dans la méta (meta.saga) : l'histoire continue d'une bête à l'autre.
G.saga = (function () {
  const NIGHT = 360, PARTY = 3, COMP_MAX = 5;
  let lastAfter = null;

  function S() { return G.meta.saga; }
  function ensure(meta) {
    const s = meta.saga || (meta.saga = {});
    s.voix = Object.assign({ os: 0, chair: 0, brume: 0 }, s.voix || {});
    s.xp = s.xp || 0; s.level = s.level || 1; s.points = s.points || 0;
    s.seen = s.seen || []; s.journal = s.journal || [];
    s.comp = s.comp || {}; s.party = s.party || [];
    s.endings = s.endings || [];
  }

  // ---- Éveil ----
  function xpNeed(l) { return 30 + 20 * l; }
  function addXp(n) {
    const s = S();
    s.xp += n;
    while (s.xp >= xpNeed(s.level)) {
      s.xp -= xpNeed(s.level);
      s.level++; s.points++;
      if (!G.botSim && !G.offlineSim && G.ui) G.ui.toast('Éveil ' + s.level + ' : un éclat de songe à placer (onglet Songe).', 'good');
    }
  }
  function spend(v) {
    const s = S();
    if (s.points <= 0 || !G.VOIX[v]) return false;
    s.points--; s.voix[v]++;
    G.mods.compute();
    return true;
  }

  // ---- Bonus ----
  function scaled(mods, n) { const o = {}; for (const k in mods) o[k] = mods[k] * n; return o; }
  function modsList() {
    const s = G.meta.saga;
    if (!s) return [];
    const out = [];
    for (const v in G.VOIX) {
      const n = s.voix[v] || 0;
      if (n) out.push(scaled(G.VOIX[v].per, n));
      for (const d of G.VOIX[v].dons) if (n >= d.at) out.push(d.mods);
    }
    for (const id of s.party) if (s.comp[id]) out.push(scaled(G.COMPANIONS[id].per, s.comp[id]));
    return out;
  }

  // ---- Compagnons ----
  function recruit(id) {
    const s = S();
    if (s.comp[id]) return false;
    s.comp[id] = 1;
    if (s.party.length < PARTY) s.party.push(id);
    return true;
  }
  function raise(id) { const s = S(); if (s.comp[id] && s.comp[id] < COMP_MAX) s.comp[id]++; }
  function bondCost(id) { return Math.round(30 * Math.pow(1.8, (S().comp[id] || 1) - 1)); }
  function bond(id) {
    const s = S(), run = G.run;
    if (!s.comp[id] || s.comp[id] >= COMP_MAX || run.recits < bondCost(id)) return false;
    run.recits -= bondCost(id);
    s.comp[id]++;
    G.mods.compute();
    return true;
  }
  function toggleParty(id) {
    const s = S();
    if (!s.comp[id]) return false;
    const i = s.party.indexOf(id);
    if (i >= 0) s.party.splice(i, 1);
    else if (s.party.length < PARTY) s.party.push(id);
    else return false;
    G.mods.compute();
    return true;
  }

  // ---- Songes ----
  function get(id) { return G.SONGES.find(d => d.id === id) || G.SONGES_ERRANTS.find(d => d.id === id); }
  function eligible(d) {
    const s = S(), run = G.run, c = d.cond || {};
    if (s.seen.includes(d.id)) return false;
    if (c.after && !s.seen.includes(c.after)) return false;
    if (c.time && run.time < c.time) return false;
    if (c.L && run.L < c.L) return false;
    if (c.region !== undefined && run.region < c.region) return false;
    if (c.endings && s.endings.length < c.endings) return false;
    return true;
  }
  function next() { return G.SONGES.find(eligible) || null; }

  // Une nuit par cycle jour/nuit, au plus profond de l'obscurité : un chapitre s'il y en a, sinon une errance.
  function isNight(run) { const ph = (run.time % NIGHT) / NIGHT; return ph > 0.42 && ph < 0.58; }
  function nextNight(run) {
    const ph = (run.time % NIGHT) / NIGHT;
    return (ph < 0.42 ? 0.42 - ph : 1.42 - ph) * NIGHT;
  }
  function update() {
    const run = G.run;
    if (G.offlineSim || run.demo || run.ended || run.pending.length || run.wave.active || !isNight(run)) return;
    const cycle = Math.floor(run.time / NIGHT);
    if (run.dreamCycle === cycle) return;
    const d = next() || G.SONGES_ERRANTS[Math.floor(Math.random() * G.SONGES_ERRANTS.length)];
    run.dreamCycle = cycle;
    run.pending.push({ kind: 'dream', id: d.id });
  }

  function choose(id, i) {
    const d = get(id), s = S(), c = d && d.choices[i];
    if (!c) return false;
    if (c.voix) s.voix[c.voix]++;
    if (c.recruit) recruit(c.recruit);
    else if (d.comp) raise(d.comp);
    if (c.fx) G.chronicle.applyFx(c.fx);
    const chapter = G.SONGES.includes(d);
    if (chapter && !s.seen.includes(id)) {
      s.seen.push(id);
      s.journal.push({ id, choice: i });
    }
    addXp(chapter ? 25 : 8);
    G.mods.compute();
    lastAfter = { title: d.title, text: c.after, voix: c.voix, recruit: c.recruit };
    return true;
  }
  function takeAfter() { const a = lastAfter; lastAfter = null; return a; }

  // ---- Fins ----
  function onEnd(reason) { addXp(reason === 'triumph' ? 60 : 15); }
  function canEnd(k) { const f = G.FINS[k]; return k === 'silence' || (S().voix[k] || 0) >= f.need; }
  function chooseEnding(k) {
    if (!G.FINS[k] || !canEnd(k)) return null;
    const s = S();
    if (!s.endings.includes(k)) s.endings.push(k);
    G.state.save();
    return G.FINS[k];
  }
  function wakeLine(reason) {
    const l = G.REVEILS[reason];
    return l ? l[Math.floor(Math.random() * l.length)] : '';
  }

  return { ensure, xpNeed, addXp, spend, modsList, recruit, bondCost, bond, toggleParty, get, next, nextNight, update, choose, takeAfter, onEnd, canEnd, chooseEnding, wakeLine, PARTY, COMP_MAX };
})();
