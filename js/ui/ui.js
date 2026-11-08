// Interface DOM : barres, onglets (Construire, Savoir, Route, Lignée), panneau de sélection, fenêtres, entrées.
G.ui = (function () {
  const $ = id => document.getElementById(id);
  const U = G.util;
  const state = { tab: 'build', placing: null, sel: null, hover: null, hoverDep: null, speed: 1, modal: null };
  const SPEEDS = [1, 2, 3, 5];

  function speedMult() { return G.userPaused ? 0 : state.speed; }

  // ---- Petits rendus ----
  function ic(id, cls) { return G.icon(id, cls); }
  function resIc(r) { return `<span class="ri" style="color:${G.RESOURCES[r].color}">${ic(r)}</span>`; }
  function costText(c) { return Object.keys(c).map(r => Math.ceil(c[r]) + ' ' + G.RESOURCES[r].name.toLowerCase()).join(', '); }
  function costHtml(c, noTip) {
    const res = G.run.res || {};
    return Object.keys(c).map(r => {
      const ok = (res[r] || 0) >= c[r];
      return `<span class="cost ${ok ? '' : 'miss'}" ${noTip ? '' : `data-tip="${G.RESOURCES[r].name} : ${U.fmt(res[r] || 0)} en stock"`}>${resIc(r)}${U.fmt(c[r], 0)}</span>`;
    }).join('');
  }
  function bar(v, max, cls) { return `<div class="bar ${cls || ''}"><i style="width:${U.clamp(v / max * 100, 0, 100)}%"></i></div>`; }
  function setHTML(el, html) { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

  // ---- Barre du haut ----
  function topbar() {
    const run = G.run, reg = G.REGIONS[run.region], node = G.route.current(run);
    const B = G.BEAST, vm = G.beast.vigMax();
    const paces = Object.keys(B.paces).map(p => `<button class="pace ${run.pace === p ? 'on' : ''}" data-action="pace:${p}" data-tipx="pace:${p}">${ic(p)}<span>${B.paces[p].name}</span></button>`).join('');
    const w = run.wave;
    let wave = '';
    if (G.defense.wavesOn()) {
      if (w.active) wave = `<div class="chip bad" data-tipx="wave">${ic('vague')} Vague ${w.n} : ${run.enemies.length} parasites</div>`;
      else if (G.NODES[node.type].oasis) wave = `<div class="chip" data-tip="Dans une oasis, aucune vague ne se déclenche.">${ic('vague')} Oasis : pas d'attaque</div>`;
      else wave = `<div class="chip ${w.side ? 'warn' : ''}" data-tipx="wave">${ic('vague')} ${w.side ? 'Côté ' + G.defense.SIDES[w.side] + ' ' : ''}${U.fmtTime(w.next - run.time)}</div>`;
    }
    const shakeLeft = B.shakeCd - (run.time - run.shakeAt);
    const stepPct = G.route.atPass(run) ? 100 : run.stepDist / G.STEP_LEN * 100;
    const speeds = `<button class="spd ${G.userPaused ? 'on' : ''}" data-action="gamePause" data-tip="Pause (Espace)">${ic(G.userPaused ? 'play' : 'halte')}</button>` +
      SPEEDS.map(s => `<button class="spd ${!G.userPaused && state.speed === s ? 'on' : ''}" data-action="speed:${s}">×${s}</button>`).join('');
    setHTML($('topbar'), `
      <div class="brand"><b>Dérive</b><small>${reg.name} · ${reg.age}</small></div>
      <div class="tb-block" data-tipx="step">
        <div class="lbl">${ic(G.NODES[node.type].icon)} ${G.NODES[node.type].name}</div>${bar(stepPct, 100, 'step')}
      </div>
      <div class="paces">${paces}</div>
      <div class="tb-block" data-tipx="sat">
        <div class="lbl">${ic('fourrage')} Satiété ${Math.round(run.satiete)} %</div>${bar(run.satiete, 100, run.satiete < 25 ? 'bad' : 'food')}
      </div>
      <div class="tb-block" data-tipx="vig">
        <div class="lbl">${ic('coeur')} Vigueur ${Math.round(run.vigueur)}/${vm}</div>${bar(run.vigueur, vm, 'vig')}
      </div>
      <div class="tb-block" data-tipx="grow">
        <div class="lbl">${ic('croissance')} ${run.L} vertèbres</div>${bar(run.L >= B.maxLen ? 1 : run.growth, run.L >= B.maxLen ? 1 : G.beast.growthCost(), 'grow')}
      </div>
      <div class="chip" data-tipx="pop">${ic('pop')} ${U.fmt(run._pop || 0, 0)} / ${U.fmt(run._jobs || 0, 0)}</div>
      ${wave}
      <button class="btn shake" data-action="shake" ${shakeLeft > 0 ? 'disabled' : ''} data-tip="S'ébrouer : la bête se secoue. Blesse tous les parasites (60), mais les cargaisons en transit tombent et les bâtiments sont un peu abîmés.">${ic('shake')} ${shakeLeft > 0 ? U.fmtTime(shakeLeft) : "S'ébrouer"}</button>
      <div class="speeds">${speeds}</div>
      <button class="btn icon" data-action="help:cmd" data-tip="Guide : commandes, bâtiments, ressources, règles">${ic('aide')}</button>
      <button class="btn icon" data-action="settings" data-tip="Réglages">${ic('reglages')}</button>`);
  }

  // ---- Ressources ----
  function resources() {
    const run = G.run, res = run.res || {};
    const rows = G.RES_ORDER.filter(r => G.RESOURCES[r].region <= run.region || (res[r] || 0) > 0).map(r => {
      const f = G.flow[r] || { p: 0, c: 0 }, net = f.p - f.c;
      return `<div class="res" data-tipx="res:${r}">
        ${resIc(r)}<span class="n">${G.RESOURCES[r].name}</span><b>${U.fmt(res[r] || 0)}</b><small class="${net < -0.005 ? 'neg' : net > 0.005 ? 'pos' : ''}">${Math.abs(net) < 0.005 ? '' : U.fmtRate(net)}</small></div>`;
    }).join('');
    setHTML($('resources'), `<h3>Ressources</h3>${rows}`);
    const adv = G.logic.advice();
    const mut = run.mutation && G.MUTATIONS[run.mutation];
    const fx = (run.timed || []).map(t => `<li><b>${t.name}</b> <small>${U.fmtTime(t.until - run.time)}</small></li>`).join('');
    setHTML($('hint'), (adv ? `<div class="advice"><b>Conseil</b>${adv}</div>` : '') +
      (mut ? `<div class="mutation" data-tip="${mut.desc}"><small>Cette bête</small><b>${mut.name}</b></div>` : '') +
      (fx ? `<div class="timed"><small>En ce moment</small><ul>${fx}</ul></div>` : '') + modsBlock());
  }

  function modsBlock() {
    const m = G.info.activeMods();
    if (!m.length) return '';
    return `<div class="timed"><small>Bonus de cette marche</small><ul>${m.map(x => `<li><span>${x.label}</span><b class="${x.good ? 'pos' : 'neg'}">${x.text}</b></li>`).join('')}</ul></div>`;
  }

  // ---- Onglets ----
  const TABS = [['build', 'Construire', 'grue'], ['flux', 'Flux', 'flux'], ['tech', 'Savoir', 'recits'], ['route', 'Route', 'route'], ['saga', 'Songe', 'songe'], ['meta', 'Lignée', 'memoire']];
  function tabs() {
    const pend = G.run.route.next === null && G.route.options(G.run).length > 1;
    setHTML($('tabs'), TABS.map(([id, n, i]) => `<button class="tab ${state.tab === id ? 'on' : ''}" data-action="tab:${id}">${ic(i)}<span>${n}</span>${(id === 'route' && pend) || (id === 'saga' && G.meta.saga.points > 0) ? '<em class="dot"></em>' : ''}</button>`).join(''));
  }

  function buildPanel() {
    const run = G.run;
    let h = `<p class="legend">Entrées → sorties, ${G.meta.settings.rateUnit === 'sec' ? 'par seconde' : 'par minute'}, au niveau 1. Survolez une carte pour sa fiche complète.</p>`;
    if (state.placing) {
      const p = G.BUILDINGS[state.placing];
      h += `<div class="placing"><div><div class="pl1">Placement : <b>${p.name}</b> <span class="cc">${costHtml(G.logic.buildCost(state.placing), true)}</span></div><div class="cf">${G.info.cardFlow(state.placing)}</div><small>${G.info.placementText(p)} Maj + clic : en poser plusieurs.</small></div><button class="btn sm" data-action="cancelPlace">Annuler</button></div>`;
    }
    for (const cat of G.BUILD_CATEGORIES) {
      const ids = Object.keys(G.BUILDINGS).filter(id => G.BUILDINGS[id].cat === cat.id && G.logic.unlocked(id));
      if (!ids.length) continue;
      h += `<h4>${cat.name}</h4><div class="cards">`;
      for (const id of ids) {
        const d = G.BUILDINGS[id], c = G.logic.buildCost(id), ok = G.logistics.canPay(c), n = G.logic.count(id);
        h += `<button class="card ${state.placing === id ? 'on' : ''} ${ok ? '' : 'poor'}" data-action="place:${id}" data-tipx="b:${id}">
          <span class="ci cat-${d.cat}">${ic(id)}</span><span class="cn">${d.name}${d.flank ? ' <em>flanc</em>' : ''}${n ? ` <small>×${n}</small>` : ''}${d.jobs ? `<small class="jb">${ic('pop')}${d.jobs}</small>` : ''}</span>
          <span class="cc">${costHtml(c, true)}</span><span class="cf">${G.info.cardFlow(id)}</span></button>`;
      }
      h += '</div>';
    }
    const locked = Object.keys(G.BUILDINGS).filter(id => G.BUILDINGS[id].cat !== 'base' && !G.logic.unlocked(id) && !(G.BUILDINGS[id].military && !G.defense.wavesOn()));
    if (locked.length) h += `<h4>À découvrir</h4><div class="lockedb">${locked.map(id => `<span data-tipx="b:${id}">${ic(id)}${G.BUILDINGS[id].name}</span>`).join('')}</div>`;
    return h;
  }

  function techPanel() {
    const run = G.run;
    let h = `<div class="recits">${resIc('recits')} <b>${U.fmt(run.recits)}</b> récits</div>`;
    for (let r = 0; r <= Math.min(run.region + 1, G.REGIONS.length - 1); r++) {
      h += `<h4>${G.REGIONS[r].age}</h4>`;
      for (const id in G.TECHS) {
        const t = G.TECHS[id];
        if (t.region !== r) continue;
        const st = G.logic.techState(id);
        const req = t.req ? t.req.filter(q => !run.techs.includes(q)).map(q => G.TECHS[q].name) : [];
        h += `<div class="tech ${st} ${t.key ? 'key' : ''}" data-tipx="tech:${id}">
          <div><b>${t.name}</b><p>${t.desc}${req.length ? '<br><small>Demande : ' + req.join(', ') + '</small>' : ''}${t.region > run.region ? '<br><small>Région suivante</small>' : ''}</p></div>
          ${st === 'done' ? '<span class="ok">✔</span>' : `<button class="btn sm" data-action="research:${id}" ${st === 'ready' ? '' : 'disabled'}>${resIc('recits')}${t.cost}</button>`}
        </div>`;
      }
    }
    h += `<h4>Savoirs sans fin</h4>`;
    if (!G.logic.infOpen()) h += `<p class="muted small">S'ouvrent avec ${G.TECHS[G.REGIONS[0].pass.tech].name}. Ces recherches se répètent sans limite, de plus en plus chères.</p>`;
    else for (const id in G.INFINITE) {
      const it = G.INFINITE[id];
      if (it.waves && !G.defense.wavesOn()) continue;
      const c = G.logic.infCost(id), lv = run.infLv[id] || 0, ok = run.recits >= c;
      h += `<div class="tech ${ok ? 'ready' : 'poor'}"><div><b>${it.name}</b> <small>niv. ${lv}</small><p>${it.desc}</p></div>
        <button class="btn sm" data-action="inf:${id}" ${ok ? '' : 'disabled'}>${resIc('recits')}${U.fmt(c, 0)}</button></div>`;
    }
    return h;
  }

  function routePanel() {
    const run = G.run, R = run.route;
    const opts = G.route.options(run);
    const cols = R.layers.map((layer, l) => `<div class="rl">${layer.map((n, i) => {
      const def = G.NODES[n.type];
      const cur = l === R.l && i === R.i, past = l < R.l;
      const opt = l === R.l + 1 && opts.includes(i);
      const chosen = opt && R.next === i;
      return `<button class="rn ${cur ? 'cur' : ''} ${past ? 'past' : ''} ${opt ? 'opt' : ''} ${chosen ? 'chosen' : ''}" ${opt ? `data-action="route:${i}"` : ''} data-tipx="node:${n.type}">${ic(def.icon)}<span>${def.name}</span></button>`;
    }).join('')}</div>`).join('<div class="rarrow">›</div>');
    let h = `<p class="muted small">La bête traverse la région étape par étape (${G.STEP_LEN} cases chacune). Choisissez la suite avant la fin de l'étape ; sinon elle choisit seule.</p>`;
    h += `<div class="routemap">${cols}</div>`;
    if (opts.length) {
      const left = (G.STEP_LEN - run.stepDist) / Math.max(0.001, G.beast.speed());
      h += `<p class="small">Fin de l'étape dans <b>${G.beast.speed() > 0 ? U.fmtTime(left) : '— (halte)'}</b>. Suite : <b>${R.next === null ? 'au choix de la bête' : G.NODES[R.layers[R.l + 1][R.next].type].name}</b></p>`;
    }
    // Passe
    const p = G.logic.passReq(), miss = G.logic.passMissing();
    h += `<h4>${p.final ? '🏔 ' : ''}${p.name}</h4><div class="req">`;
    h += `<div class="rq ${G.route.atPass(run) ? 'ok' : ''}">${ic('n_passe')} Atteindre la passe ${G.route.atPass(run) ? '✔' : ''}</div>`;
    h += `<div class="rq ${run.techs.includes(p.tech) ? 'ok' : ''}">${resIc('recits')} ${G.TECHS[p.tech].name} ${run.techs.includes(p.tech) ? '✔' : ''}</div>`;
    for (const r in p.res) { const v = run.res[r] || 0; h += `<div class="rq ${v >= p.res[r] ? 'ok' : ''}">${resIc(r)} ${G.RESOURCES[r].name} ${U.fmt(v)} / ${p.res[r]}${bar(v, p.res[r])}</div>`; }
    h += `</div><button class="btn primary wide" data-action="cross" ${miss.length ? 'disabled' : ''}>${p.final ? 'Franchir le Col : fin de la marche en triomphe' : 'Franchir la passe'}</button>`;
    // Marché
    if (run.market) {
      h += `<h4>${ic('n_caravane')} Caravane</h4><div class="market">`;
      run.market.forEach((o, i) => {
        h += `<div class="offer ${o.used ? 'used' : ''}">${resIc(o.give)}${o.gv} → ${resIc(o.get)}${o.amt}
          <button class="btn sm" data-action="trade:${i}" ${o.used || !G.logistics.canPay({ [o.give]: o.gv }) ? 'disabled' : ''}>${o.used ? 'Fait' : 'Échanger'}</button></div>`;
      });
      h += '</div>';
    }
    // Pactes et offrandes
    if (run.pacts.length || run.offerings.length) {
      h += `<h4>Pactes et offrandes</h4><ul class="plist">` +
        run.pacts.map(p => `<li><b>${G.PACTS[p].name}</b> : ${G.PACTS[p].desc}</li>`).join('') +
        run.offerings.map(o => `<li>${G.OFFERINGS[o].name} : ${G.OFFERINGS[o].desc}</li>`).join('') + '</ul>';
    }
    return h;
  }

  function metaPanel() {
    const meta = G.meta, run = G.run;
    let h = `<div class="recits">${ic('memoire')} <b>${meta.memory}</b> points de mémoire</div>
      <p class="muted small">La Mémoire du troupeau survit aux bêtes. Elle se gagne à la fin d'une marche (mort du Colosse, passage du Col, ou transmission volontaire) et ses bienfaits s'appliquent tout de suite.</p>`;
    for (const id in G.HERITAGE) {
      const hh = G.HERITAGE[id], l = meta.heritage[id] || 0, c = G.logic.heritageCost(id);
      h += `<div class="tech ${l >= hh.max ? 'done' : meta.memory >= c ? 'ready' : 'poor'}"><div><b>${hh.name}</b> <small>${l}/${hh.max}</small><p>${hh.desc}</p></div>
        ${l >= hh.max ? '<span class="ok">✔</span>' : `<button class="btn sm" data-action="heritage:${id}" ${meta.memory >= c ? '' : 'disabled'}>${ic('memoire')}${c}</button>`}</div>`;
    }
    h += `<h4>Cette marche</h4><p class="small">Durée ${U.fmtTime(run.time)} · ${run.stats.waves} vagues repoussées · ${run.stats.growths} vertèbres gagnées · difficulté ${G.RIGUEUR[run.rig].name}.<br>
      Mémoire si la marche s'arrêtait maintenant : <b>${G.logic.memoryGain('transmit')}</b> (triomphe au Col : ×1,5 + 30).</p>
      <button class="btn wide" data-action="transmit">Transmettre : laisser cette bête et en trouver une autre</button>`;
    if (meta.history.length) h += `<h4>Bêtes passées</h4><ul class="plist">` + meta.history.slice(0, 6).map(x =>
      `<li>${x.reason === 'triumph' ? '🏔 Triomphe' : x.reason === 'death' ? 'Morte' : 'Transmise'} · ${G.REGIONS[x.region].name} · ${x.L} vertèbres · ${U.fmtTime(x.time)} · +${x.gain}</li>`).join('') + '</ul>';
    return h;
  }

  function panel() {
    const fn = { build: buildPanel, flux: G.info.fluxPanel, tech: techPanel, route: routePanel, saga: G.info.sagaPanel, meta: metaPanel }[state.tab];
    setHTML($('panel'), fn());
  }

  // ---- Sélection ----
  function selection() {
    const b = state.sel, el = $('selection');
    if (!b || !G.run.buildings.includes(b)) { state.sel = null; el.classList.add('hidden'); setHTML(el, ''); return; }
    el.classList.remove('hidden');
    const d = G.BUILDINGS[b.type], run = G.run;
    let h = `<div class="selh"><span class="ci cat-${d.cat}">${ic(b.type)}</span><div><b>${d.name}</b> <small>niv. ${b.level}</small><br><small class="muted">${d.desc}</small></div><button class="x" data-action="deselect">×</button></div>`;
    const tags = [];
    if (G.beast.isVein(b.x, b.y)) tags.push('Sur une veine : production ×1,4');
    if (G.beast.isSpine(b.x, b.y)) tags.push('Sur l\'échine');
    if (G.beast.isFlank(b.x, b.y)) tags.push('Flanc');
    if (tags.length) h += `<p class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</p>`;
    const stTxt = G.info.statusText(b);
    if (stTxt) h += `<p class="status st-${b._st}">${stTxt}</p>`;
    if (d.jobs) h += `<p class="small">Main-d'œuvre : ${Math.round((b._eff || 0) * 100)} % · ${U.fmt(G.economy.jobs(b), 1)} emplois</p>`;
    h += G.info.selectionExtras(b);
    const mh = G.logic.maxHp(b);
    h += `<div class="small">Solidité ${Math.round(b.hp)}/${Math.round(mh)}</div>${bar(b.hp, mh, 'vig')}`;
    const stock = (title, o) => {
      const ks = Object.keys(o).filter(r => o[r] > 0.05);
      return ks.length ? `<div class="stock"><small>${title}</small>${ks.map(r => `<span>${resIc(r)}${U.fmt(o[r])}</span>`).join('')}</div>` : '';
    };
    h += stock('Entrée', b.inp) + stock('Sortie', b.out) + (b.store ? stock('Réserve', b.store) : '');
    if (d.harvest || d.harpoon) {
      const rs = [];
      for (const k in G.DEPOSITS) { const dp = G.DEPOSITS[k]; if (dp.region <= run.region && (d.harpoon || !dp.harpoonOnly) && !rs.includes(dp.res)) rs.push(dp.res); }
      h += `<div class="filter"><small>Cible</small><button class="btn sm ${!b.filter ? 'on' : ''}" data-action="filter:" data-tip="Automatique : ce qui manque le plus">Auto</button>` +
        rs.map(r => `<button class="btn sm ${b.filter === r ? 'on' : ''}" data-action="filter:${r}" data-tip="${G.RESOURCES[r].name} seulement">${resIc(r)}</button>`).join('') + '</div>';
    }
    if (d.housing) h += `<p class="small">Loge ${U.fmt(G.economy.housing(b) * (b.type === 'tente' ? (b._fed === undefined ? 1 : b._fed) : 1), 0)} habitants</p>`;
    if (b.type === 'nuque') h += `<p class="small">Fourrage prêt pour la bête : ${U.fmt(b.inp.fourrage || 0)} / 40</p>`;
    h += `<p class="small muted" data-tip="Plus les trajets sont courts, plus les porteurs livrent. Tous occupés : rapprochez les maillons ou ajoutez un grenier.">Porteurs ${G.logistics.busy(b)}/${G.logistics.porters(b)} occupés · charge ${U.fmt(G.logistics.charge(b))}</p>`;
    h += G.info.nextLevel(b);
    h += '<div class="acts">';
    if (b.ruined) h += `<button class="btn primary" data-action="repair">Réparer ${costHtml(G.logic.repairCost(b))}</button>`;
    else {
      const le = G.logic.levelError(b);
      if (!le) {
        h += `<button class="btn primary" data-action="levelUp" ${G.logistics.canPay(G.logic.levelCost(b)) ? '' : 'disabled'}>Niveau ${b.level + 1} ${costHtml(G.logic.levelCost(b))}</button>`;
        const peers = G.logic.levelPeers(b).length;
        if (peers > 1) h += `<button class="btn" data-action="levelAll" ${G.logistics.canPay(G.logic.levelCost(b)) ? '' : 'disabled'} data-tip="Monte tous les bâtiments de ce type et de ce niveau, tant que les stocks suivent.">Monter les ${peers}</button>`;
      } else if (d.cost) h += `<p class="small muted">${le}</p>`;
      if (b.type !== 'nuque') {
        h += `<button class="btn" data-action="togglePause" data-tip="À l'arrêt, il ne consomme plus ni ne réclame d'entrées.">${b.paused ? 'Reprendre' : 'Pause'}</button>`;
        h += `<button class="btn" data-action="prio" data-tip="Les porteurs ravitaillent d'abord les priorités hautes.">Priorité : ${['basse', 'normale', 'haute'][b.prio]}</button>`;
      }
    }
    if (b.type !== 'nuque') h += `<button class="btn danger" data-action="demolish" data-tip="Rembourse la moitié du coût de base et rend les stocks.">Démolir</button>`;
    h += '</div>';
    setHTML(el, h);
  }

  // ---- Fenêtres ----
  function openModal(html, opts) {
    opts = opts || {};
    state.modal = opts.kind || 'modal';
    $('modal-root').innerHTML = `<div class="modal-bg"><div class="modal ${opts.cls || ''}">${html}</div></div>`;
    if (!opts.noPause) G.paused = true;
  }
  function closeModal() { $('modal-root').innerHTML = ''; state.modal = null; G.paused = false; }

  let confirmCb = null;
  function confirmModal(text, cb) {
    confirmCb = cb;
    openModal(`<p>${text}</p><div class="acts"><button class="btn primary" data-action="confirmYes">Confirmer</button><button class="btn" data-action="closeModal">Annuler</button></div>`, { kind: 'confirm' });
  }

  function pendingModal() {
    const p = G.run.pending[0];
    if (!p || state.modal || G.run.ended || (G.bot && G.bot.active)) return;
    if (p.kind === 'dream') {
      const d = G.saga.get(p.id);
      openModal(`<small class="dbook">${d.book === undefined ? 'Songe errant' : G.SAGA_BOOKS[d.book]}</small><h2>${d.title}</h2>${d.text.map(t => `<p>${t}</p>`).join('')}<div class="choices">${d.choices.map((c, i) =>
        `<button class="choice" data-action="choose:${i}"><b>${c.label}</b>${c.desc ? `<span>${c.desc}</span>` : ''}<em style="color:${G.VOIX[c.voix].color}">${G.VOIX[c.voix].short} +1${c.recruit ? ' · compagnon' : ''}</em></button>`).join('')}</div>`, { kind: 'pending', cls: 'wide dream' });
      return;
    }
    if (p.kind === 'event') {
      const ev = G.EVENTS_BY[p.id];
      openModal(`<h2>${ev.name}</h2><p>${ev.text}</p><div class="choices">${ev.choices.map((c, i) => {
        const k = G.chronicle.cost(c), ok = G.chronicle.canChoose(c);
        return `<button class="choice ${ok ? '' : 'locked'}" ${ok ? `data-action="choose:${i}"` : 'disabled'}><b>${c.label}</b><span>${c.desc}</span>${k ? `<em class="choice-cost">${costHtml(k)}</em>` : ''}</button>`;
      }).join('')}</div>`, { kind: 'pending' });
      return;
    }
    const src = p.kind === 'pact' ? G.PACTS : G.OFFERINGS;
    const title = p.kind === 'pact' ? 'Un pacte avec la route' : 'Une offrande du nid';
    const intro = p.kind === 'pact' ? 'Choisissez un pacte. Il durera toute la marche.' : 'Le nid est vidé. Choisissez une offrande.';
    openModal(`<h2>${title}</h2><p class="muted">${intro}</p><div class="choices">${p.options.map((id, i) =>
      `<button class="choice ${src[id].risky ? 'risky' : ''}" data-action="choose:${i}"><b>${src[id].name}</b><span>${src[id].desc}</span>${src[id].risky ? '<em>risqué</em>' : ''}</button>`).join('')}</div>`, { kind: 'pending' });
  }

  function dreamAfter(a) {
    if (!a) return;
    const v = a.voix ? G.VOIX[a.voix] : null, c = a.recruit ? G.COMPANIONS[a.recruit] : null;
    openModal(`<small class="dbook">Au réveil</small><h2>${a.title}</h2><p>${a.text}</p>
      ${v ? `<p class="dgain" style="color:${v.color}">${v.name} grandit.</p>` : ''}${c ? `<p class="dgain">${c.name}, ${c.cls.toLowerCase()}, rejoint le Veilleur.</p>` : ''}
      <button class="btn primary wide" data-action="closeModal">Se lever</button>`, { kind: 'dreamafter', cls: 'wide dream' });
  }
  function reread(id) {
    const d = G.saga.get(id), j = G.meta.saga.journal.find(x => x.id === id), c = d.choices[j.choice];
    openModal(`<small class="dbook">${G.SAGA_BOOKS[d.book]}</small><h2>${d.title}</h2>${d.text.map(t => `<p>${t}</p>`).join('')}<p class="dchosen">${c.label}</p><p>${c.after}</p><button class="btn primary wide" data-action="closeModal">Refermer</button>`, { kind: 'reread', cls: 'wide dream' });
  }
  function endingModal(k) {
    const f = G.saga.chooseEnding(k);
    if (!f) return;
    openModal(`<small class="dbook">Au Col des Murmures</small><h2>${f.title}</h2>${f.text.map(t => `<p>${t}</p>`).join('')}<button class="btn primary wide" data-action="startScreen">Trouver une nouvelle bête</button>`, { kind: 'end', cls: 'wide dream' });
  }

  function startModal() {
    const meta = G.meta;
    const rigs = G.RIGUEUR.map((r, i) => `<button class="choice ${i > meta.maxRig ? 'locked' : ''}" ${i > meta.maxRig ? 'disabled' : `data-action="newGame:${i}"`}>
      <b>${r.name}</b><span>${r.desc}</span><em>Mémoire ×${String(r.mem).replace('.', ',')}${i > meta.maxRig ? ' · franchissez une passe en ' + G.RIGUEUR[i - 1].name + ' pour débloquer' : ''}</em></button>`).join('');
    openModal(`<h1>Dérive</h1><p class="lead">Votre peuple vit sur le dos d'un Colosse qui marche à travers le Monde Ocre.<br>Il marche. Vous construisez.</p>
      <ul class="howto">
        <li>Les <b>gisements défilent</b> le long de ses flancs : posez des <b>grues</b> et des <b>harpons</b> sur le bord du dos pour les attraper au passage.</li>
        <li>Des <b>porteurs</b> font circuler les ressources d'un bâtiment à l'autre. Le <b>fourrage</b> livré à la Nuque nourrit la bête ; bien nourrie, elle <b>grandit</b>.</li>
        <li>Réglez l'<b>allure</b> (halte, marche, galop), choisissez la <b>route</b>, et franchissez les passes jusqu'au <b>Col des Murmures</b>.</li>
      </ul>
      <h3>Nouvelle bête</h3><div class="choices">${rigs}</div>
      ${G.run && !G.run.ended && !G.run.demo ? '<button class="btn wide" data-action="closeModal">Reprendre la marche en cours</button>' : ''}`, { kind: 'start', cls: 'wide' });
  }

  function endModal() {
    const run = G.run;
    const titles = { death: 'Le Colosse s\'est effondré', triumph: 'Le Col des Murmures !', transmit: 'Vous laissez la bête poursuivre seule' };
    openModal(`<h2>${titles[run.endReason] || 'Fin de la marche'}</h2>
      <p>${run.endReason === 'triumph' ? 'Jamais une bête n\'était allée si loin. Les conteurs en feront un chant.' : 'Le troupeau se souviendra de cette marche.'}</p>
      <ul class="plist"><li>Durée : ${U.fmtTime(run.time)}</li><li>Région : ${G.REGIONS[run.region].name}</li><li>Vertèbres : ${run.L}</li><li>Vagues repoussées : ${run.stats.waves}</li></ul>
      ${run.endReason !== 'triumph' ? `<p class="tt-f">${G.saga.wakeLine(run.endReason)}</p>` : ''}
      <p class="big">${ic('memoire')} +${run.memGain} points de mémoire</p>
      ${run.endReason === 'triumph' ? `<h3>Quelque chose attend que vous parliez.</h3><div class="choices">${Object.keys(G.FINS).map(k => { const f = G.FINS[k], ok = G.saga.canEnd(k); return `<button class="choice ${ok ? '' : 'locked'}" ${ok ? `data-action="ending:${k}"` : 'disabled'}><b>${f.label}</b><span>${f.desc}</span></button>`; }).join('')}</div>`
      : '<button class="btn primary wide" data-action="startScreen">Trouver une nouvelle bête</button>'}`, { kind: 'end' });
  }

  function settingsModal() {
    const s = G.meta.settings;
    openModal(`<h2>Réglages</h2>
      <label class="row"><input type="checkbox" data-action="setLore" ${s.lore ? 'checked' : ''}> Répliques de Tic</label>
      <label class="row"><input type="checkbox" data-action="setRate" ${s.rateUnit === 'sec' ? 'checked' : ''}> Débits par seconde (sinon par minute)</label>
      <div class="acts">
        <button class="btn" data-action="version:${G.is3D ? '2d' : '3d'}">${G.is3D ? 'Passer à la version 2D' : 'Passer à la version 3D'}</button>
        <button class="btn" data-action="startScreen">Écran de départ</button>
        <button class="btn" data-action="bot">${G.bot && G.bot.active ? 'Arrêter le mode Bot' : 'Mode Bot (le bot joue)'}</button>
        <button class="btn danger" data-action="wipe">Tout effacer</button>
        <button class="btn primary" data-action="closeModal">Fermer</button>
      </div>`, { kind: 'settings' });
  }

  function cinematic(reg) {
    const el = $('cine');
    el.innerHTML = `<div><small>Nouvelle région</small><h1>${reg.name}</h1><p>${reg.age}</p></div>`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4200);
  }

  // ---- Notifications ----
  function toast(text, kind) {
    if (G.offlineSim || G.botSim) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4000);
    setTimeout(() => el.remove(), 4600);
  }

  // ---- Actions ----
  function act(action, el) {
    const [name, arg] = action.split(':');
    const run = G.run;
    switch (name) {
      case 'tab': state.tab = arg; break;
      case 'place': state.placing = state.placing === arg ? null : arg; state.sel = null; break;
      case 'cancelPlace': state.placing = null; break;
      case 'deselect': state.sel = null; break;
      case 'pace': G.logic.setPace(arg); break;
      case 'speed': state.speed = +arg; G.userPaused = false; break;
      case 'gamePause': G.userPaused = !G.userPaused; break;
      case 'shake': G.beast.shake(); break;
      case 'research': if (G.logic.research(arg)) toast('Découverte : ' + G.TECHS[arg].name, 'good'); break;
      case 'route': G.route.choose(run, +arg); break;
      case 'cross': G.logic.crossPass(); break;
      case 'trade': G.logic.trade(+arg); break;
      case 'heritage': G.logic.buyHeritage(arg); break;
      case 'choose': {
        const dream = run.pending[0] && run.pending[0].kind === 'dream';
        G.logic.choosePending(+arg); closeModal();
        if (dream) dreamAfter(G.saga.takeAfter());
        break;
      }
      case 'voix': G.saga.spend(arg); break;
      case 'party': if (!G.saga.toggleParty(arg)) toast('Trois compagnons au plus à vos côtés.', 'bad'); break;
      case 'bond': G.saga.bond(arg); break;
      case 'reread': reread(arg); break;
      case 'ending': endingModal(arg); break;
      case 'help': openModal(G.info.guide(arg), { kind: 'help', cls: 'xl' }); break;
      case 'selb': { const b = run.buildings.find(x => x.bid === +arg); if (b) state.sel = b; break; }
      case 'view': view(arg); break;
      case 'levelUp': if (state.sel) G.logic.levelUp(state.sel); break;
      case 'levelAll': if (state.sel) { const n = G.logic.levelAll(state.sel); toast(n + ' bâtiment' + (n > 1 ? 's' : '') + ' monté' + (n > 1 ? 's' : '') + ' de niveau.', 'good'); } break;
      case 'inf': G.logic.buyInf(arg); break;
      case 'version': G.state.save(); G.wiping = true; location.href = arg === '3d' ? '3d.html' : 'index.html'; break;
      case 'repair': if (state.sel) G.logic.repair(state.sel); break;
      case 'togglePause': if (state.sel) state.sel.paused = !state.sel.paused; break;
      case 'prio': if (state.sel) state.sel.prio = (state.sel.prio + 1) % 3; break;
      case 'filter': if (state.sel) { state.sel.filter = arg || null; state.sel.target = null; } break;
      case 'demolish': { const b = state.sel; if (b) confirmModal(`Démolir ${G.BUILDINGS[b.type].name} ? La moitié du coût revient à la réserve.`, () => { G.logic.demolish(b); state.sel = null; }); break; }
      case 'confirmYes': { const cb = confirmCb; confirmCb = null; closeModal(); if (cb) cb(); break; }
      case 'closeModal': closeModal(); break;
      case 'transmit': confirmModal('Transmettre ? Cette marche s\'arrête et vous gagnez ' + G.logic.memoryGain('transmit') + ' points de mémoire.', () => G.logic.endRun('transmit')); break;
      case 'startScreen': closeModal(); startModal(); break;
      case 'newGame': {
        const go = () => { closeModal(); G.bot && G.bot.stop(); G.logic.newGame(+arg); state.sel = null; state.placing = null; G.render.fit(); G.state.save(); };
        if (G.run && !G.run.ended && !G.run.demo && G.run.time > 30) confirmModal('Abandonner la bête actuelle ? Elle ne rapportera aucune mémoire.', go); else go();
        break;
      }
      case 'settings': settingsModal(); break;
      case 'setLore': G.meta.settings.lore = el.checked; break;
      case 'setRate': G.meta.settings.rateUnit = el.checked ? 'sec' : 'min'; break;
      case 'bot': closeModal(); if (G.bot.active) G.bot.stop(); else { G.bot.start(); G.bot.decide(); } break;
      case 'wipe': confirmModal('Effacer toute la progression (mémoire comprise) ?', () => G.state.wipe()); break;
    }
    refresh(true);
  }

  // ---- Entrées carte ----
  function bindCanvas(cv) {
    let drag = null;
    let noMenu = false;
    cv.addEventListener('mousedown', e => {
      if (e.button === 1) e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, moved: false, orbit: e.button !== 0 };
    });
    window.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (drag.moved || Math.abs(dx) + Math.abs(dy) > 5) {
          drag.moved = true;
          if (drag.orbit && G.render.orbit) G.render.orbit(dx, dy); else G.render.pan(dx, dy);
          drag.x = e.clientX; drag.y = e.clientY;
          cv.style.cursor = 'grabbing'; hideTip();
        }
      }
      if (e.target === cv && !(drag && drag.moved)) {
        const t = G.render.screenToTile(e.clientX - r.left, e.clientY - r.top);
        state.hover = t;
        let hd = null, best = 1.2;
        if (!G.beast.inBack(t.x, t.y)) for (const d of G.run.deposits) { const dd = Math.hypot(d.x - t.wx, d.y - t.wy); if (dd < best) { best = dd; hd = d; } }
        state.hoverDep = hd ? hd.did : null;
        mapTip(e, t, hd);
      } else if (e.target !== cv) state.hover = null;
    });
    window.addEventListener('mouseup', e => {
      // Seul le clic gauche pose ou sélectionne ; le clic droit annule (voir contextmenu).
      if (drag && !drag.moved && e.target === cv && e.button === 0) click(e);
      if (drag && drag.orbit && drag.moved) noMenu = true;
      if (drag) cv.style.cursor = '';
      drag = null;
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); G.render.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    cv.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (noMenu) { noMenu = false; return; } // on vient de tourner la caméra, pas d'annuler
      state.placing = null; refresh(true);
    });
    cv.addEventListener('mouseleave', () => { state.hover = null; hideTip(); });
  }
  function click(e) {
    const cv = $('map'), r = cv.getBoundingClientRect();
    const t = G.render.screenToTile(e.clientX - r.left, e.clientY - r.top);
    if (state.placing) {
      const res = G.logic.build(state.placing, t.x, t.y);
      if (!res.ok) toast(res.msg, 'bad');
      else if (!e.shiftKey && !G.logistics.canPay(G.logic.buildCost(state.placing))) state.placing = null;
    } else {
      state.sel = G.economy.at(t.x, t.y);
    }
    refresh(true);
  }

  // ---- Vue ----
  function view(a) {
    const R = G.render, cv = $('map'), S = Math.PI / 4;
    if (a === 'in') R.zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 1.25);
    else if (a === 'out') R.zoomAt(cv.clientWidth / 2, cv.clientHeight / 2, 0.8);
    else if (a === 'fit') R.fit();
    else if (!R.rotate) return;
    else if (a === 'left') R.rotate(-S);
    else if (a === 'right') R.rotate(S);
    else if (a === 'up') R.tilt(0.18);
    else if (a === 'down') R.tilt(-0.18);
    else if (a === 'reset') R.resetView();
  }
  function viewControls() {
    const b = (a, i, t, id) => `<button data-action="view:${a}" data-tip="${t}" ${id ? `id="${id}"` : ''}>${i}</button>`;
    const help = `<button data-action="help:cmd" data-tip="Guide des commandes">${ic('aide')}</button>`;
    const html = G.is3D
      ? b('left', ic('rotg'), 'Tourner à gauche (Q ou A, flèche gauche)<br>Ou glisser avec le clic droit') + `<button data-action="view:reset" data-tip="Tête du Colosse. Cliquer pour revenir à la vue d'origine."><span id="view-needle">${ic('aiguille')}</span></button>` + b('right', ic('rotd'), 'Tourner à droite (E, flèche droite)') +
        b('up', ic('hautv'), 'Vue plus haute (flèche haut)') + b('fit', ic('cadre'), 'Recadrer sur la bête (C)') + b('down', ic('basv'), 'Vue plus rasante (flèche bas)') +
        b('out', ic('moins'), 'Dézoomer') + help + b('in', ic('plus'), 'Zoomer')
      : b('out', ic('moins'), 'Dézoomer') + b('fit', ic('cadre'), 'Recadrer sur la bête (C)') + b('in', ic('plus'), 'Zoomer') + help;
    $('center').insertAdjacentHTML('beforeend', `<div id="viewctl" class="${G.is3D ? 'v3' : 'v2'}">${html}</div>`);
  }

  // ---- Infobulles ----
  function mapTip(e, t, dep) {
    let txt = '';
    if (dep) txt = G.info.depositTip(dep);
    else if (G.beast.inBack(t.x, t.y)) {
      const b = G.economy.at(t.x, t.y);
      if (b) txt = G.info.buildingLive(b);
      else {
        const k = [];
        if (G.beast.isHeart(t.x, t.y)) k.push('Cœur du Colosse');
        if (G.beast.isScar(t.x, t.y)) k.push('Cicatrice : rien n\'y tient');
        if (G.beast.isVein(t.x, t.y)) k.push('Veine : production ×1,4');
        if (G.beast.isFlank(t.x, t.y)) k.push('Flanc : grues et harpons');
        if (G.beast.isSpine(t.x, t.y)) k.push('Échine : défenses +1 portée');
        txt = k.join('<br>');
      }
      if (state.placing) { const err = G.logic.placeError(state.placing, t.x, t.y); txt = err || G.info.placePreview(state.placing, t.x, t.y); }
    }
    showTip(e, txt, null, true);
  }
  function tipContent(el) { return el.dataset.tipx ? G.info.tip(el.dataset.tipx) : el.dataset.tip; }
  function showTip(e, html, el, rich) {
    const tip = $('tooltip');
    if (!html) { tip.style.display = 'none'; return; }
    tip.classList.toggle('rich', !!rich || !!(el && el.dataset.tipx));
    tip.innerHTML = html; tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight, W = window.innerWidth, H = window.innerHeight;
    let x = Math.min(W - w - 8, e.clientX + 14), y = Math.min(H - h - 8, e.clientY + 14);
    // Les fiches se placent à côté du panneau, pour ne pas masquer ce qu'on est en train de lire.
    const r = el && el.getBoundingClientRect();
    if (r && el.dataset.tipx) {
      if (el.closest('#right')) { x = $('right').getBoundingClientRect().left - w - 8; y = U.clamp(r.top, 8, H - h - 8); }
      else if (el.closest('#left')) { x = $('left').getBoundingClientRect().right + 8; y = U.clamp(r.top, 8, H - h - 8); }
      else if (el.closest('#topbar')) { x = U.clamp(r.left, 8, W - w - 8); y = r.bottom + 6; }
    }
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { $('tooltip').style.display = 'none'; }

  // Le DOM est réécrit plusieurs fois par seconde : on le fige tant qu'un bouton de souris est enfoncé,
  // sinon l'élément cliqué peut être remplacé entre l'appui et le relâchement et le clic se perd.
  let pointerHeld = false, tipEl = null, mouseX = 0, mouseY = 0;
  function refreshTip() {
    if (!tipEl) return;
    if (tipEl.isConnected) { // chiffres vivants : la fiche se met à jour pendant qu'on la lit
      if (tipEl.dataset.tipx) { const h = tipContent(tipEl); if (tipEl._tipH !== h) { tipEl._tipH = h; $('tooltip').innerHTML = h; } }
      return;
    }
    const el = document.elementFromPoint(mouseX, mouseY);
    const next = el && el.closest('[data-tip],[data-tipx]');
    if (next) { tipEl = next; showTip({ clientX: mouseX, clientY: mouseY }, tipContent(next), next); }
    else { tipEl = null; hideTip(); }
  }

  function bind() {
    document.addEventListener('pointerdown', e => { pointerHeld = e.target.id !== 'map'; });
    window.addEventListener('pointerup', () => { pointerHeld = false; });
    window.addEventListener('blur', () => { pointerHeld = false; });
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      if (el.tagName === 'INPUT') return;
      act(el.dataset.action, el);
    });
    document.addEventListener('change', e => { const el = e.target.closest('input[data-action]'); if (el) act(el.dataset.action, el); });
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip],[data-tipx]');
      tipEl = el || null;
      if (el) showTip(e, tipContent(el), el); else if (e.target.id !== 'map') hideTip();
    });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); G.userPaused = !G.userPaused; }
      if (e.key === 'Escape') { if (state.placing) state.placing = null; else if (state.modal && state.modal !== 'pending' && state.modal !== 'end' && !(state.modal === 'start' && (!G.run || G.run.ended))) closeModal(); else state.sel = null; }
      if (e.key === '1') G.logic.setPace('halte');
      if (e.key === '2') G.logic.setPace('marche');
      if (e.key === '3') G.logic.setPace('galop');
      if (!state.modal) {
        const k = e.key.toLowerCase();
        if (k === 'c') view('fit');
        if (G.render.rotate) {
          const map = { q: 'left', a: 'left', e: 'right', arrowleft: 'left', arrowright: 'right', arrowup: 'up', arrowdown: 'down' };
          if (map[k]) { e.preventDefault(); view(map[k]); }
        }
      }
      refresh(true);
    });
    bindCanvas($('map'));
    viewControls();
  }

  let lastRefresh = 0;
  function refresh(force) {
    const now = performance.now();
    if (!force && (pointerHeld || now - lastRefresh < 250)) return;
    lastRefresh = now;
    if (!G.run) return;
    topbar(); resources(); tabs(); panel(); selection();
    refreshTip();
    pendingModal();
    $('botbar').classList.toggle('hidden', !(G.bot && G.bot.active));
  }

  return { state, speedMult, refresh, bind, toast, costText, openModal, closeModal, confirmModal, startModal, endModal, cinematic };
})();
