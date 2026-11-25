/* Lumen — engine.js : pieces, ray tracing, state snapshots, share codes */
(function () {
  'use strict';
  var L = window.L;
  var DX = L.DX, DY = L.DY;

  // number of discrete states for stateful pieces
  L.ROT = { mirror: 8, splitter: 8, filter: 6, lens: 2 };
  L.nStates = function (p) {
    if (p.t === 'slider') return p.track ? p.track.length : 0;
    return L.ROT[p.t] || 0;
  };
  L.interactive = function (p) { return L.nStates(p) > 1 && !p.locked; };
  L.angular = function (p) { return p.t === 'mirror' || p.t === 'splitter'; };
  L.setState = function (p, s) {
    var n = L.nStates(p); if (!n) return;
    p.s = ((s % n) + n) % n;
    if (p.t === 'slider') { p.x = p.track[p.s][0]; p.y = p.track[p.s][1]; }
  };
  // tap "clockwise" step: mirror angle is CCW-positive, so clockwise means s-1
  L.stepFor = function (p, dir) { return L.angular(p) ? -dir : dir; };
  L.rotDist = function (p, a, b) {
    var n = L.nStates(p); if (n <= 1) return 0;
    var d = (((b - a) % n) + n) % n;
    return Math.min(d, n - d);
  };
  L.isOn = function (p) { return p.placed !== false && p.x >= 0 && p.y >= 0; };
  L.indexLevel = function (lv) { lv.byId = {}; for (var i = 0; i < lv.pieces.length; i++) lv.byId[lv.pieces[i].id] = lv.pieces[i]; return lv; };
  L.buildGrid = function (lv) {
    var g = new Array(lv.w * lv.h);
    for (var i = 0; i < g.length; i++) g[i] = null;
    for (var j = 0; j < lv.pieces.length; j++) {
      var p = lv.pieces[j];
      if (L.isOn(p) && p.x < lv.w && p.y < lv.h) g[p.x + p.y * lv.w] = p;
    }
    return g;
  };
  L.pieceAt = function (lv, x, y) {
    for (var i = lv.pieces.length - 1; i >= 0; i--) { var p = lv.pieces[i]; if (L.isOn(p) && p.x === x && p.y === y) return p; }
    return null;
  };
  L.cellFree = function (lv, x, y, except) {
    if (x < 0 || y < 0 || x >= lv.w || y >= lv.h) return false;
    for (var i = 0; i < lv.pieces.length; i++) {
      var p = lv.pieces[i]; if (p === except) continue;
      if (L.isOn(p) && p.x === x && p.y === y) return false;
      if (p.t === 'slider' && p.track) for (var k = 0; k < p.track.length; k++) if (p.track[k][0] === x && p.track[k][1] === y) return false;
    }
    return true;
  };

  /* Trace every beam. Returns segments (cell units), crystal hits and solved flag. */
  L.trace = function (lv) {
    var w = lv.w, h = lv.h, g = L.buildGrid(lv);
    if (!lv.byId) L.indexLevel(lv);
    var segs = [], hits = {}, flashes = [], seen = {}, q = [];
    function push(x, y, d, c, depth) {
      var k = x + ',' + y + ',' + d + ',' + c;
      if (seen[k]) return; seen[k] = 1;
      q.push({ x: x, y: y, d: d, c: c, depth: depth });
    }
    for (var i = 0; i < lv.pieces.length; i++) {
      var e = lv.pieces[i];
      if (e.t === 'emitter' && L.isOn(e)) push(e.x, e.y, e.d, e.c, 0);
    }
    var guard = 0;
    while (q.length && guard < 4000) {
      guard++;
      var b = q.shift(), x = b.x, y = b.y, d = b.d, c = b.c, n = 0;
      while (true) {
        x += DX[d]; y += DY[d]; n++;
        if (x < 0 || y < 0 || x >= w || y >= h || n > 200) {
          segs.push({ x1: b.x, y1: b.y, x2: x, y2: y, c: c, d: d, depth: b.depth, len: n, end: 'out' });
          break;
        }
        var p = g[x + y * w];
        if (!p) continue;
        segs.push({ x1: b.x, y1: b.y, x2: x, y2: y, c: c, d: d, depth: b.depth, len: n, end: p.t, pid: p.id });
        var nd = b.depth + n, r;
        switch (p.t) {
          case 'crystal': hits[p.id] = (hits[p.id] || 0) | c; break;
          case 'mirror':
            r = (((p.s - d) % 8) + 8) % 8;
            push(x, y, r, c, nd); // r===d means beam is parallel: passes straight through
            break;
          case 'splitter':
            r = (((p.s - d) % 8) + 8) % 8;
            push(x, y, d, c, nd);
            if (r !== d) push(x, y, r, c, nd);
            break;
          case 'prism':
            if (c & 1) push(x, y, (d + 1) % 8, 1, nd);
            if (c & 2) push(x, y, d, 2, nd);
            if (c & 4) push(x, y, (d + 7) % 8, 4, nd);
            break;
          case 'filter':
            var o = c & L.FILTERS[p.s];
            if (o) push(x, y, d, o, nd); else flashes.push({ x: x, y: y, c: c });
            break;
          case 'lens': push(x, y, (d + (p.s ? 7 : 1)) % 8, c, nd); break;
          case 'portal':
            var op = lv.byId[p.pair];
            if (op && L.isOn(op)) push(op.x, op.y, d, c, nd); else flashes.push({ x: x, y: y, c: c });
            break;
          default: flashes.push({ x: x, y: y, c: c });
        }
        break;
      }
    }
    var lit = 0, total = 0, over = {};
    for (var j = 0; j < lv.pieces.length; j++) {
      var cr = lv.pieces[j]; if (cr.t !== 'crystal') continue;
      total++;
      if (hits[cr.id] === cr.c) lit++;
      else if (hits[cr.id]) over[cr.id] = true;
    }
    return { segs: segs, hits: hits, flashes: flashes, lit: lit, total: total, over: over, solved: total > 0 && lit === total };
  };

  L.snap = function (lv) {
    return lv.pieces.map(function (p) { return [p.x, p.y, p.s, p.placed === false ? 0 : 1]; });
  };
  L.restore = function (lv, sn) {
    lv.pieces.forEach(function (p, i) {
      var a = sn[i]; if (!a) return;
      p.x = a[0]; p.y = a[1]; p.s = a[2];
      if (p.free) p.placed = !!a[3];
    });
  };
  L.applySolution = function (lv) {
    if (!lv.byId) L.indexLevel(lv);
    lv.sol.forEach(function (so) {
      var p = lv.byId[so.id]; if (!p) return;
      if (p.free) { p.placed = true; p.x = so.x; p.y = so.y; }
      if (L.nStates(p) > 1) L.setState(p, so.s);
    });
  };
  L.solOf = function (lv, p) {
    for (var i = 0; i < lv.sol.length; i++) if (lv.sol[i].id === p.id) return lv.sol[i];
    return null;
  };
  L.computePar = function (lv) {
    var par = 0;
    lv.sol.forEach(function (so) {
      var p = lv.byId[so.id]; if (!p || p.decoy) return;
      if (p.free) par += 1;
      par += L.rotDist(p, p.s, so.s);
    });
    return Math.max(1, par);
  };
  L.cloneLevel = function (lv) {
    var c = JSON.parse(JSON.stringify({ w: lv.w, h: lv.h, pieces: lv.pieces, sol: lv.sol, par: lv.par, name: lv.name, world: lv.world, idx: lv.idx, theme: lv.theme }));
    return L.indexLevel(c);
  };

  /* Scramble a solved level into a playable start state (deterministic). */
  L.scramble = function (lv, seed) {
    var R = L.rng(seed);
    L.indexLevel(lv);
    for (var tries = 0; tries < 30; tries++) {
      lv.pieces.forEach(function (p) {
        var n = L.nStates(p);
        if (p.t === 'slider') { if (n > 1) L.setState(p, 1 + Math.floor(R() * (n - 1))); }
        else if (n > 1) {
          var so = L.solOf(lv, p);
          var base = so ? so.s : 0;
          var s = p.decoy ? Math.floor(R() * n) : (base + 1 + Math.floor(R() * (n - 1))) % n;
          L.setState(p, s);
        }
        if (p.free) { p.placed = false; p.x = -1; p.y = -1; }
      });
      if (!L.trace(lv).solved) { lv.par = L.computePar(lv); return true; }
    }
    return false;
  };

  /* ---------- share codes ----------
     compact: {v:1,n:name,w,h,tr:0|1,p:[[letter,x,y,s,c,d]]} — portals pair in order of appearance */
  var T2L = { emitter: 'E', crystal: 'C', wall: 'W', mirror: 'M', splitter: 'S', prism: 'P', filter: 'F', portal: 'O', lens: 'N' };
  var L2T = {}; for (var k in T2L) L2T[T2L[k]] = k;
  L.TYPE_LETTERS = T2L;

  L.pairPortals = function (pieces) {
    var ps = pieces.filter(function (p) { return p.t === 'portal'; });
    ps.forEach(function (p) { p.pair = undefined; p.g = 0; });
    for (var i = 0; i + 1 < ps.length; i += 2) { ps[i].pair = ps[i + 1].id; ps[i + 1].pair = ps[i].id; ps[i].g = ps[i + 1].g = (i / 2) % 3; }
  };
  L.encodeLevel = function (data) {
    var o = { v: 1, n: data.name || 'Untitled', w: data.w, h: data.h, tr: data.tray ? 1 : 0, p: [] };
    data.pieces.forEach(function (p) { o.p.push([T2L[p.t], p.x, p.y, p.s || 0, p.c || 0, p.d || 0]); });
    return L.b64enc(JSON.stringify(o));
  };
  L.decodeData = function (code) {
    var o = JSON.parse(L.b64dec(code));
    if (!o || o.v !== 1 || !Array.isArray(o.p)) throw new Error('bad code');
    var w = L.clamp(o.w | 0, 3, 10), h = L.clamp(o.h | 0, 3, 12), id = 0, pieces = [];
    o.p.forEach(function (a) {
      var t = L2T[a[0]]; if (!t) return;
      var x = a[1] | 0, y = a[2] | 0; if (x < 0 || y < 0 || x >= w || y >= h) return;
      var p = { id: id++, t: t, x: x, y: y, s: (a[3] | 0), c: (a[4] | 0) & 7, d: (a[5] | 0) & 7 };
      if ((t === 'emitter' || t === 'crystal') && !p.c) p.c = 7;
      var n = L.nStates(p); if (n) p.s = ((p.s % n) + n) % n;
      pieces.push(p);
    });
    L.pairPortals(pieces);
    return { name: String(o.n || 'Shared puzzle').slice(0, 40), w: w, h: h, tray: !!o.tr, pieces: pieces };
  };
  /* Build a playable level from editor/share data. Throws with a friendly message if unsolvable. */
  L.levelFromData = function (data, seed) {
    var lv = { w: data.w, h: data.h, name: data.name, world: -1, theme: 'void', pieces: JSON.parse(JSON.stringify(data.pieces)) };
    L.pairPortals(lv.pieces);
    L.indexLevel(lv);
    if (!lv.pieces.some(function (p) { return p.t === 'emitter'; })) throw new Error('Needs at least one emitter.');
    if (!lv.pieces.some(function (p) { return p.t === 'crystal'; })) throw new Error('Needs at least one crystal.');
    if (!L.trace(lv).solved) throw new Error('As designed, not every crystal is lit — solve it first so the solution can be saved.');
    lv.sol = lv.pieces.filter(function (p) { return L.nStates(p) > 1 || (data.tray && p.t === 'mirror'); })
      .map(function (p) { return { id: p.id, x: p.x, y: p.y, s: p.s || 0 }; });
    if (!lv.sol.length) throw new Error('Add at least one mirror, splitter, filter or lens for the player to adjust.');
    if (data.tray) lv.pieces.forEach(function (p) { if (p.t === 'mirror') p.free = true; });
    if (!L.scramble(lv, seed >>> 0)) throw new Error('Could not scramble this puzzle into an unsolved state. Add another adjustable piece.');
    return lv;
  };
})();
