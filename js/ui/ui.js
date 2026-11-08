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
  function costHtml(c) {
    const res = G.run.res || {};
    return Object.keys(c).map(r => {
      const ok = (res[r] || 0) >= c[r];
      return `<span class="cost ${ok ? '' : 'miss'}" data-tip="${G.RESOURCES[r].name} : ${U.fmt(res[r] || 0)} en stock">${resIc(r)}${U.fmt(c[r], 0)}</span>`;
    }).join('');
  }
  function bar(v, max, cls) { return `<div class="bar ${cls || ''}"><i style="width:${U.clamp(v / max * 100, 0, 100)}%"></i></div>`; }
  function setHTML(el, html) { if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

  // ---- Barre du haut ----
  function topbar() {
    const run = G.run, reg = G.REGIONS[run.region], node = G.route.current(run);
    const B = G.BEAST, vm = G.beast.vigMax();
    const paces = Object.keys(B.paces).map(p => `<button class="pace ${run.pace === p ? 'on' : ''}" data-action="pace:${p}" data-tip="${B.paces[p].name} : vitesse ${B.paces[p].speed} case/s, faim ×${(B.paces[p].drain / B.paces.marche.drain).toFixed(1)}">${ic(p)}<span>${B.paces[p].name}</span></button>`).join('');
    const w = run.wave;
    let wave = '';
    if (G.defense.wavesOn()) {
      if (w.active) wave = `<div class="chip bad">${ic('vague')} Vague ${w.n} : ${run.enemies.length} parasites</div>`;
      else if (G.NODES[node.type].oasis) wave = `<div class="chip">${ic('vague')} Oasis : pas d'attaque</div>`;
      else wave = `<div class="chip ${w.side ? 'warn' : ''}" data-tip="Prochaine vague">${ic('vague')} ${w.side ? 'Côté ' + G.defense.SIDES[w.side] + ' ' : ''}${U.fmtTime(w.next - run.time)}</div>`;
    }
    const shakeLeft = B.shakeCd - (run.time - run.shakeAt);
    const stepPct = G.route.atPass(run) ? 100 : run.stepDist / G.STEP_LEN * 100;
    const speeds = `<button class="spd ${G.userPaused ? 'on' : ''}" data-action="gamePause" data-tip="Pause (Espace)">${ic(G.userPaused ? 'play' : 'halte')}</button>` +
      SPEEDS.map(s => `<button class="spd ${!G.userPaused && state.speed === s ? 'on' : ''}" data-action="speed:${s}">×${s}</button>`).join('');
    setHTML($('topbar'), `
      <div class="brand"><b>Dérive</b><small>${reg.name} · ${reg.age}</small></div>
      <div class="tb-block" data-tip="Étape : ${G.NODES[node.type].name}. ${G.NODES[node.type].desc}">
        <div class="lbl">${ic(G.NODES[node.type].icon)} ${G.NODES[node.type].name}</div>${bar(stepPct, 100, 'step')}
      </div>
      <div class="paces">${paces}</div>
      <div class="tb-block" data-tip="Satiété : la bête mange le fourrage livré à la Nuque. Sous 25 %, elle ralentit ; à 0, elle s'arrête et s'affaiblit.">
        <div class="lbl">${ic('fourrage')} Satiété ${Math.round(run.satiete)} %</div>${bar(run.satiete, 100, run.satiete < 25 ? 'bad' : 'food')}
      </div>
      <div class="tb-block" data-tip="Vigueur : les points de vie du Colosse. À 0, la marche s'achève.">
        <div class="lbl">${ic('coeur')} Vigueur ${Math.round(run.vigueur)}/${vm}</div>${bar(run.vigueur, vm, 'vig')}
      </div>
      <div class="tb-block" data-tip="Croissance : bien nourrie (satiété ≥ 70 %), la bête grandit. Une vertèbre = une rangée de cases en plus.">
        <div class="lbl">${ic('croissance')} ${run.L} vertèbres</div>${bar(run.L >= B.maxLen ? 1 : run.growth, run.L >= B.maxLen ? 1 : G.beast.growthCost(), 'grow')}
      </div>
      <div class="chip" data-tip="Habitants / emplois. Si les emplois dépassent les habitants, tout ralentit.">${ic('pop')} ${U.fmt(run._pop || 0, 0)} / ${U.fmt(run._jobs || 0, 0)}</div>
      ${wave}
      <button class="btn shake" data-action="shake" ${shakeLeft > 0 ? 'disabled' : ''} data-tip="S'ébrouer : la bête se secoue. Blesse tous les parasites (60), mais les cargaisons en transit tombent et les bâtiments sont un peu abîmés.">${ic('shake')} ${shakeLeft > 0 ? U.fmtTime(shakeLeft) : "S'ébrouer"}</button>
      <div class="speeds">${speeds}</div>
      <button class="btn icon" data-action="settings" data-tip="Réglages">${ic('reglages')}</button>`);
  }

  // ---- Ressources ----
  function resources() {
    const run = G.run, res = run.res || {};
    const rows = G.RES_ORDER.filter(r => G.RESOURCES[r].region <= run.region || (res[r] || 0) > 0).map(r => {
      const f = G.flow[r] || { p: 0, c: 0 }, net = f.p - f.c;
      return `<div class="res" data-tip="${G.RESOURCES[r].name} : production ${U.fmtFlow(f.p)}, consommation ${U.fmtFlow(f.c)}">
        ${resIc(r)}<span class="n">${G.RESOURCES[r].name}</span><b>${U.fmt(res[r] || 0)}</b><small class="${net < -0.005 ? 'neg' : net > 0.005 ? 'pos' : ''}">${Math.abs(net) < 0.005 ? '' : U.fmtRate(net)}</small></div>`;
    }).join('');
    setHTML($('resources'), `<h3>Ressources</h3>${rows}`);
    const adv = G.logic.advice();
    setHTML($('hint'), adv ? `<div class="advice"><b>Conseil</b>${adv}</div>` : '');
  }

  // ---- Onglets ----
  const TABS = [['build', 'Construire', 'grue'], ['tech', 'Savoir', 'recits'], ['route', 'Route', 'route'], ['meta', 'Lignée', 'memoire']];
  function tabs() {
    const pend = G.run.route.next === null && G.route.options(G.run).length > 1;
    setHTML($('tabs'), TABS.map(([id, n, i]) => `<button class="tab ${state.tab === id ? 'on' : ''}" data-action="tab:${id}">${ic(i)}<span>${n}</span>${id === 'route' && pend ? '<em class="dot"></em>' : ''}</button>`).join(''));
  }

  function buildPanel() {
    const run = G.run;
    let h = '';
    if (state.placing) h += `<div class="placing">Placement : <b>${G.BUILDINGS[state.placing].name}</b> <button class="btn sm" data-action="cancelPlace">Annuler (Échap)</button></div>`;
    for (const cat of G.BUILD_CATEGORIES) {
      const ids = Object.keys(G.BUILDINGS).filter(id => G.BUILDINGS[id].cat === cat.id && G.logic.unlocked(id));
      if (!ids.length) continue;
      h += `<h4>${cat.name}</h4><div class="cards">`;
      for (const id of ids) {
        const d = G.BUILDINGS[id], c = G.logic.buildCost(id), ok = G.logistics.canPay(c);
        h += `<button class="card ${state.placing === id ? 'on' : ''} ${ok ? '' : 'poor'}" data-action="place:${id}" data-tip="${d.desc}">
          <span class="ci cat-${d.cat}">${ic(id)}</span><span class="cn">${d.name}${d.flank ? ' <em>flanc</em>' : ''}</span>
          <span class="cc">${costHtml(c)}</span></button>`;
      }
      h += '</div>';
    }
    const locked = Object.keys(G.BUILDINGS).filter(id => G.BUILDINGS[id].cat !== 'base' && !G.logic.unlocked(id) && !(G.BUILDINGS[id].military && !G.defense.wavesOn()));
    if (locked.length) h += `<p class="muted small">À découvrir : ${locked.map(id => G.BUILDINGS[id].name).join(', ')}.</p>`;
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
        h += `<div class="tech ${st} ${t.key ? 'key' : ''}">
          <div><b>${t.name}</b><p>${t.desc}${req.length ? '<br><small>Demande : ' + req.join(', ') + '</small>' : ''}${t.region > run.region ? '<br><small>Région suivante</small>' : ''}</p></div>
          ${st === 'done' ? '<span class="ok">✔</span>' : `<button class="btn sm" data-action="research:${id}" ${st === 'ready' ? '' : 'disabled'}>${resIc('recits')}${t.cost}</button>`}
        </div>`;
      }
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
      return `<button class="rn ${cur ? 'cur' : ''} ${past ? 'past' : ''} ${opt ? 'opt' : ''} ${chosen ? 'chosen' : ''}" ${opt ? `data-action="route:${i}"` : ''} data-tip="${def.name} : ${def.desc}">${ic(def.icon)}<span>${def.name}</span></button>`;
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
    const fn = { build: buildPanel, tech: techPanel, route: routePanel, meta: metaPanel }[state.tab];
    setHTML($('panel'), fn());
  }

  // ---- Sélection ----
  function selection() {
    const b = state.sel, el = $('selection');
    if (!b || !G.run.buildings.includes(b)) { state.sel = null; el.classList.add('hidden'); setHTML(el, ''); return; }
    el.classList.remove('hidden');
    const d = G.BUILDINGS[b.type], run = G.run;
    const stNames = { attente: 'Attend ses intrants', plein: 'Stock plein (porteurs ou grenier ?)', faim: 'Manque de vivres', munitions: 'Manque de munitions', vide: 'Rien à portée', pause: 'En pause', ruine: 'En ruine' };
    let h = `<div class="selh"><span class="ci cat-${d.cat}">${ic(b.type)}</span><div><b>${d.name}</b> <small>niv. ${b.level}</small><br><small class="muted">${d.desc}</small></div><button class="x" data-action="deselect">×</button></div>`;
    const tags = [];
    if (G.beast.isVein(b.x, b.y)) tags.push('Sur une veine : production ×1,4');
    if (G.beast.isSpine(b.x, b.y)) tags.push('Sur l\'échine');
    if (G.beast.isFlank(b.x, b.y)) tags.push('Flanc');
    if (tags.length) h += `<p class="tags">${tags.map(t => `<span>${t}</span>`).join('')}</p>`;
    if (b._st && stNames[b._st]) h += `<p class="status st-${b._st}">${stNames[b._st]}</p>`;
    if (d.jobs) h += `<p class="small">Main-d'œuvre : ${Math.round((b._eff || 0) * 100)} %</p>`;
    const mh = G.logic.maxHp(b);
    h += `<div class="small">Solidité ${Math.round(b.hp)}/${Math.round(mh)}</div>${bar(b.hp, mh, 'vig')}`;
    const stock = (title, o) => {
      const ks = Object.keys(o).filter(r => o[r] > 0.05);
      return ks.length ? `<div class="stock"><small>${title}</small>${ks.map(r => `<span>${resIc(r)}${U.fmt(o[r])}</span>`).join('')}</div>` : '';
    };
    h += stock('Entrée', b.inp) + stock('Sortie', b.out) + (b.store ? stock('Réserve', b.store) : '');
    if (d.harvest) {
      const rs = [];
      for (const k in G.DEPOSITS) { const dp = G.DEPOSITS[k]; if (dp.region <= run.region && !dp.harpoonOnly && !rs.includes(dp.res)) rs.push(dp.res); }
      h += `<div class="filter"><small>Cible</small><button class="btn sm ${!b.filter ? 'on' : ''}" data-action="filter:" data-tip="Automatique : ce qui manque le plus">Auto</button>` +
        rs.map(r => `<button class="btn sm ${b.filter === r ? 'on' : ''}" data-action="filter:${r}" data-tip="${G.RESOURCES[r].name} seulement">${resIc(r)}</button>`).join('') + '</div>';
    }
    if (d.housing) h += `<p class="small">Loge ${U.fmt(G.economy.housing(b) * (b.type === 'tente' ? (b._fed === undefined ? 1 : b._fed) : 1), 0)} habitants</p>`;
    if (b.type === 'nuque') h += `<p class="small">Fourrage prêt pour la bête : ${U.fmt(b.inp.fourrage || 0)} / 40</p>`;
    h += `<p class="small muted">Porteurs ${G.logistics.busy(b)}/${G.logistics.porters(b)} occupés · charge ${U.fmt(G.logistics.charge(b))}</p>`;
    h += '<div class="acts">';
    if (b.ruined) h += `<button class="btn primary" data-action="repair">Réparer ${costHtml(G.logic.repairCost(b))}</button>`;
    else {
      const le = G.logic.levelError(b);
      if (!le) h += `<button class="btn primary" data-action="levelUp" ${G.logistics.canPay(G.logic.levelCost(b)) ? '' : 'disabled'}>Niveau ${b.level + 1} ${costHtml(G.logic.levelCost(b))}</button>`;
      else if (d.cost) h += `<p class="small muted">${le}</p>`;
      if (b.type !== 'nuque') {
        h += `<button class="btn" data-action="togglePause">${b.paused ? 'Reprendre' : 'Pause'}</button>`;
        h += `<button class="btn" data-action="prio">Priorité : ${['basse', 'normale', 'haute'][b.prio]}</button>`;
      }
    }
    if (b.type !== 'nuque') h += `<button class="btn danger" data-action="demolish">Démolir</button>`;
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
    const src = p.kind === 'pact' ? G.PACTS : G.OFFERINGS;
    const title = p.kind === 'pact' ? 'Un pacte avec la route' : 'Une offrande du nid';
    const intro = p.kind === 'pact' ? 'Choisissez un pacte. Il durera toute la marche.' : 'Le nid est vidé. Choisissez une offrande.';
    openModal(`<h2>${title}</h2><p class="muted">${intro}</p><div class="choices">${p.options.map((id, i) =>
      `<button class="choice ${src[id].risky ? 'risky' : ''}" data-action="choose:${i}"><b>${src[id].name}</b><span>${src[id].desc}</span>${src[id].risky ? '<em>risqué</em>' : ''}</button>`).join('')}</div>`, { kind: 'pending' });
  }

  function startModal() {
    const meta = G.meta;
    const rigs = G.RIGUEUR.map((r, i) => `<button class="choice ${i > meta.maxRig ? 'locked' : ''}" ${i > meta.maxRig ? 'disabled' : `data-action="newGame:${i}"`}>
      <b>${r.name}</b><span>${r.desc}</span><em>Mémoire ×${String(r.mem).replace('.', ',')}${i > meta.maxRig ? ' · franchissez une passe pour débloquer' : ''}</em></button>`).join('');
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
      <p class="big">${ic('memoire')} +${run.memGain} points de mémoire</p>
      <button class="btn primary wide" data-action="startScreen">Trouver une nouvelle bête</button>`, { kind: 'end' });
  }

  function settingsModal() {
    const s = G.meta.settings;
    openModal(`<h2>Réglages</h2>
      <label class="row"><input type="checkbox" data-action="setLore" ${s.lore ? 'checked' : ''}> Répliques de Tic</label>
      <label class="row"><input type="checkbox" data-action="setRate" ${s.rateUnit === 'sec' ? 'checked' : ''}> Débits par seconde (sinon par minute)</label>
      <div class="acts">
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
      case 'choose': G.logic.choosePending(+arg); closeModal(); break;
      case 'levelUp': if (state.sel) G.logic.levelUp(state.sel); break;
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
    cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, moved: false }; });
    window.addEventListener('mousemove', e => {
      const r = cv.getBoundingClientRect();
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (drag.moved || Math.abs(dx) + Math.abs(dy) > 5) { drag.moved = true; G.render.pan(dx, dy); drag.x = e.clientX; drag.y = e.clientY; }
      }
      if (e.target === cv) {
        const t = G.render.screenToTile(e.clientX - r.left, e.clientY - r.top);
        state.hover = t;
        let hd = null, best = 1.2;
        if (!G.beast.inBack(t.x, t.y)) for (const d of G.run.deposits) { const dd = Math.hypot(d.x - t.wx, d.y - t.wy); if (dd < best) { best = dd; hd = d; } }
        state.hoverDep = hd ? hd.did : null;
        mapTip(e, t, hd);
      } else state.hover = null;
    });
    window.addEventListener('mouseup', e => {
      if (drag && !drag.moved && e.target === cv) click(e);
      drag = null;
    });
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); G.render.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); state.placing = null; refresh(true); });
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

  // ---- Infobulles ----
  function mapTip(e, t, dep) {
    let txt = '';
    if (dep) txt = `<b>${G.DEPOSITS[dep.type].name}</b><br>${G.RESOURCES[dep.res].name} : ${U.fmt(dep.amt)}${G.DEPOSITS[dep.type].harpoonOnly ? '<br><small>Harpon seulement</small>' : ''}`;
    else if (G.beast.inBack(t.x, t.y)) {
      const b = G.economy.at(t.x, t.y);
      if (b) txt = `<b>${G.BUILDINGS[b.type].name}</b> niv. ${b.level}`;
      else {
        const k = [];
        if (G.beast.isHeart(t.x, t.y)) k.push('Cœur du Colosse');
        if (G.beast.isVein(t.x, t.y)) k.push('Veine : production ×1,4');
        if (G.beast.isFlank(t.x, t.y)) k.push('Flanc : grues et harpons');
        if (G.beast.isSpine(t.x, t.y)) k.push('Échine : défenses +1 portée');
        txt = k.join('<br>');
      }
      if (state.placing) { const err = G.logic.placeError(state.placing, t.x, t.y); if (err) txt = err; }
    }
    showTip(e, txt);
  }
  function showTip(e, html) {
    const tip = $('tooltip');
    if (!html) { tip.style.display = 'none'; return; }
    tip.innerHTML = html; tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px';
    tip.style.top = Math.min(window.innerHeight - h - 8, e.clientY + 14) + 'px';
  }
  function hideTip() { $('tooltip').style.display = 'none'; }

  function bind() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      if (el.tagName === 'INPUT') return;
      act(el.dataset.action, el);
    });
    document.addEventListener('change', e => { const el = e.target.closest('input[data-action]'); if (el) act(el.dataset.action, el); });
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (el) showTip(e, el.dataset.tip); else if (e.target.id !== 'map') hideTip();
    });
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); G.userPaused = !G.userPaused; }
      if (e.key === 'Escape') { if (state.placing) state.placing = null; else if (state.modal && state.modal !== 'pending' && state.modal !== 'end' && !(state.modal === 'start' && (!G.run || G.run.ended))) closeModal(); else state.sel = null; }
      if (e.key === '1') G.logic.setPace('halte');
      if (e.key === '2') G.logic.setPace('marche');
      if (e.key === '3') G.logic.setPace('galop');
      refresh(true);
    });
    bindCanvas($('map'));
  }

  let lastRefresh = 0;
  function refresh(force) {
    const now = performance.now();
    if (!force && now - lastRefresh < 250) return;
    lastRefresh = now;
    if (!G.run) return;
    topbar(); resources(); tabs(); panel(); selection();
    pendingModal();
    $('botbar').classList.toggle('hidden', !(G.bot && G.bot.active));
  }

  return { state, speedMult, refresh, bind, toast, costText, openModal, closeModal, confirmModal, startModal, endModal, cinematic };
})();
