/* Lumen — generator.js : solvable-by-construction level builder.
   Each level is grown from its solution: beams are walked from emitters, pieces are
   placed at turning points with the exact orientation needed, and crystals sit at
   path ends. Cells used by any beam can never receive a piece, and beams can never
   cross a piece cell, so the solution cannot be broken. Every result is then
   verified with the real tracer before it is scrambled. */
(function () {
  'use strict';
  var L = window.L, DX = L.DX, DY = L.DY;

  function gen1(r, seed) {
    var R = L.rng(seed), W = r.w, H = r.h, diag = !!r.diag;
    var cells = [], path = [], pieces = [], nid = 0, ops = 0, i;
    for (i = 0; i < W * H; i++) { cells.push(null); path.push(0); }
    var slid = {};
    function inb(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
    function idx(x, y) { return x + y * W; }
    function add(p) { p.id = nid++; pieces.push(p); if (p.x >= 0) cells[idx(p.x, p.y)] = p; return p; }
    function snap() { return [cells.slice(), path.slice(), pieces.length, nid]; }
    function rest(s) { cells = s[0]; path = s[1]; pieces.length = s[2]; nid = s[3]; }
    function count(t) { var n = 0; for (var k = 0; k < pieces.length; k++) if (pieces[k].t === t) n++; return n; }
    function weightsFor(c) {
      var out = [], T = r.types || { mirror: 1 };
      for (var t in T) {
        if (t === 'prism' && (c !== 7 || count('prism') >= (r.maxPrism || 1))) continue;
        if (t === 'filter' && !(c === 7 || c === 3 || c === 5 || c === 6)) continue;
        if (t === 'filter' && count('filter') >= (r.maxFilter || 2)) continue;
        if (t === 'portal' && count('portal') >= (r.maxPortal || 2) * 2) continue;
        if (t === 'splitter' && count('splitter') >= (r.maxSplit || 2)) continue;
        if (t === 'lens' && (!diag || count('lens') >= (r.maxLens || 3))) continue;
        out.push([t, T[t]]);
      }
      if (!out.length) out.push(['mirror', 1]);
      return out;
    }
    function pickW(list) {
      var s = 0, k; for (k = 0; k < list.length; k++) s += list[k][1];
      var v = R() * s;
      for (k = 0; k < list.length; k++) { v -= list[k][1]; if (v <= 0) return list[k][0]; }
      return list[list.length - 1][0];
    }
    function turnDirs(d) {
      var out = [];
      for (var k = 1; k < 8; k++) {
        if (k === 4) continue;
        var nd = (d + k) % 8;
        if (!diag && nd % 2) continue;
        if (diag && (k === 3 || k === 5) && R() < 0.5) continue; // prefer gentler bends
        out.push(nd);
      }
      return out.length ? out : [(d + 2) % 8];
    }

    function walk(x, y, d, c, budget, primary) {
      if (++ops > 7000) return false;
      var cand = [], cx = x, cy = y, toEdge = false, run = [];
      for (var k = 1; ; k++) {
        cx += DX[d]; cy += DY[d];
        if (!inb(cx, cy)) { toEdge = true; break; }
        if (cells[idx(cx, cy)]) break;
        run.push(idx(cx, cy));
        if (!path[idx(cx, cy)] && !slid[idx(cx, cy)]) cand.push(k);
      }
      // secondary branches may simply leave the board
      if (budget <= 0 && !primary && toEdge && R() < (r.exitChance || 0)) {
        for (var e = 0; e < run.length; e++) path[run[e]] = 1;
        return true;
      }
      if (!cand.length) return false;
      for (var tr = 0; tr < 12; tr++) {
        var kk = R.pick(cand);
        if (kk === 1 && cand.length > 1 && R() < 0.5) kk = R.pick(cand);
        var tx = x + DX[d] * kk, ty = y + DY[d] * kk, mid = run.slice(0, kk - 1);
        if (budget <= 0) {
          for (var m = 0; m < mid.length; m++) path[mid[m]] = 1;
          add({ t: 'crystal', x: tx, y: ty, c: c });
          return true;
        }
        var s0 = snap();
        for (var m2 = 0; m2 < mid.length; m2++) path[mid[m2]] = 1;
        var t = pickW(weightsFor(c)), outs = null, nd;
        if (t === 'mirror' || t === 'splitter') {
          nd = R.pick(turnDirs(d));
          add({ t: t, x: tx, y: ty, s: (d + nd) % 8 });
          if (t === 'mirror') outs = [[nd, c, budget - 1, true]];
          else { var half = Math.floor((budget - 1) / 2); outs = [[d, c, half, false], [nd, c, budget - 1 - half, true]]; }
        } else if (t === 'prism') {
          add({ t: 'prism', x: tx, y: ty, s: 0 });
          var b = Math.max(0, budget - 1), q3 = Math.floor(b / 3), bs = R.shuffle([q3, q3, b - 2 * q3]);
          var prim = Math.floor(R() * 3);
          outs = [[(d + 1) % 8, 1, bs[0], prim === 0], [d, 2, bs[1], prim === 1], [(d + 7) % 8, 4, bs[2], prim === 2]];
        } else if (t === 'filter') {
          var opts = [];
          L.FILTERS.forEach(function (f, fi) { var o = c & f; if (o && o !== c) opts.push(fi); });
          if (!opts.length) { rest(s0); continue; }
          var si = R.pick(opts);
          add({ t: 'filter', x: tx, y: ty, s: si });
          outs = [[d, c & L.FILTERS[si], budget - 1, true]];
        } else if (t === 'lens') {
          var ls = R() < 0.5 ? 0 : 1;
          add({ t: 'lens', x: tx, y: ty, s: ls });
          outs = [[(d + (ls ? 7 : 1)) % 8, c, budget - 1, true]];
        } else if (t === 'portal') {
          var pc = [];
          for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
            var ii = idx(xx, yy);
            if (cells[ii] || path[ii] || slid[ii]) continue;
            if (Math.abs(xx - tx) + Math.abs(yy - ty) < 3) continue;
            if (!inb(xx + DX[d], yy + DY[d])) continue;
            pc.push([xx, yy]);
          }
          if (!pc.length) { rest(s0); continue; }
          var ex = R.pick(pc);
          var pa = add({ t: 'portal', x: tx, y: ty, s: 0 });
          var pb = add({ t: 'portal', x: ex[0], y: ex[1], s: 0 });
          pa.pair = pb.id; pb.pair = pa.id; pa.g = pb.g = (count('portal') / 2 - 1) % 3;
          if (walk(ex[0], ex[1], d, c, budget - 1, true)) return true;
          rest(s0); continue;
        }
        var all = true;
        for (var o2 = 0; o2 < outs.length; o2++) {
          if (!walk(tx, ty, outs[o2][0], outs[o2][1], outs[o2][2], outs[o2][3])) { all = false; break; }
        }
        if (all) return true;
        rest(s0);
      }
      if (budget > 0) return walk(x, y, d, c, 0, primary);
      return false;
    }

    // ---- emitters ----
    var ems = r.emit || [7];
    for (var en = 0; en < ems.length; en++) {
      var placed = false;
      for (var tr = 0; tr < 40 && !placed; tr++) {
        var side = Math.floor(R() * 4), x, y, d;
        if (side === 0) { x = 0; y = 1 + Math.floor(R() * (H - 2)); d = 0; }
        else if (side === 1) { x = W - 1; y = 1 + Math.floor(R() * (H - 2)); d = 4; }
        else if (side === 2) { y = 0; x = 1 + Math.floor(R() * (W - 2)); d = 6; }
        else { y = H - 1; x = 1 + Math.floor(R() * (W - 2)); d = 2; }
        if (cells[idx(x, y)] || path[idx(x, y)]) continue;
        var s1 = snap();
        add({ t: 'emitter', x: x, y: y, d: d, c: ems[en] });
        var bud = R.int(r.turns[0], r.turns[1]);
        if (walk(x, y, d, ems[en], bud, true)) placed = true; else rest(s1);
      }
      if (!placed) return null;
    }

    // ---- sliders (moving blockers): rest off-path, start on-path ----
    for (var sn = 0; sn < (r.sliders || 0); sn++) {
      var sc = [];
      for (i = 0; i < W * H; i++) {
        if (!path[i] || cells[i] || slid[i]) continue;
        var px = i % W, py = (i / W) | 0;
        for (var kd = 0; kd < 8; kd += 2) {
          var nx = px + DX[kd], ny = py + DY[kd];
          if (!inb(nx, ny)) continue;
          var j = idx(nx, ny);
          if (path[j] || cells[j] || slid[j]) continue;
          sc.push([px, py, nx, ny]);
        }
      }
      if (!sc.length) break;
      var c0 = R.pick(sc);
      add({ t: 'slider', x: c0[2], y: c0[3], s: 0, track: [[c0[2], c0[3]], [c0[0], c0[1]]] });
      slid[idx(c0[0], c0[1])] = 1;
    }

    function freeCells() {
      var out = [];
      for (var k = 0; k < W * H; k++) if (!cells[k] && !path[k] && !slid[k]) out.push(k);
      return out;
    }
    for (var wn = 0; wn < (r.walls || 0); wn++) {
      var fw = freeCells(); if (!fw.length) break;
      var wi = R.pick(fw); add({ t: 'wall', x: wi % W, y: (wi / W) | 0 });
    }
    for (var dn = 0; dn < (r.decoys || 0); dn++) {
      var fd = freeCells(); if (!fd.length) break;
      var di = R.pick(fd);
      add({ t: 'mirror', x: di % W, y: (di / W) | 0, s: R.int(0, 7), decoy: true });
    }

    var lv = { w: W, h: H, pieces: pieces };
    if (r.req) for (var rq = 0; rq < r.req.length; rq++) if (!count(r.req[rq])) return null;
    if (!count('crystal')) return null;
    var nInt = pieces.filter(function (p) { return L.nStates(p) > 1 && !p.decoy; }).length;
    if (nInt < (r.min || 1)) return null;

    // free (tray) pieces
    var freeN = r.free || 0;
    if (freeN) {
      var prefer = r.freeTypes || ['mirror', 'filter', 'lens', 'splitter', 'prism'];
      var poolA = pieces.filter(function (p) { return !p.decoy && prefer.indexOf(p.t) >= 0; });
      R.shuffle(poolA);
      poolA.sort(function (a, b) { return prefer.indexOf(a.t) - prefer.indexOf(b.t); });
      for (var fi2 = 0; fi2 < Math.min(freeN, poolA.length); fi2++) poolA[fi2].free = true;
    }
    lv.sol = pieces.filter(function (p) { return L.nStates(p) > 1 || p.free; })
      .map(function (p) { return { id: p.id, x: p.x, y: p.y, s: p.s || 0 }; });
    L.indexLevel(lv);
    L.applySolution(lv);
    if (!L.trace(lv).solved) return null;           // verification with the real tracer
    if (!L.scramble(lv, seed ^ 0x5bd1e995)) return null;
    return lv;
  }

  function fallback() {
    var lv = {
      w: 5, h: 5, pieces: [
        { id: 0, t: 'emitter', x: 0, y: 2, d: 0, c: 7 },
        { id: 1, t: 'mirror', x: 2, y: 2, s: 0 },
        { id: 2, t: 'crystal', x: 2, y: 0, c: 7 }
      ], sol: [{ id: 1, x: 2, y: 2, s: 2 }]
    };
    L.indexLevel(lv); lv.par = L.computePar(lv);
    return lv;
  }

  function relax(r, stage) {
    var c = JSON.parse(JSON.stringify(r));
    if (stage >= 1) { c.min = Math.max(1, (c.min || 1) - 2); }
    if (stage >= 2) { c.turns = [Math.max(1, c.turns[0] - 1), Math.max(1, c.turns[1] - 1)]; c.min = 1; c.sliders = Math.min(1, c.sliders || 0); }
    if (stage >= 3) { delete c.req; c.free = Math.min(1, c.free || 0); c.walls = 0; c.decoys = 0; }
    return c;
  }

  /* Deterministic: same recipe + seed => same level on every device. */
  L.genLevel = function (recipe, seed) {
    for (var stage = 0; stage < 4; stage++) {
      var rr = relax(recipe, stage);
      for (var a = 0; a < 40; a++) {
        var lv = null, sd = (seed + stage * 104729 + a * 7919) >>> 0;
        try { lv = gen1(rr, sd); } catch (e) { lv = null; }
        if (lv) { lv.seedUsed = sd; lv.relaxed = stage; return lv; }
      }
    }
    return fallback();
  };
  L.genFallback = fallback;
})();
