// Logistique physique : les ressources sont stockées dans les bâtiments et voyagent à dos de porteur.
G.logistics = (function () {
  let dispatchAcc = 0;

  function porters(b) {
    const d = G.BUILDINGS[b.type];
    return (d.porters || G.LOGI.porters) + (b.level - 1) + (G.M.porters || 0);
  }
  function charge(b) {
    const d = G.BUILDINGS[b.type];
    return (d.charge || G.LOGI.charge) * (1 + 0.5 * (b.level - 1)) * (1 + (G.M.charge || 0));
  }
  function speed() { return G.LOGI.speed * (1 + (G.M.porterSpeed || 0)); }
  function busy(b) {
    const t = G.run.time;
    if (b.trips.length && b.trips[0] <= t) b.trips = b.trips.filter(x => x > t);
    return b.trips.length;
  }
  function free(b) { return porters(b) - busy(b); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // Quantité disponible chez une source (stock de sortie + réserve).
  function avail(b, r) { return (b.out[r] || 0) + (b.store ? (b.store[r] || 0) : 0); }
  function take(b, r, amt) {
    const o = Math.min(b.out[r] || 0, amt);
    if (o > 0) b.out[r] -= o;
    const rest = amt - o;
    if (rest > 0 && b.store) b.store[r] = Math.max(0, (b.store[r] || 0) - rest);
  }

  function send(src, dst, r, amt, mode) {
    const run = G.run;
    take(src, r, amt);
    const d = Math.max(0.5, dist(src, dst));
    const t1 = run.time + d / speed();
    src.trips.push(run.time + 2 * d / speed());
    src.trips.sort((a, b) => a - b);
    dst.inc[r] = (dst.inc[r] || 0) + amt;
    run.transit.push({ from: src.bid, to: dst.bid, res: r, amt, t0: run.time, t1, mode,
      fx: src.x + 0.5, fy: src.y + 0.5, tx: dst.x + 0.5, ty: dst.y + 0.5 });
  }

  function dispatch() {
    const run = G.run;
    const live = run.buildings.filter(b => !b.ruined);
    const sources = live.filter(b => b.store || Object.keys(b.out).some(r => b.out[r] > 0.5));
    // 1) Ravitaillement des consommateurs (priorité haute d'abord, puis les plus vides).
    const reqs = [];
    for (const c of live) {
      if (c.paused) continue;
      const w = G.economy.wants(c);
      for (const r in w) {
        const cap = w[r], have = (c.inp[r] || 0) + (c.inc[r] || 0);
        if (have >= cap * 0.75) continue;
        reqs.push({ c, r, need: cap - have, fill: have / cap });
      }
    }
    reqs.sort((a, b) => (b.c.prio - a.c.prio) || (a.fill - b.fill));
    for (const q of reqs) {
      const c = q.c, r = q.r;
      // La Nuque puise d'abord dans sa propre réserve, sans porteur.
      if (c.store && (c.store[r] || 0) > 0) {
        const m = Math.min(c.store[r], q.need);
        c.store[r] -= m; c.inp[r] = (c.inp[r] || 0) + m; q.need -= m;
        if (q.need < 0.5) continue;
      }
      let need = q.need;
      for (let guard = 0; guard < 3 && need >= 0.5; guard++) {
        let best = null, bd = Infinity;
        for (const s of sources) {
          if (s === c) continue;
          const a = avail(s, r);
          if (a < Math.min(1, need)) continue;
          // Une source qui consomme elle-même cette ressource ne la cède pas.
          if (!s.store && G.economy.wants(s)[r]) continue;
          const dd = dist(s, c);
          if (dd < bd && free(s) > 0) { bd = dd; best = s; }
        }
        if (!best) break;
        const amt = Math.min(need, avail(best, r), charge(best));
        send(best, c, r, amt, 'inp');
        need -= amt;
      }
    }
    // 2) Surplus des producteurs vers les greniers.
    const greniers = live.filter(b => b.type === 'grenier' && !b.paused);
    if (greniers.length) {
      for (const s of live) {
        if (s.store) continue;
        for (const r in s.out) {
          const cap = G.economy.outCap(s, r);
          if ((s.out[r] || 0) <= cap * G.LOGI.surplus || free(s) <= 0) continue;
          let best = null, bd = Infinity;
          for (const g of greniers) {
            if (g.accept && !g.accept[r]) continue;
            const room = G.economy.storeCap(g) - (g.store[r] || 0) - (g.inc[r] || 0);
            if (room < 1) continue;
            const dd = dist(s, g);
            if (dd < bd) { bd = dd; best = g; }
          }
          if (!best) continue;
          const room = G.economy.storeCap(best) - (best.store[r] || 0) - (best.inc[r] || 0);
          const amt = Math.min(s.out[r] - cap * G.LOGI.surplus * 0.5, charge(s), room);
          if (amt >= 0.5) send(s, best, r, amt, 'store');
        }
      }
    }
  }

  function update(dt) {
    const run = G.run;
    // Arrivées
    for (let i = run.transit.length - 1; i >= 0; i--) {
      const c = run.transit[i];
      if (run.time < c.t1) continue;
      run.transit.splice(i, 1);
      const dst = run.buildings.find(b => b.bid === c.to);
      if (!dst) continue;
      dst.inc[c.res] = Math.max(0, (dst.inc[c.res] || 0) - c.amt);
      if (c.mode === 'store' && dst.store) dst.store[c.res] = (dst.store[c.res] || 0) + c.amt;
      else dst.inp[c.res] = (dst.inp[c.res] || 0) + c.amt;
    }
    dispatchAcc += dt;
    if (dispatchAcc >= 0.5) { dispatchAcc = 0; dispatch(); }
    totals();
  }

  // Totaux affichés : réserves + stocks de sortie (hors transit et stocks d'entrée).
  function totals() {
    const res = {};
    for (const r of G.RES_ORDER) res[r] = 0;
    for (const b of G.run.buildings) {
      for (const r in b.out) res[r] += b.out[r];
      if (b.store) for (const r in b.store) res[r] += b.store[r];
    }
    res.recits = G.run.recits;
    G.run.res = res;
    return res;
  }

  function canPay(cost) {
    const res = G.run.res || totals();
    for (const r in cost) if ((res[r] || 0) < cost[r] - 1e-6) return false;
    return true;
  }
  // Dépense : prélevée dans les stocks les plus proches du chantier.
  function pay(cost, x, y) {
    if (!canPay(cost)) return false;
    const run = G.run;
    for (const r in cost) {
      if (r === 'recits') { run.recits -= cost[r]; continue; }
      let left = cost[r];
      const srcs = run.buildings.filter(b => avail(b, r) > 0)
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
      for (const s of srcs) {
        const m = Math.min(left, avail(s, r));
        take(s, r, m); left -= m;
        if (left <= 1e-6) break;
      }
    }
    totals();
    return true;
  }
  // Ajoute des ressources à la réserve de la Nuque (butin, marché, cadeaux).
  function grant(res) {
    const n = G.run.buildings.find(b => b.type === 'nuque');
    for (const r in res) {
      if (r === 'recits') G.run.recits += res[r];
      else if (n) n.store[r] = (n.store[r] || 0) + res[r];
    }
    totals();
  }

  return { update, totals, canPay, pay, grant, porters, charge, busy, free, speed };
})();
