// Actions du joueur et règles : construire, niveaux, recherche, allure, passes, pactes, marché, fin de partie.
G.logic = (function () {
  const BD = G.BUILDINGS;

  function maxHp(b) {
    const d = BD[b.type];
    return d.hp * (1 + G.LEVELS.hp * (b.level - 1)) * (d.wall ? 1 + 0.35 * (b.level - 1) : 1);
  }
  function maxLevel() { return G.REGIONS[G.run.region].maxLevel + (G.M.maxLevel || 0); }
  function count(type) { return G.run.buildings.filter(b => b.type === type).length; }

  // ---- Construction ----
  function unlocked(type) {
    const d = BD[type], run = G.run;
    if (!d || d.cat === 'base') return false;
    if (d.region && run.region < d.region) return false;
    if (d.tech && !run.techs.includes(d.tech)) return false;
    if (d.military && !G.RIGUEUR[run.rig].waves) return false;
    return true;
  }
  function buildCost(type) {
    const d = BD[type], c = {}, m = Math.pow(1.06, count(type));
    for (const r in d.cost) c[r] = Math.ceil(d.cost[r] * m);
    return c;
  }
  // Raison pour laquelle on ne peut pas poser ici (null si possible).
  function placeError(type, x, y) {
    const d = BD[type];
    if (!G.beast.inBack(x, y)) return "Hors du dos de la bête.";
    if (G.beast.isHeart(x, y)) return "Le cœur du Colosse : on n'y bâtit pas.";
    if (G.beast.isScar(x, y)) return "Une vieille cicatrice : rien n'y tient.";
    if (G.economy.at(x, y)) return "Case occupée.";
    if (d.flank && !G.beast.isFlank(x, y)) return "Uniquement sur un flanc (le bord du dos).";
    return null;
  }
  function build(type, x, y) {
    if (!unlocked(type)) return { ok: false, msg: 'Pas encore disponible.' };
    const err = placeError(type, x, y);
    if (err) return { ok: false, msg: err };
    const cost = buildCost(type);
    if (!G.logistics.pay(cost, x, y)) return { ok: false, msg: 'Ressources insuffisantes.' };
    const b = G.state.mkBuilding(G.run, type, x, y);
    if (BD[type].harpoon) b.cd = 2;
    G.run.buildings.push(b);
    G.run.stats.built++;
    G.economy.rebuildGrid();
    return { ok: true, b };
  }

  // ---- Niveaux ----
  function levelCost(b) {
    const d = BD[b.type];
    if (!d.cost) return null;
    const m = G.LEVELS.costBase * Math.pow(G.LEVELS.costGrow, b.level - 1), c = {};
    for (const r in d.cost) c[r] = Math.ceil(d.cost[r] * m);
    if (b.type === 'tente') c.peau = 6 * b.level;
    if (b.level >= 2) c.outils = (c.outils || 0) + 4 * (b.level - 1);
    return c;
  }
  function levelError(b) {
    if (b.ruined) return 'Réparez d\'abord.';
    if (!BD[b.type].cost) return 'Ce bâtiment ne monte pas de niveau.';
    if (b.level >= maxLevel()) return 'Niveau maximal pour cette région.';
    if (b.type === 'tente' && !G.run.techs.includes('t_depecage')) return 'Demande la technologie Dépeçage.';
    return null;
  }
  function levelUp(b) {
    if (levelError(b)) return false;
    if (!G.logistics.pay(levelCost(b), b.x, b.y)) return false;
    b.level++; b.hp = maxHp(b);
    return true;
  }
  function repairCost(b) {
    const d = BD[b.type], c = {};
    if (!d.cost) return { bois: 30, pierre: 30 };
    for (const r in d.cost) c[r] = Math.ceil(d.cost[r] * 0.4 * b.level);
    return c;
  }
  function repair(b) {
    if (!G.logistics.pay(repairCost(b), b.x, b.y)) return false;
    b.ruined = false; b.hp = maxHp(b);
    return true;
  }
  function demolish(b) {
    if (b.type === 'nuque') return false;
    const run = G.run;
    const refund = {};
    const d = BD[b.type];
    for (const r in d.cost) refund[r] = Math.floor(d.cost[r] * 0.5);
    for (const r in b.out) refund[r] = (refund[r] || 0) + b.out[r];
    if (b.store) for (const r in b.store) refund[r] = (refund[r] || 0) + b.store[r];
    run.buildings = run.buildings.filter(x => x !== b);
    run.transit = run.transit.filter(c => c.to !== b.bid);
    G.logistics.grant(refund);
    G.economy.rebuildGrid();
    return true;
  }

  // ---- Recherche ----
  function techState(id) {
    const t = G.TECHS[id], run = G.run;
    if (run.techs.includes(id)) return 'done';
    if (t.region > run.region) return 'locked';
    if (t.req && !t.req.every(q => run.techs.includes(q))) return 'locked';
    return run.recits >= t.cost ? 'ready' : 'poor';
  }
  function research(id) {
    if (techState(id) !== 'ready') return false;
    G.run.recits -= G.TECHS[id].cost;
    G.run.techs.push(id);
    G.mods.compute();
    if (!G.offlineSim) G.lore.say('tech');
    return true;
  }

  // ---- Allure ----
  function setPace(p) { if (G.BEAST.paces[p]) G.run.pace = p; }

  // ---- Passe ----
  function passReq() { return G.REGIONS[G.run.region].pass; }
  function passMissing() {
    const p = passReq(), run = G.run, miss = [];
    if (!G.route.atPass(run)) miss.push('Atteindre la passe (onglet Route).');
    if (!run.techs.includes(p.tech)) miss.push('Technologie : ' + G.TECHS[p.tech].name);
    for (const r in p.res) if ((run.res[r] || 0) < p.res[r]) miss.push(G.RESOURCES[r].name + ' : ' + Math.floor(run.res[r] || 0) + ' / ' + p.res[r]);
    return miss;
  }
  function crossPass() {
    if (passMissing().length) return false;
    const p = passReq(), run = G.run;
    G.logistics.pay(p.res, run.cx, 0);
    if (p.final) { endRun('triumph'); return true; }
    run.region++;
    G.meta.stats.bestRegion = Math.max(G.meta.stats.bestRegion, run.region);
    G.saga.addXp(30);
    if (run.rig >= G.meta.maxRig && run.rig < G.RIGUEUR.length - 1) G.meta.maxRig = run.rig + 1;
    run.route = G.route.generate(run);
    run.stepDist = 0;
    G.mods.compute();
    G.lore.say('region');
    if (!G.botSim) G.ui && G.ui.cinematic(G.REGIONS[run.region]);
    queuePact();
    return true;
  }

  // ---- Pactes et offrandes ----
  function pickN(obj, n, exclude) {
    const ids = Object.keys(obj).filter(k => !(exclude || []).includes(k));
    return G.util.shuffle(ids, Math.random).slice(0, n);
  }
  function queuePact() {
    const n = 3 + ((G.meta.heritage.h_augure || 0) ? 1 : 0);
    const excl = G.run.pacts.concat(G.RIGUEUR[G.run.rig].waves ? [] : ['p_corne']);
    G.run.pending.push({ kind: 'pact', options: pickN(G.PACTS, n, excl) });
  }
  function queueOffering() { G.run.pending.push({ kind: 'offering', options: pickN(G.OFFERINGS, 3) }); }
  function choosePending(i) {
    const run = G.run;
    if (run.pending[0] && run.pending[0].kind === 'dream') {
      const id = run.pending.shift().id;
      return G.saga.choose(id, i);
    }
    if (run.pending[0] && run.pending[0].kind === 'event') {
      const ev = G.EVENTS_BY[run.pending[0].id];
      if (!G.chronicle.canChoose(ev.choices[i])) return false;
      run.pending.shift();
      return G.chronicle.choose(ev, i);
    }
    const p = run.pending.shift();
    if (!p) return false;
    const id = p.options[i];
    if (p.kind === 'pact') run.pacts.push(id);
    else {
      run.offerings.push(id);
      const o = G.OFFERINGS[id];
      if (o.recits) run.recits += o.recits * (run.region + 1);
    }
    G.mods.compute();
    if (p.kind === 'offering' && G.OFFERINGS[id].heal) run.vigueur = G.beast.vigMax();
    return true;
  }

  // ---- Savoirs sans fin ----
  function infOpen() { return G.REGIONS.some((r, i) => i <= G.run.region && G.run.techs.includes(r.pass.tech)); }
  function infCost(id) { return Math.round(G.INFINITE[id].cost * Math.pow(G.INFINITE_GROW, G.run.infLv[id] || 0)); }
  function buyInf(id) {
    if (!infOpen() || G.run.recits < infCost(id)) return false;
    G.run.recits -= infCost(id);
    G.run.infLv[id] = (G.run.infLv[id] || 0) + 1;
    G.mods.compute();
    return true;
  }

  // ---- Monter d'un coup tous les bâtiments semblables ----
  function levelPeers(b) { return G.run.buildings.filter(x => x.type === b.type && x.level === b.level && !levelError(x)); }
  function levelAll(b) {
    let n = 0;
    for (const x of levelPeers(b)) if (levelUp(x)) n++;
    return n;
  }

  // ---- Chaîne de production : qui alimente ce bâtiment, qui consomme ce qu'il fait ----
  function outputs(b) {
    const d = BD[b.type];
    if (d.recipe) return Object.keys(d.recipe.out).filter(r => !G.RESOURCES[r].abstract);
    return Object.keys(b.out).filter(r => b.out[r] > 0.5);
  }
  function relations(b) {
    if (b._rel && b._relT > performance.now() - 1000) return b._rel;
    const wants = G.economy.wants(b), outs = outputs(b), rel = [];
    const near = o => Math.hypot(o.x - b.x, o.y - b.y);
    const others = G.run.buildings.filter(o => o !== b && !o.ruined && !o.store).sort((p, q) => near(p) - near(q));
    let sup = 0, cli = 0;
    for (const o of others) {
      if (sup < 6 && outputs(o).some(r => wants[r])) { rel.push({ x: o.x, y: o.y, supplier: true }); sup++; }
      const w = G.economy.wants(o);
      if (cli < 6 && outs.some(r => w[r])) { rel.push({ x: o.x, y: o.y, supplier: false }); cli++; }
    }
    b._rel = rel; b._relT = performance.now();
    return rel;
  }

  // ---- Marché des caravanes ----
  function makeMarket() {
    const run = G.run, offers = [];
    const pool = G.RES_ORDER.filter(r => !G.RESOURCES[r].abstract && G.RESOURCES[r].region <= run.region);
    for (let i = 0; i < 4; i++) {
      const give = G.util.pick(pool, Math.random);
      let get = G.util.pick(pool, Math.random);
      if (get === give) get = pool[(pool.indexOf(give) + 3) % pool.length];
      const gv = Math.round(20 + Math.random() * 30);
      const amt = Math.max(1, Math.round(gv * G.VALUES[give] / G.VALUES[get] * (0.8 + Math.random() * 0.4)));
      offers.push({ give, gv, get, amt, used: false });
    }
    return offers;
  }
  function trade(i) {
    const run = G.run, o = run.market && run.market[i];
    if (!o || o.used) return false;
    if (!G.logistics.pay({ [o.give]: o.gv }, run.cx, 0)) return false;
    G.logistics.grant({ [o.get]: o.amt });
    o.used = true;
    return true;
  }

  // ---- Fin de partie ----
  function memoryGain(reason) {
    const run = G.run, rig = G.RIGUEUR[run.rig];
    let m = Math.sqrt(run.stats.prodTotal) / 4 + run.region * 20 + run.stats.growths * 2 + run.stats.waves * 2 + run.route.l * 2;
    m *= rig.mem;
    if (reason === 'triumph') m = m * 1.5 + 30;
    return Math.max(1, Math.floor(m));
  }
  function endRun(reason) {
    const run = G.run;
    if (run.ended) return;
    const gain = memoryGain(reason);
    run.ended = true; run.endReason = reason; run.memGain = gain;
    if (!run.botRun) {
      G.meta.memory += gain; G.meta.totalMemory += gain;
      G.meta.stats.runs++;
      if (reason === 'triumph') { G.meta.stats.triumphs++; if (run.rig >= G.meta.maxRig && run.rig < G.RIGUEUR.length - 1) G.meta.maxRig = run.rig + 1; }
      G.meta.history.unshift({ reason, gain, region: run.region, time: Math.round(run.time), L: run.L, rig: run.rig, date: Date.now() });
      G.meta.history = G.meta.history.slice(0, 20);
      G.saga.onEnd(reason);
    }
    if (run.botRun || G.botSim) return;
    if (!G.offlineSim) G.lore.say(reason === 'triumph' ? 'triumph' : 'end');
    G.state.save();
    G.ui && G.ui.endModal();
  }

  // ---- Mémoire du troupeau ----
  function heritageCost(id) {
    const h = G.HERITAGE[id], l = G.meta.heritage[id] || 0;
    return Math.round(h.cost * Math.pow(h.grow, l));
  }
  function buyHeritage(id) {
    const h = G.HERITAGE[id], l = G.meta.heritage[id] || 0;
    if (l >= h.max) return false;
    const c = heritageCost(id);
    if (G.meta.memory < c) return false;
    G.meta.memory -= c;
    G.meta.heritage[id] = l + 1;
    G.mods.compute();
    return true;
  }

  // ---- Nouvelle partie ----
  function newGame(rig) {
    G.run = G.state.newRun(rig);
    G.flow = {};
    G.mods.compute();
    G.economy.rebuildGrid();
    G.world.prefill(G.run);
    G.logistics.totals();
    queuePact();
    G.lore.say('start');
  }

  // ---- Conseiller ----
  function advice() {
    const run = G.run;
    if (!run) return '';
    const has = t => run.buildings.some(b => b.type === t);
    if (run.pending.length) return 'Un choix vous attend.';
    if (!has('grue')) return 'Posez une grue sur un flanc (bord du dos) : elle récolte ce qui passe à portée.';
    const nq = run.buildings.find(b => b.type === 'nuque');
    if (run.satiete < 55 && (run.res.fourrage || 0) < 8 && nq && (nq.inp.fourrage || 0) < 8) return 'Plus de fourrage en route pour la bête : sélectionnez une grue et réglez sa cible sur le fourrage.';
    if (run.satiete < 30) return 'La bête a faim : il faut du fourrage (prairies) livré à la Nuque. Ralentir réduit sa faim.';
    if (G.RIGUEUR[run.rig].waves && !has('lanceur') && run.time > 150) return run.techs.includes('t_lanceur') ? 'Posez un lanceur d\'os : des parasites vont grimper.' : 'Recherchez « Balistique des os » avant la première vague (onglet Savoir).';
    if (!has('harpon')) return 'Un harpon sur un flanc chasse les troupeaux : la viande nourrit le fumoir.';
    if (!has('fumoir')) return 'Un fumoir transforme la viande en vivres pour les tentes.';
    if (!has('conteur')) return 'Un cercle de conteurs produit des récits pour la recherche.';
    if (run._jobs > run._pop + 0.5) return 'Il manque des bras : ajoutez des tentes (et des vivres).';
    if (!has('corderie')) return 'Une corderie tresse le fourrage en cordes (harpons, grues).';
    if (G.route.atPass(run)) return 'Vous êtes à la passe : réunissez les conditions dans l\'onglet Route.';
    if (run.route.next === null && G.route.options(run).length > 1) return 'Choisissez la prochaine étape dans l\'onglet Route.';
    return '';
  }

  return {
    maxHp, maxLevel, count, unlocked, buildCost, placeError, build, levelCost, levelError, levelUp,
    repairCost, repair, demolish, techState, research, setPace, passReq, passMissing, crossPass,
    queuePact, queueOffering, choosePending, infOpen, infCost, buyInf, levelPeers, levelAll, relations, makeMarket, trade, memoryGain, endRun,
    heritageCost, buyHeritage, newGame, advice
  };
})();
