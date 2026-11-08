// Fiches d'information : ce que fait un bâtiment, d'où vient une ressource, pourquoi la bête a faim, où la chaîne coince.
// Les chiffres sont lus dans le moteur (G.economy, G.beast, G.logistics, G.logic) pour que l'affichage ne diverge jamais du jeu.
G.info = (function () {
  const U = G.util;
  const ic = (id, c) => G.icon(id, c);
  const resIc = r => `<span class="ri" style="color:${G.RESOURCES[r].color}">${ic(r)}</span>`;
  const rName = r => G.RESOURCES[r].name;
  const flow = v => U.fmtFlow(v);
  const num = v => flow(v).replace(/\/(min|s)$/, '');
  const unit = () => (G.meta.settings.rateUnit === 'sec' ? '/s' : '/min');
  const fr = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const pct = v => Math.round(v * 100) + ' %';
  const signed = (v, u) => (v >= 0 ? '+' : '−') + fr(Math.abs(v)) + (u || '');

  // ---- Chiffres d'un bâtiment à un niveau donné (x, y : emplacement, pour la veine et l'échine ; cad : cadence) ----
  function sheet(type, level, x, y, cad) {
    const d = G.BUILDINGS[type], E = G.economy, b = { type, level };
    const placed = x !== undefined;
    const vein = placed && G.beast.isVein(x, y) ? 1.4 : 1;
    const lm = E.lm(b), k = lm * vein * (1 + E.cadBonus() * (cad || 0));
    const s = { d, level, lm, vein, inp: [], out: [], ammo: [], chips: [] };
    if (d.recipe) {
      for (const r in d.recipe.in) s.inp.push([r, d.recipe.in[r] * lm]);
      for (const r in d.recipe.out) s.out.push([r, d.recipe.out[r] * k * E.craftMult(r)]);
    }
    if (d.consume && type !== 'nuque') for (const r in d.consume) s.inp.push([r, d.consume[r] * lm * E.useMult(r)]);
    if (d.harvest) { s.harvest = d.harvest.rate * k * E.harvestMult(); s.reach = E.reachOf(b); }
    if (d.harpoon) {
      s.shot = d.harpoon.take * k * E.harvestMult(); s.cd = d.harpoon.cd; s.reach = E.reachOf(b);
      s.harvest = s.shot / s.cd;
      for (const r in d.harpoon.ammo) s.inp.push([r, d.harpoon.ammo[r] * lm / s.cd]);
    }
    if (d.tower) {
      s.dmg = d.tower.dmg * (1 + G.LEVELS.dmg * (level - 1)) * (1 + (G.M.dmg || 0));
      s.towerCd = d.tower.cd;
      s.reach = d.tower.range + (placed && G.beast.isSpine(x, y) ? 1 : 0) + 0.3 * (level - 1);
      for (const r in d.tower.ammo) s.ammo.push([r, d.tower.ammo[r] / d.tower.cd]);
    }
    if (d.squad) { s.squad = d.squad + level - 1; s.reach = G.SOLDIER.aggro; }
    s.jobs = E.jobs(b);
    s.housing = E.housing(b);
    s.storage = d.storage ? E.storeCap(b) : 0;
    s.hp = G.logic.maxHp(b);
    s.porters = G.logistics.porters(b);
    s.charge = G.logistics.charge(b);
    return s;
  }

  // ---- D'où vient une ressource, à quoi elle sert ----
  function makers(r) { return Object.keys(G.BUILDINGS).filter(id => { const d = G.BUILDINGS[id]; return d.recipe && d.recipe.out[r]; }); }
  function depositsOf(r) { return Object.keys(G.DEPOSITS).filter(k => G.DEPOSITS[k].res === r); }
  function consumers(r) {
    return Object.keys(G.BUILDINGS).filter(id => {
      const d = G.BUILDINGS[id];
      return (d.recipe && d.recipe.in[r]) || (d.consume && d.consume[r]) || (d.harpoon && d.harpoon.ammo[r]) || (d.tower && d.tower.ammo[r]);
    });
  }
  function builtWith(r) { return Object.keys(G.BUILDINGS).filter(id => G.BUILDINGS[id].cost && G.BUILDINGS[id].cost[r]); }
  const bNames = ids => ids.map(id => G.BUILDINGS[id].name).join(', ');
  // Combien de producteurs de niveau 1 il faut pour fournir ce débit.
  function ratioHint(r, v) {
    const m = makers(r), maker = m.find(id => G.logic.unlocked(id)) || m[0];
    if (maker) { const o = sheet(maker, 1).out.find(x => x[0] === r); return fr(v / o[1]) + ' × ' + G.BUILDINGS[maker].name; }
    const deps = depositsOf(r);
    if (!deps.length) return '';
    const who = deps.every(k => G.DEPOSITS[k].harpoonOnly) ? 'harpon' : 'grue';
    return fr(v / sheet(who, 1).harvest) + ' × ' + G.BUILDINGS[who].name;
  }

  // ---- Morceaux de fiche ----
  const sec = (t, body) => body ? `<div class="tt-s"><small>${t}</small>${body}</div>` : '';
  const row = (r, right, extra) => `<div class="tt-r">${resIc(r)}<span>${rName(r)}</span><b>${right}</b>${extra ? `<em>${extra}</em>` : ''}</div>`;
  const chips = list => list.length ? `<div class="tt-c">${list.map(x => `<span>${x}</span>`).join('')}</div>` : '';
  function netOf(r) { const f = G.flow[r] || { p: 0, c: 0 }; return f.p - f.c; }

  function statChips(s) {
    const o = [];
    if (s.jobs) o.push(`${fr(s.jobs)} emploi${s.jobs > 1 ? 's' : ''}`);
    if (s.housing) o.push(`loge ${fr(s.housing)}`);
    if (s.reach) o.push(`portée ${fr(s.reach)}`);
    if (s.dmg) o.push(`${fr(s.dmg)} dégâts / ${fr(s.towerCd)} s`);
    if (s.squad) o.push(`${s.squad} soldats`);
    if (s.storage) o.push(`stocke ${fr(s.storage)} par ressource`);
    o.push(`solidité ${Math.round(s.hp)}`);
    o.push(`${s.porters} porteur${s.porters > 1 ? 's' : ''} × ${fr(s.charge)}`);
    return o;
  }

  // Ligne compacte d'une carte de construction.
  function cardFlow(type) {
    const s = sheet(type, 1), d = s.d;
    const list = l => l.map(([r, v]) => `<span>${resIc(r)}${num(v)}</span>`).join('');
    if (d.recipe) return `${list(s.inp)}<i>→</i>${list(s.out)}`;
    if (d.harpoon) return `<span>${fr(s.shot)} / ${s.cd} s</span>${list(s.inp) ? '<i>·</i>' + list(s.inp) : ''}`;
    if (d.harvest) return `<span>${num(s.harvest)}${unit()}</span><i>·</i><span>portée ${fr(s.reach)}</span>`;
    if (d.tower) return `<span>${fr(s.dmg)} dégâts</span><i>·</i><span>portée ${fr(s.reach)}</span>`;
    if (d.squad) return `<span>${s.squad} soldats</span>${list(s.inp) ? '<i>·</i>' + list(s.inp) : ''}`;
    if (d.housing) return `<span>${ic('pop')}+${fr(s.housing)}</span>${list(s.inp) ? '<i>·</i>' + list(s.inp) : ''}`;
    if (s.storage) return `<span>stocke ${fr(s.storage)}</span>`;
    if (d.wall) return `<span>solidité ${Math.round(s.hp)}</span>`;
    return '';
  }

  function placementText(d) {
    const t = [d.flank ? 'Uniquement sur un flanc (le bord du dos).' : 'Partout sur le dos, sauf le cœur et les cicatrices.'];
    if (d.recipe || d.harvest || d.harpoon) t.push('Sur une veine : sorties ×1,4 (les entrées ne changent pas).');
    if (d.tower) t.push("Sur l'échine, la ligne du milieu : portée +1.");
    return t.join(' ');
  }

  function buildingTip(type) {
    const d = G.BUILDINGS[type], s = sheet(type, 1), run = G.run, open = G.logic.unlocked(type), owned = G.logic.count(type);
    const flav = G.FLAVOR.b[type];
    let h = `<div class="tt-h"><span class="ci cat-${d.cat}">${ic(type)}</span><div><b>${d.name}</b>${owned ? ` <small>${owned} posé${owned > 1 ? 's' : ''}</small>` : ''}<p>${d.desc}</p></div></div>`;
    if (flav) h += `<p class="tt-f">${flav}</p>`;
    if (!open) {
      const why = [];
      if (d.tech && !run.techs.includes(d.tech)) why.push(`Technologie « ${G.TECHS[d.tech].name} » (${G.TECHS[d.tech].cost} récits)`);
      if (d.region && run.region < d.region) why.push(`Région : ${G.REGIONS[d.region].name}`);
      h += `<div class="tt-lock">À découvrir : ${why.join(' · ')}</div>`;
    }
    if (d.cost) {
      const c = G.logic.buildCost(type), res = run.res || {};
      h += sec(`Coût de construction${owned ? ' <i>(+6 % par exemplaire posé)</i>' : ''}`, Object.keys(c).map(r => {
        const have = res[r] || 0, ok = have >= c[r];
        return `<div class="tt-r ${ok ? '' : 'miss'}">${resIc(r)}<span>${rName(r)}</span><b>${U.fmt(c[r], 0)}</b><em>${U.fmt(have)} en stock</em></div>`;
      }).join(''));
    }
    h += flowSections(s, true);
    if (d.cost) {
      const lc = G.logic.levelCost({ type, level: 1 });
      h += sec('Monter de niveau', `<p class="tt-p">Niveau N = entrées et sorties ×N, sans changer le ratio. Maximum ici : niveau ${G.logic.maxLevel()}.</p><div class="tt-c"><span>Niveau 2 :</span>${Object.keys(lc).map(r => `<span>${resIc(r)}${U.fmt(lc[r], 0)}</span>`).join('')}</div>`);
    }
    h += sec('Caractéristiques', chips(statChips(s)));
    h += sec('Placement', `<p class="tt-p">${placementText(d)}</p>`);
    return h;
  }

  function flowSections(s, hints) {
    let h = '';
    if (s.inp.length) h += sec(`Consomme <i>à plein régime</i>`, s.inp.map(([r, v]) => {
      const hint = hints ? ratioHint(r, v) : '';
      return row(r, flow(v), hint ? 'fourni par ' + hint : '');
    }).join(''));
    if (s.out.length) h += sec('Produit', s.out.map(([r, v]) => {
      const u = hints ? consumers(r).filter(id => G.logic.unlocked(id)) : [];
      return row(r, flow(v), u.length ? 'pour ' + bNames(u.slice(0, 3)) : '');
    }).join(''));
    if (s.d.harpoon) h += sec('Récolte', `<p class="tt-p">${fr(s.shot)} unités par tir, un tir toutes les ${s.cd} s (${flow(s.harvest)}). Seul moyen de prendre les troupeaux.</p>`);
    else if (s.d.harvest) h += sec('Récolte', `<p class="tt-p">${flow(s.harvest)} dans un gisement à portée. Choisit ce qui manque le plus, ou la ressource que vous réglez.</p>`);
    if (s.ammo.length) h += sec('Munitions <i>quand il tire</i>', s.ammo.map(([r, v]) => row(r, flow(v))).join(''));
    return h;
  }

  function resTip(r) {
    const run = G.run, def = G.RESOURCES[r], stock = (run.res || {})[r] || 0, f = G.flow[r] || { p: 0, c: 0 }, net = f.p - f.c;
    let inWork = 0, onRoad = 0;
    for (const b of run.buildings) inWork += b.inp[r] || 0;
    for (const c of run.transit) if (c.res === r) onRoad += c.amt;
    let h = `<div class="tt-h"><span class="ci" style="background:${def.color}">${ic(r)}</span><div><b>${def.name}</b><p>${U.fmt(stock)} disponibles</p></div></div>`;
    if (G.FLAVOR.r[r]) h += `<p class="tt-f">${G.FLAVOR.r[r]}</p>`;
    let time = '';
    if (net < -0.005 && stock > 0) time = `Épuisé dans ${U.fmtTime(stock / -net)}`;
    h += sec('Flux', chips([`produit ${flow(f.p)}`, `consommé ${flow(f.c)}`, `net ${U.fmtRate(net)}`].concat(time ? [time] : [])));
    if (!def.abstract) h += sec('Où est-ce ?', chips([`${U.fmt(stock)} en réserve et en sortie`, `${U.fmt(inWork)} dans les ateliers`, `${U.fmt(onRoad)} à dos de porteur`]));
    const deps = depositsOf(r).map(k => {
      const d = G.DEPOSITS[k];
      return d.name + (d.harpoonOnly ? ' (harpon)' : '') + (d.region > run.region ? ' (plus loin)' : '');
    });
    const m = makers(r), cons = consumers(r), built = builtWith(r);
    if (deps.length) h += sec('Gisements', `<p class="tt-p">${deps.join(', ')}</p>`);
    if (m.length) h += sec('Fabriqué par', `<p class="tt-p">${bNames(m)}</p>`);
    if (cons.length) h += sec('Consommé par', `<p class="tt-p">${bNames(cons)}</p>`);
    if (built.length) h += sec('Sert à construire', `<p class="tt-p">${bNames(built)}</p>`);
    const pass = G.logic.passReq();
    if (pass.res[r]) h += sec('Pour passer', `<p class="tt-p">${pass.name} : ${pass.res[r]} requis.</p>`);
    return h;
  }

  // ---- Barre du haut ----
  function satTip() {
    const run = G.run, B = G.BEAST, d = G.beast.drain(), nq = run.buildings.find(b => b.type === 'nuque');
    const lines = [`perd ${flow(d)} (points)`, `besoin ${flow(d / B.fourragePts)} de fourrage`, `${U.fmt((nq && nq.inp.fourrage) || 0)} prêts à la Nuque`];
    const toHungry = run.satiete > 25 && d > 0 ? `<p class="tt-p">Sans livraison, elle a faim dans ${U.fmtTime((run.satiete - 25) / d)}.</p>` : '';
    return `<b>Satiété ${Math.round(run.satiete)} %</b>${chips(lines)}${toHungry}<p class="tt-p">Sous 25 % elle marche à moitié. À 0 elle s'arrête et perd de la vigueur. Au-dessus de 40 % elle guérit. À partir de 70 % le fourrage mangé la fait grandir. Elle mange au plus ${flow(1.5)}.</p>`;
  }
  function vigTip() {
    const run = G.run, node = G.route.current(run), reg = run.satiete > 40 ? G.beast.pace().regen * (G.NODES[node.type].oasis ? 4 : 1) : 0;
    const on = run.enemies.filter(e => G.beast.inBack(Math.floor(e.x), Math.floor(e.y)));
    let loss = 0;
    for (const e of on) loss += G.ENEMIES[e.type].drain * Math.max(0.1, 1 + (G.M.tickDrain || 0));
    if (run.satiete <= 0) loss += 0.25;
    return `<b>Vigueur ${Math.round(run.vigueur)} / ${G.beast.vigMax()}</b>${chips([`guérit ${flow(reg)}`, `perd ${flow(loss)}`, `${on.length} parasites sur le dos`])}<p class="tt-p">Les points de vie du Colosse. À 0, la marche s'achève. Elle guérit quand elle est rassasiée, surtout à la halte et dans les oasis.</p>`;
  }
  function growTip() {
    const run = G.run, B = G.BEAST, c = G.beast.growthCost();
    return `<b>${run.L} vertèbres sur ${B.maxLen}</b>${chips([`${U.fmt(run.growth)} / ${U.fmt(c)} vers la prochaine`, `bonus ${pct(G.M.growth || 0)}`])}<p class="tt-p">Chaque unité de fourrage mangée quand la satiété est à 70 % ou plus compte. Une vertèbre ajoute une rangée au dos et coûte 22 % de plus que la précédente.</p>`;
  }
  function popTip() {
    const run = G.run, wf = run._wf === undefined ? 1 : run._wf;
    const hungry = run.buildings.filter(b => b.type === 'tente' && b._fed !== undefined && b._fed < 1).length;
    return `<b>Main-d'œuvre ${pct(wf)}</b>${chips([`${U.fmt(run._pop || 0, 0)} habitants`, `${U.fmt(run._jobs || 0, 0)} emplois`, `${hungry} tente${hungry > 1 ? 's' : ''} mal nourrie${hungry > 1 ? 's' : ''}`])}<p class="tt-p">Sous 100 %, tous les bâtiments qui emploient tournent moins vite, et perdent leur cadence. Montez les tentes de niveau : elles logent ×N et mangent ×N.</p>`;
  }
  function waveTip() {
    const run = G.run, w = run.wave, n = w.n + 1;
    const count = G.defense.waveSize(n, run);
    const hp = G.ENEMIES.tique.hp * G.defense.waveHp(n, run);
    if (w.active) return `<b>Vague ${w.n}</b>${chips([`${run.enemies.length} parasites restants`])}<p class="tt-p">Au bout de ${G.WAVES.flee} s, les survivants sautent du dos en emportant 10 % de la réserve de la Nuque.</p>`;
    return `<b>Prochaine vague : la ${n}ᵉ</b>${chips([`${count} tiques${n % 5 === 0 ? ' + une Reine' : ''}`, `${Math.round(hp)} PV chacune`, `butin ${Math.round(8 + n * 4)} os, ${Math.round(5 + n * 3)} viande`])}<p class="tt-p">Le côté d'attaque s'annonce ${G.WAVES.warn} s avant. Pas d'attaque dans les oasis.</p>`;
  }
  function paceTip(p) {
    const P = G.BEAST.paces[p], M = G.M, spd = P.speed * Math.max(0.2, 1 + M.speed);
    return `<b>${P.name}</b>${chips([`vitesse ${fr(spd)} case/s`, `faim ${flow(P.drain * Math.max(0.2, 1 + M.drain))}`, `guérit ${flow(P.regen)}`])}<p class="tt-p">${p === 'halte' ? 'Aucun gisement ne défile. La bête se repose.' : p === 'galop' ? 'Beaucoup de gisements, mais ils passent vite et elle mange énormément.' : "L'allure équilibrée."} Raccourcis 1, 2, 3.</p>`;
  }
  function stepTip() {
    const run = G.run, node = G.NODES[G.route.current(run).type], sp = G.beast.speed();
    const left = Math.max(0, G.STEP_LEN - run.stepDist);
    return `<b>${node.name}</b><p class="tt-p">${node.desc}</p>${chips([`${U.fmt(left)} cases restantes`, sp > 0 ? `≈ ${U.fmtTime(left / sp)}` : 'à la halte'])}${depositMults(node)}`;
  }
  function depositMults(node) {
    const m = node.mult ? Object.keys(node.mult).map(k => `${G.DEPOSITS[k].name} ×${fr(node.mult[k])}`) : [];
    if (node.dense) m.push(`Densité ×${fr(node.dense)}`);
    return chips(m);
  }
  function nodeTip(type) { const n = G.NODES[type]; return `<b>${n.name}</b><p class="tt-p">${n.desc}</p>${depositMults(n)}`; }
  function techTip(id) {
    const t = G.TECHS[id], unl = Object.keys(G.BUILDINGS).filter(b => G.BUILDINGS[b].tech === id);
    let h = `<b>${t.name}</b><p class="tt-p">${t.desc}</p>${chips([`${t.cost} récits`, G.REGIONS[t.region].age])}`;
    if (t.req) h += sec('Demande', `<p class="tt-p">${t.req.map(q => G.TECHS[q].name).join(', ')}</p>`);
    for (const b of unl) h += sec('Débloque : ' + G.BUILDINGS[b].name, `<div class="cf">${cardFlow(b)}</div>`);
    return h;
  }

  // ---- Bonus actifs ----
  const MOD_LABELS = {
    harvest: ['Récolte', 1], reach: ['Portée', 0], speed: ['Vitesse', 1], drain: ['Faim', 1, true], gallopDrain: ['Faim au galop', 1, true],
    recits: ['Récits', 1], dmg: ['Dégâts', 1], porters: ['Porteurs', 0], porterSpeed: ['Pas des porteurs', 1], charge: ['Charge', 1],
    growth: ['Croissance', 1], tentPop: ['Habitants par tente', 0], vivresUse: ['Vivres mangés', 1, true], vivres: ['Vivres produits', 1],
    craft: ['Fabrication', 1], vigMax: ['Vigueur max.', 0], maxLevel: ['Niveau max.', 0], tickDrain: ['Drain des parasites', 1, true], cadence: ['Cadence max.', 1]
  };
  function activeMods() {
    const o = [];
    for (const k in MOD_LABELS) {
      const v = G.M[k];
      if (!v || Math.abs(v) < 1e-6) continue;
      const [label, isPct, inv] = MOD_LABELS[k];
      o.push({ label, text: isPct ? signed(v * 100, ' %') : signed(v), good: inv ? v < 0 : v > 0 });
    }
    for (const k in G.M.dens || {}) if (G.M.dens[k]) o.push({ label: G.DEPOSITS[k].name, text: signed(G.M.dens[k] * 100, ' %'), good: G.M.dens[k] > 0 });
    return o;
  }

  // ---- Bâtiment posé ----
  const STATUS = {
    attente: 'Attend ses entrées', plein: 'Sortie pleine : personne ne vient chercher', faim: 'Manque de vivres',
    munitions: 'Manque de munitions', vide: 'Rien à portée', pause: 'En pause', ruine: 'En ruine'
  };
  function missing(b) {
    const d = G.BUILDINGS[b.type], l = [];
    if (d.recipe) for (const r in d.recipe.in) if ((b.inp[r] || 0) < d.recipe.in[r]) l.push(rName(r).toLowerCase());
    return l;
  }
  function statusText(b) {
    if (!b._st || !STATUS[b._st]) return '';
    const m = b._st === 'attente' ? missing(b) : [];
    return STATUS[b._st] + (m.length ? ' : ' + m.join(', ') : '');
  }
  function cadHtml(b) {
    if (!(G.BUILDINGS[b.type].recipe || G.BUILDINGS[b.type].harvest || G.BUILDINGS[b.type].harpoon)) return '';
    const c = b.cad || 0, bonus = c * G.economy.cadBonus();
    return `<div class="cad" data-tip="Cadence : un bâtiment qui ne manque de rien et ne déborde pas prend le rythme en ${G.LEVELS.cadUp} s. Un accroc le lui fait perdre en ${G.LEVELS.cadDown} s."><small>Cadence</small><div class="bar ${c >= 0.99 ? 'gold' : ''}"><i style="width:${c * 100}%"></i></div><b>+${Math.round(bonus * 100)} %</b></div>`;
  }
  function measured(b) { return (b._m && b._m.r) || {}; }
  function liveFlows(b) {
    const s = sheet(b.type, b.level, b.x, b.y, b.cad), real = measured(b);
    let h = '';
    if (s.inp.length) h += `<div class="fl"><small>Consomme</small>${s.inp.map(([r, v]) => `<span>${resIc(r)}${flow(v)}</span>`).join('')}</div>`;
    if (s.out.length) h += `<div class="fl"><small>Produit</small>${s.out.map(([r, v]) => `<span>${resIc(r)}${flow(v)}<em>réel ${num(real[r] || 0)}</em></span>`).join('')}</div>`;
    if (s.d.harvest || s.d.harpoon) {
      const got = Object.keys(real).filter(r => real[r] > 0.002);
      h += `<div class="fl"><small>Récolte</small><span>max ${flow(s.harvest)}</span>${got.map(r => `<span>${resIc(r)}<em>réel ${num(real[r])}</em></span>`).join('')}</div>`;
    }
    return h;
  }
  function reachSummary(b, reach) {
    const d = G.BUILDINGS[b.type];
    const dep = G.economy.inRangeDeposits(b, reach, x => d.harpoon || !G.DEPOSITS[x.type].harpoonOnly), by = {};
    for (const x of dep) { const o = by[x.res] || (by[x.res] = { n: 0, amt: 0 }); o.n++; o.amt += x.amt; }
    const ks = Object.keys(by);
    if (!ks.length) return '<span class="muted">rien pour l\'instant</span>';
    return ks.map(r => `<span data-tip="${rName(r)} : ${by[r].n} gisement(s), ${U.fmt(by[r].amt)} unités">${resIc(r)}${by[r].n}</span>`).join('');
  }
  function selectionExtras(b) {
    const d = G.BUILDINGS[b.type];
    let h = cadHtml(b) + liveFlows(b);
    if (d.harvest || d.harpoon) {
      if (b.target) { const t = G.world.byId(b.target); if (t) h += `<p class="small">Cible : <b>${G.DEPOSITS[t.type].name}</b>, reste ${U.fmt(t.amt)}</p>`; }
      h += `<div class="fl"><small>À portée</small>${reachSummary(b, G.economy.reachOf(b))}</div>`;
    }
    return h;
  }
  function nextLevel(b) {
    if (G.logic.levelError(b) || !G.BUILDINGS[b.type].cost) return '';
    const a = sheet(b.type, b.level, b.x, b.y), n = sheet(b.type, b.level + 1, b.x, b.y), bits = [];
    n.inp.forEach(([r, v]) => bits.push(`${resIc(r)}${num(v)}`));
    if (n.out.length) bits.push('→');
    n.out.forEach(([r, v]) => bits.push(`${resIc(r)}${num(v)}`));
    if (a.harvest && !n.out.length) bits.push(`récolte ${flow(n.harvest)}`);
    if (a.housing) bits.push(`loge ${fr(n.housing)}`);
    if (a.dmg) bits.push(`${fr(n.dmg)} dégâts`);
    if (a.jobs) bits.push(`${fr(n.jobs)} emplois`);
    bits.push(`solidité ${Math.round(n.hp)}`);
    return `<div class="nextlv"><small>Niveau ${b.level + 1} · production ×${n.lm}</small><div>${bits.map(x => `<span>${x}</span>`).join('')}</div></div>`;
  }

  // Infobulle au survol d'un bâtiment sur la carte.
  function buildingLive(b) {
    const d = G.BUILDINGS[b.type], st = statusText(b);
    let h = `<b>${d.name}</b> <small>niv. ${b.level}${G.beast.isVein(b.x, b.y) ? ' · veine ×1,4' : ''}</small>`;
    if (st) h += `<p class="tt-st">${st}</p>`;
    h += cadHtml(b).replace(/ data-tip="[^"]*"/, '') + liveFlows(b);
    return h;
  }
  // Aperçu d'un emplacement pendant la pose.
  function placePreview(type, x, y) {
    const d = G.BUILDINGS[type], s = sheet(type, 1, x, y);
    let h = `<b>${d.name} ici</b>`;
    const tags = [];
    if (G.beast.isVein(x, y) && (d.recipe || d.harvest || d.harpoon)) tags.push('Veine : sorties ×1,4');
    if (G.beast.isSpine(x, y) && d.tower) tags.push('Échine : portée +1');
    if (tags.length) h += chips(tags);
    if (d.harvest || d.harpoon) h += `<div class="fl"><small>À portée</small>${reachSummary({ type, level: 1, x, y }, s.reach)}</div>`;
    else if (d.recipe) h += `<div class="cf">${(() => { const li = l => l.map(([r, v]) => `<span>${resIc(r)}${num(v)}</span>`).join(''); return `${li(s.inp)}<i>→</i>${li(s.out)}`; })()}</div>`;
    if (!G.logistics.canPay(G.logic.buildCost(type))) h += `<p class="tt-st">Ressources insuffisantes</p>`;
    return h;
  }
  function depositTip(d) {
    const def = G.DEPOSITS[d.type];
    const near = G.run.buildings.filter(b => {
      const bd = G.BUILDINGS[b.type];
      if (b.ruined || !(bd.harvest || (bd.harpoon)) || (def.harpoonOnly && !bd.harpoon)) return false;
      if (G.beast.side(b.x) !== 0 && G.beast.side(b.x) !== d.side) return false;
      return Math.hypot(d.x - b.x - 0.5, d.y - b.y - 0.5) <= G.economy.reachOf(b);
    }).length;
    return `<b>${def.name}</b><div class="tt-r">${resIc(d.res)}<span>${rName(d.res)}</span><b>${U.fmt(d.amt)} / ${U.fmt(d.max)}</b></div>${chips([def.harpoonOnly ? 'harpon seulement' : 'grue ou harpon', near ? `${near} à portée` : 'hors de portée'])}`;
  }

  // ---- Bilan global (onglet Flux) ----
  function balance() {
    const run = G.run, cap = {}, dem = {};
    const add = (o, r, v) => { o[r] = (o[r] || 0) + v; };
    let nCad = 0, sumCad = 0, full = 0;
    const issues = [];
    for (const b of run.buildings) {
      const d = G.BUILDINGS[b.type];
      if (d.recipe || d.harvest || d.harpoon) { nCad++; sumCad += b.cad || 0; if ((b.cad || 0) >= 0.99) full++; }
      if (b.ruined || b.paused) { if (b.type !== 'nuque' && (b.ruined || d.recipe || d.harvest || d.harpoon)) issues.push(b); continue; }
      const s = sheet(b.type, b.level, b.x, b.y, b.cad);
      s.out.forEach(([r, v]) => add(cap, r, v));
      s.inp.forEach(([r, v]) => add(dem, r, v));
      if (d.harvest || d.harpoon) { const m = measured(b); for (const r in m) add(cap, r, m[r]); }
      if (b._st && STATUS[b._st] && b.type !== 'nuque') issues.push(b);
    }
    add(dem, 'fourrage', G.beast.drain() / G.BEAST.fourragePts);
    const rows = G.RES_ORDER.filter(r => cap[r] || dem[r]).map(r => {
      const c = cap[r] || 0, de = dem[r] || 0;
      const ratio = de > 0 ? c / de : Infinity;
      const state = !de ? 'libre' : ratio < 0.9 ? 'deficit' : ratio > 1.25 ? 'excedent' : 'juste';
      return { r, c, de, ratio, state, hint: de > c ? ratioHint(r, de - c) : '' };
    });
    return { rows, issues, avg: nCad ? sumCad / nCad : 0, full, nCad };
  }
  const STATE_LABEL = { deficit: 'Déficit', juste: 'Équilibré', excedent: 'Excédent', libre: 'Libre' };

  function fluxPanel() {
    const B = balance(), run = G.run, wf = run._wf === undefined ? 1 : run._wf;
    let h = `<div class="flux-top"><div><small>Rendement</small><b>${pct(B.avg)}</b><div class="bar ${B.avg >= 0.8 ? 'gold' : ''}"><i style="width:${B.avg * 100}%"></i></div></div>
      <div><small>En rythme</small><b>${B.full} / ${B.nCad}</b></div><div><small>Main-d'œuvre</small><b>${pct(wf)}</b></div></div>
      <p class="muted small">Un bâtiment en rythme produit jusqu'à +${Math.round(G.economy.cadBonus() * 100)} %. Pour l'y maintenir, chaque maillon doit recevoir autant qu'il consomme et se faire vider autant qu'il produit. Un niveau multiplie entrées et sorties : montez toute la chaîne ensemble.</p>`;
    h += `<h4>Offre et demande <small class="muted">${unit()}</small></h4><div class="ftable"><div class="fh"><span></span><span>Offre</span><span>Demande</span><span>État</span></div>`;
    for (const x of B.rows) {
      const w = x.de > 0 ? Math.min(100, Math.min(x.c, x.de * 1.5) / (x.de * 1.5) * 100) : 100;
      h += `<div class="fr-row ${x.state}" data-tipx="res:${x.r}"><span class="n">${resIc(x.r)}${rName(x.r)}</span><span>${num(x.c)}</span><span>${num(x.de)}</span><span class="st">${STATE_LABEL[x.state]}</span>
        <div class="bal"><i style="width:${w}%"></i><u></u></div>${x.hint ? `<small class="hint">Il manque ${x.hint}</small>` : ''}</div>`;
    }
    h += '</div>';
    if (B.issues.length) {
      h += `<h4>Goulots <small class="muted">${B.issues.length}</small></h4><div class="issues">`;
      for (const b of B.issues.slice(0, 14)) h += `<button class="issue" data-action="selb:${b.bid}"><span class="ci cat-${G.BUILDINGS[b.type].cat}">${ic(b.type)}</span><span><b>${G.BUILDINGS[b.type].name}</b> <small>niv. ${b.level}</small><br><small>${b.ruined ? 'En ruine' : b.paused ? 'En pause' : statusText(b)}</small></span></button>`;
      h += '</div>';
    } else h += `<p class="ok-line">Aucun bâtiment à l'arrêt.</p>`;
    return h;
  }

  // ---- Onglet Songe ----
  function sagaPanel() {
    const s = G.meta.saga, run = G.run;
    let h = `<div class="eveil"><div><small>Le Veilleur</small><b>Éveil ${s.level}</b></div><div class="bar step"><i style="width:${s.xp / G.saga.xpNeed(s.level) * 100}%"></i></div><small>${Math.round(s.xp)} / ${G.saga.xpNeed(s.level)}${s.points ? ` · <b class="pts">${s.points} éclat${s.points > 1 ? 's' : ''} à placer</b>` : ''}</small></div>`;
    h += `<p class="muted small">Prochaine nuit dans ${U.fmtTime(G.saga.nextNight(run))}. Chaque nuit apporte un songe, sauf pendant une vague.</p>`;
    h += '<h4>Les trois Voix</h4>';
    for (const v in G.VOIX) {
      const V = G.VOIX[v], n = s.voix[v] || 0;
      h += `<div class="voix"><div class="vh"><span style="color:${V.color}">${ic(V.icon)}</span><b>${V.name}</b><em>${n}</em>${s.points ? `<button class="btn sm" data-action="voix:${v}">+1</button>` : ''}</div><small>${V.motto} · ${V.perText} par point</small>
        <div class="dons">${V.dons.map(d => `<span class="don ${n >= d.at ? 'on' : ''}" data-tip="${d.desc}">${d.at} · ${d.name}</span>`).join('')}</div></div>`;
    }
    const known = Object.keys(G.COMPANIONS).filter(id => s.comp[id]);
    h += `<h4>Compagnons <small class="muted">${s.party.length} / ${G.saga.PARTY} à vos côtés</small></h4>`;
    if (!known.length) h += '<p class="muted small">Personne encore. On les rencontre en songe.</p>';
    for (const id of known) {
      const c = G.COMPANIONS[id], lv = s.comp[id], inP = s.party.includes(id), cost = G.saga.bondCost(id);
      h += `<div class="comp ${inP ? 'on' : ''}"><div><b>${c.name}</b> <small>${c.cls} · niv. ${lv}</small><p>${c.perText}</p><p class="tt-f">${c.lore}</p></div>
        <div class="cact"><button class="btn sm" data-action="party:${id}">${inP ? 'Retirer' : 'À vos côtés'}</button>${lv < G.saga.COMP_MAX ? `<button class="btn sm" data-action="bond:${id}" ${run.recits >= cost ? '' : 'disabled'} data-tip="Veiller avec ce compagnon : il gagne un niveau.">Veiller ${U.fmt(cost, 0)} récits</button>` : ''}</div></div>`;
    }
    const left = Object.keys(G.COMPANIONS).length - known.length;
    if (left && known.length) h += `<p class="muted small">Encore ${left} à rencontrer.</p>`;
    h += `<h4>Journal des songes <small class="muted">${s.journal.length} / ${G.SONGES.length}</small></h4>`;
    if (!s.journal.length) h += '<p class="muted small">Vos nuits sont encore sans mémoire.</p>';
    else {
      const books = {};
      for (const j of s.journal) { const d = G.saga.get(j.id); (books[d.book] = books[d.book] || []).push(j); }
      for (const b in books) h += `<div class="jbook"><small>${G.SAGA_BOOKS[b]}</small>${books[b].map(j => `<button class="jline" data-action="reread:${j.id}">${G.saga.get(j.id).title}</button>`).join('')}</div>`;
    }
    if (s.endings.length) h += `<h4>Fins vécues</h4><p class="small">${s.endings.map(k => G.FINS[k].title).join(' · ')}</p>`;
    return h;
  }

  // ---- Guide ----
  function guide(tab) {
    const tabs = [['cmd', 'Commandes'], ['bat', 'Bâtiments'], ['res', 'Ressources'], ['rules', 'Règles']];
    let h = `<h2>Guide</h2><div class="gtabs">${tabs.map(([k, n]) => `<button class="btn sm ${k === tab ? 'on' : ''}" data-action="help:${k}">${n}</button>`).join('')}</div>`;
    if (tab === 'cmd') {
      const rows = [
        ['Clic sur une carte, puis une case', 'Choisir et poser un bâtiment'],
        ['Maj + clic', 'Poser plusieurs bâtiments de suite'],
        ['Clic droit ou Échap', 'Annuler la pose'],
        ['Clic sur un bâtiment', 'Ouvrir sa fiche, ses niveaux, sa cible'],
        ['Glisser', 'Déplacer la vue'],
        ['Molette', 'Zoomer'],
        ['Espace', 'Pause'],
        ['1, 2, 3', 'Halte, marche, galop'],
        ['C', 'Recadrer sur la bête']
      ];
      if (G.is3D) rows.splice(6, 0, ['Clic droit ou molette enfoncée + glisser', 'Tourner autour de la bête'], ['Q ou A, E (ou flèches gauche, droite)', 'Tourner par crans'], ['Flèches haut et bas', 'Incliner la vue']);
      h += `<table class="gt"><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
    }
    if (tab === 'bat') {
      h += `<p class="muted small">Débits ${unit()} au niveau 1. Un bâtiment de niveau N multiplie toutes ces valeurs par N.</p><table class="gt"><thead><tr><th>Bâtiment</th><th>Coût</th><th>Débits</th><th>Emplois</th></tr></thead><tbody>`;
      for (const id in G.BUILDINGS) {
        const d = G.BUILDINGS[id];
        if (d.cat === 'base') continue;
        h += `<tr class="${G.logic.unlocked(id) ? '' : 'locked'}"><td data-tipx="b:${id}"><b>${d.name}</b></td><td><div class="cf">${Object.keys(d.cost).map(r => `<span>${resIc(r)}${d.cost[r]}</span>`).join('')}</div></td><td><div class="cf">${cardFlow(id)}</div></td><td>${d.jobs || '-'}</td></tr>`;
      }
      h += '</tbody></table>';
    }
    if (tab === 'res') {
      h += '<table class="gt"><thead><tr><th>Ressource</th><th>Origine</th><th>Usage</th></tr></thead><tbody>';
      for (const r of G.RES_ORDER) {
        const from = depositsOf(r).map(k => G.DEPOSITS[k].name).concat(makers(r).map(id => G.BUILDINGS[id].name)).join(', ');
        const to = consumers(r).map(id => G.BUILDINGS[id].name).join(', ') || (r === 'recits' ? 'Technologies, compagnons' : 'Construction');
        h += `<tr><td data-tipx="res:${r}"><span class="n">${resIc(r)} <b>${rName(r)}</b></span></td><td>${from}</td><td>${to}</td></tr>`;
      }
      h += '</tbody></table>';
    }
    if (tab === 'rules') {
      const L = G.LEVELS, B = G.BEAST;
      const items = [
        ['Niveaux', `Un niveau N vaut N bâtiments : entrées et sorties ×N, le ratio d'une recette ne change jamais. Le coût double à chaque niveau. Les emplois ne montent que de ${pct(L.jobs)} par niveau : monter économise des bras.`],
        ['Cadence', `Un bâtiment qui ne manque de rien et ne déborde pas gagne jusqu'à +${Math.round(G.economy.cadBonus() * 100)} % de sorties en ${L.cadUp} s. Un accroc lui fait tout perdre en ${L.cadDown} s. Trop de producteurs engorgent, trop peu affament : c'est tout l'art de la chaîne.`],
        ['Veines', 'Une case de veine multiplie les sorties par 1,4 sans augmenter les entrées.'],
        ['Porteurs', 'Les ressources voyagent à dos de porteur. Plus deux maillons sont proches, plus le flux est régulier. Les greniers servent de relais.'],
        ['Main-d\'œuvre', 'Si les emplois dépassent les habitants, tout ralentit. Les tentes logent seulement si elles ont des vivres.'],
        ['Satiété', `La bête perd de la satiété selon son allure. Un fourrage rend ${B.fourragePts} points. Au-dessus de 70 %, le fourrage mangé la fait grandir.`],
        ['Anatomie', "Flancs : grues et harpons. Échine : défenses +1 portée. Cœur et cicatrices : inconstructibles."],
        ['Vagues', `Toutes les ${U.fmtTime(G.WAVES.interval)} en Rude et en Sauvage, annoncées ${G.WAVES.warn} s avant. Une Reine toutes les 5 vagues.`],
        ['Songes', 'Une nuit, un songe. Vos choix nourrissent trois Voix, gardées d\'une bête à l\'autre, comme vos compagnons et votre Éveil. Ce que vous pourrez dire au Col en dépend.']
      ];
      h += `<div class="grules">${items.map(i => `<div><b>${i[0]}</b><p>${i[1]}</p></div>`).join('')}</div>`;
    }
    h += '<button class="btn primary wide" data-action="closeModal">Reprendre</button>';
    return h;
  }

  // ---- Répartition des infobulles ----
  const TIPS = {
    b: buildingTip, res: resTip, sat: satTip, vig: vigTip, grow: growTip, pop: popTip, wave: waveTip, pace: paceTip,
    step: stepTip, node: nodeTip, tech: techTip,
  };
  function tip(key) {
    const i = key.indexOf(':'), k = i < 0 ? key : key.slice(0, i), a = i < 0 ? '' : key.slice(i + 1);
    return TIPS[k] ? TIPS[k](a) : '';
  }

  return { sheet, cardFlow, tip, activeMods, statusText, selectionExtras, nextLevel, buildingLive, placePreview, depositTip, fluxPanel, sagaPanel, guide, placementText };
})();
