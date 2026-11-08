// Défense : parasites qui escaladent la bête, lanceurs, balistes, épouilleurs.
G.defense = (function () {
  const SIDES = { left: 'gauche', right: 'droit', rear: 'de la queue' };
  let nextEid = 1, retarget = 0;

  function wavesOn() { return G.RIGUEUR[G.run.rig].waves; }
  // Taille et robustesse de la vague n (partagées avec la fiche d'information).
  function waveSize(n, run) { return Math.round((3 + n * 1.5 + run.region * 2) * (G.RIGUEUR[run.rig].hpMult ? 1.3 : 1)); }
  function waveHp(n, run) { return Math.pow(1.14, n) * (1 + 0.4 * run.region) * (G.RIGUEUR[run.rig].hpMult || 1); }

  function startWave(forceBoss) {
    const run = G.run, w = run.wave, rig = G.RIGUEUR[run.rig];
    w.n++;
    const side = w.side || ['left', 'right', 'rear'][Math.floor(Math.random() * 3)];
    const n = G.defense.waveSize(w.n, run);
    const hpm = G.defense.waveHp(w.n, run);
    for (let i = 0; i < n; i++) spawnEnemy('tique', side, hpm);
    if (forceBoss || w.n % 5 === 0) { spawnEnemy('chef', side, hpm); if (!G.offlineSim) G.lore.say('boss'); }
    w.active = true; w.start = run.time; w.side = null;
    w.next = run.time + G.WAVES.interval;
  }

  function spawnEnemy(type, side, hpm) {
    const run = G.run, def = G.ENEMIES[type], cx = run.cx + 0.5;
    let x, y;
    if (side === 'rear') { x = cx + (Math.random() - 0.5) * 6; y = run.L + 1.5 + Math.random() * 2; }
    else {
      y = 1 + Math.random() * (run.L - 2);
      const s = side === 'left' ? -1 : 1;
      x = cx + s * (G.beast.hw(Math.floor(y)) + 1.5 + Math.random() * 2);
    }
    run.enemies.push({ eid: nextEid++, type, x, y, hp: def.hp * hpm, max: def.hp * hpm, tgt: null, soldier: null });
  }

  function nearestBuilding(e) {
    let best = null, bd = Infinity, wall = null, wd = Infinity;
    for (const b of G.run.buildings) {
      if (b.ruined) continue;
      const d = Math.hypot(b.x + 0.5 - e.x, b.y + 0.5 - e.y);
      if (d < bd) { bd = d; best = b; }
      if (G.BUILDINGS[b.type].wall && d < wd) { wd = d; wall = b; }
    }
    if (wall && wd < bd + 2.5) return wall;
    return best;
  }

  function soldiersUpdate(dt) {
    const run = G.run;
    const homes = run.buildings.filter(b => b.type === 'epouilleurs');
    // Effectifs
    run.soldiers = run.soldiers.filter(s => homes.some(h => h.bid === s.home));
    for (const h of homes) {
      const want = (h.ruined || (h._fed !== undefined && h._fed < 0.3)) ? 0 : G.BUILDINGS.epouilleurs.squad + h.level - 1;
      const mine = run.soldiers.filter(s => s.home === h.bid);
      for (let i = mine.length; i < want; i++) run.soldiers.push({ home: h.bid, x: h.x + 0.5, y: h.y + 0.5, hp: G.SOLDIER.hp, dead: 0 });
      if (mine.length > want) for (const s of mine.slice(want)) run.soldiers.splice(run.soldiers.indexOf(s), 1);
    }
    const S = G.SOLDIER;
    for (const s of run.soldiers) {
      if (s.dead > run.time) continue;
      const h = run.buildings.find(b => b.bid === s.home);
      const lvl = h ? h.level : 1;
      let tgt = null, td = S.aggro;
      for (const e of run.enemies) {
        const d = Math.hypot(e.x - (h.x + 0.5), e.y - (h.y + 0.5));
        if (d < td) { td = d; tgt = e; }
      }
      const gx = tgt ? tgt.x : h.x + 0.5 + Math.cos(run.time * 0.5 + s.home) * 0.6;
      const gy = tgt ? tgt.y : h.y + 0.5 + Math.sin(run.time * 0.5 + s.home) * 0.6;
      const d = Math.hypot(gx - s.x, gy - s.y);
      if (tgt && d < 0.5) {
        tgt.hp -= S.dmg * (1 + G.LEVELS.dmg * (lvl - 1)) * (1 + (G.M.dmg || 0)) * dt;
        tgt.soldier = s;
        s.hp -= G.ENEMIES[tgt.type].dmg * dt;
        if (s.hp <= 0) { s.dead = run.time + S.respawn; s.hp = S.hp * (1 + 0.25 * (lvl - 1)); s.x = h.x + 0.5; s.y = h.y + 0.5; tgt.soldier = null; }
      } else if (d > 0.05) {
        const v = Math.min(d, S.speed * dt);
        s.x += (gx - s.x) / d * v; s.y += (gy - s.y) / d * v;
        if (!tgt) s.hp = Math.min(S.hp * (1 + 0.25 * (lvl - 1)), s.hp + dt * 2);
      }
    }
  }

  function towersUpdate(dt) {
    const run = G.run;
    for (const b of run.buildings) {
      const d = G.BUILDINGS[b.type];
      if (!d.tower || b.ruined || b.paused) continue;
      b.cd -= dt * (b._eff || 0);
      if (b.cd > 0 || !run.enemies.length) continue;
      for (const r in d.tower.ammo) if ((b.inp[r] || 0) < d.tower.ammo[r]) { b._st = 'munitions'; b.cd = 0.5; }
      if (b.cd > 0) continue;
      const range = d.tower.range + (G.beast.isSpine(b.x, b.y) ? 1 : 0) + 0.3 * (b.level - 1);
      let tgt = null, td = range;
      for (const e of run.enemies) {
        const dd = Math.hypot(e.x - b.x - 0.5, e.y - b.y - 0.5);
        if (dd < td) { td = dd; tgt = e; }
      }
      if (!tgt) { b.cd = 0.3; continue; }
      for (const r in d.tower.ammo) { b.inp[r] -= d.tower.ammo[r]; G.economy.count(r, -d.tower.ammo[r]); }
      tgt.hp -= d.tower.dmg * (1 + G.LEVELS.dmg * (b.level - 1)) * (1 + (G.M.dmg || 0));
      b.cd = d.tower.cd;
      run.fx.push({ k: b.type === 'baliste' ? 'carreau' : 'esquille', x1: b.x + 0.5, y1: b.y + 0.5, x2: tgt.x, y2: tgt.y, t: run.time, life: 0.25 });
    }
  }

  function enemiesUpdate(dt) {
    const run = G.run;
    retarget -= dt;
    const re = retarget <= 0;
    if (re) retarget = 1;
    for (let i = run.enemies.length - 1; i >= 0; i--) {
      const e = run.enemies[i], def = G.ENEMIES[e.type];
      if (e.hp <= 0) {
        run.enemies.splice(i, 1); run.stats.killed++;
        run.fx.push({ k: 'mort', x1: e.x, y1: e.y, t: run.time, life: 0.6 });
        continue;
      }
      if (G.beast.inBack(Math.floor(e.x), Math.floor(e.y))) run.vigueur -= def.drain * Math.max(0.1, 1 + (G.M.tickDrain || 0)) * dt;
      if (e.soldier && e.soldier.dead <= run.time && Math.hypot(e.soldier.x - e.x, e.soldier.y - e.y) < 0.8) continue; // bloqué
      e.soldier = null;
      let t = e.tgt ? run.buildings.find(b => b.bid === e.tgt && !b.ruined) : null;
      if (!t || re) { t = nearestBuilding(e); e.tgt = t ? t.bid : null; }
      if (!t) continue;
      const tx = t.x + 0.5, ty = t.y + 0.5, d = Math.hypot(tx - e.x, ty - e.y);
      if (d < 0.65) {
        t.hp -= def.dmg * dt;
        if (t.hp <= 0) {
          t.hp = 0; t.ruined = true; t.trips = [];
          if (!G.offlineSim) G.ui && G.ui.toast(G.BUILDINGS[t.type].name + ' en ruine !', 'bad');
          e.tgt = null;
        }
      } else {
        const v = Math.min(d, def.speed * dt);
        e.x += (tx - e.x) / d * v; e.y += (ty - e.y) / d * v;
      }
    }
  }

  function update(dt) {
    const run = G.run, w = run.wave;
    if (!run || run.ended) return;
    const oasis = G.NODES[G.route.current(run).type].oasis;
    if (wavesOn()) {
      if (G.offlineSim || oasis) { if (!w.active) w.next += dt; }
      else {
        if (!w.active && !w.side && run.time >= w.next - G.WAVES.warn) {
          w.side = ['left', 'right', 'rear'][Math.floor(Math.random() * 3)];
          G.lore.say('waveWarn', { side: SIDES[w.side] });
        }
        if (!w.active && run.time >= w.next) startWave(false);
      }
    }
    soldiersUpdate(dt);
    towersUpdate(dt);
    enemiesUpdate(dt);
    if (w.active && run.time - w.start > G.WAVES.flee && run.enemies.length) {
      // Les survivants sautent du dos en emportant une part de la réserve.
      const n = run.buildings.find(b => b.type === 'nuque');
      if (n) for (const r in n.store) n.store[r] *= 0.9;
      run.enemies = [];
      G.ui && G.ui.toast('Les derniers parasites sautent du dos avec une part de la réserve.', 'bad');
    }
    if (w.active && !run.enemies.length) {
      w.active = false;
      run.stats.waves++;
      const loot = { os: Math.round(8 + w.n * 4), viande: Math.round(5 + w.n * 3) };
      G.logistics.grant(loot);
      if (!G.offlineSim) { G.lore.say('waveWon'); G.ui && G.ui.toast('Vague repoussée : butin ' + G.ui.costText(loot), 'good'); }
      if (run.nestReward) { run.nestReward = false; G.logic.queueOffering(); }
    }
    if (run.fx.length > 200) run.fx.splice(0, run.fx.length - 200);
  }

  return { update, startWave, wavesOn, waveSize, waveHp, SIDES };
})();
