/* Lumen — game.js : play state, moves, undo/redo, hints, stars, win flow */
(function () {
  'use strict';
  var L = window.L;
  var G = L.game = { lv: null, board: null, moves: 0, time: 0, hints: 0, undo: [], redo: [], solved: false, sel: null, traySel: null, spec: null, idle: 0, prevLit: {} };

  var NAMES = { mirror: 'mirror', splitter: 'splitter', prism: 'prism', filter: 'filter', lens: 'lens', slider: 'blocker' };
  G.pname = function (p) { return NAMES[p.t] || p.t; };

  G.init = function () {
    G.board = new L.Board(L.$('board'), { mode: 'play' });
    L.attachBoardInput(G.board, {
      tap: G.onTap, long: G.onLong, dragStart: G.dragStart, dragMove: G.dragMove, dragEnd: G.dragEnd, wheel: G.onWheel,
      hover: function (c) { G.board.hover = c; }
    });
    L.$('a-ccw').addEventListener('click', function () { G.rotSel(-1); });
    L.$('a-cw').addEventListener('click', function () { G.rotSel(1); });
    L.$('a-undo').addEventListener('click', G.doUndo);
    L.$('a-redo').addEventListener('click', G.doRedo);
    L.$('a-hint').addEventListener('click', G.hint);
    L.$('a-reset').addEventListener('click', G.reset);
    L.$('a-totray').addEventListener('click', function () { if (G.sel && G.sel.free && L.isOn(G.sel)) G.toTray(G.sel); });
  };

  G.start = function (spec) {
    var lv;
    if (spec.kind === 'level') lv = L.getLevel(spec.idx);
    else if (spec.kind === 'daily') lv = L.dailyLevel(spec.date);
    else lv = L.cloneLevel(spec.lv);
    if (!lv.byId) L.indexLevel(lv);
    G.lv = lv; G.spec = spec; G.init0 = L.snap(lv);
    G.moves = 0; G.time = 0; G.hints = 0; G.undo = []; G.redo = []; G.solved = false;
    G.sel = null; G.traySel = null; G.prevLit = {}; G.idle = 0; G.lastHint = null; G.overSaid = 0;
    G.board.resize(); G.board.setLevel(lv);
    G.board.cursor = { x: Math.floor(lv.w / 2), y: Math.floor(lv.h / 2) };
    G.retrace(true);
    L.ui.renderTray(); L.ui.gameTitle(); L.ui.hud(); L.ui.selUI();
    L.audio.setWorld(lv.world);
    var tip = spec.kind === 'level' ? L.MECHANIC_TIPS[spec.idx] : null;
    if (!tip && lv.pieces.some(function (p) { return p.free; }) && spec.kind === 'level' && !L.save.trayTold) { tip = L.LINES.trayIntro; L.save.trayTold = true; L.persist(); }
    L.ui.say(tip || L.pickLine(L.LINES.start), tip ? 7000 : 4200);
  };

  G.retrace = function (initial) {
    var lv = G.lv, tr = L.trace(lv), idx = 0;
    G.board.tr = tr;
    lv.pieces.forEach(function (p) {
      if (p.t !== 'crystal') return;
      var on = tr.hits[p.id] === p.c;
      if (!initial) {
        if (on && !G.prevLit[p.id]) { G.board.burst(p.x, p.y, p.c, 30); L.audio.play('crystal', idx); L.vibrate(8); }
        else if (!on && G.prevLit[p.id]) L.audio.play('unlit');
      }
      G.prevLit[p.id] = on; idx++;
    });
    var nOver = Object.keys(tr.over).length;
    if (!initial && nOver && G.overSaid < 2 && Math.random() < 0.5) { G.overSaid++; L.ui.say(L.LINES.over, 3500); }
    L.ui.litMeter(tr);
    if (tr.solved && !G.solved && !initial) G.win();
    return tr;
  };

  function act(fn) {
    if (G.solved || !G.lv) return false;
    var before = L.snap(G.lv);
    if (!fn()) return false;
    G.undo.push(before); if (G.undo.length > 400) G.undo.shift();
    G.redo.length = 0; G.moves++; G.idle = 0; G.board.hint = null;
    if (G.moves === 40 && G.lv.par < 12) L.ui.say(L.LINES.many, 3500);
    G.retrace(); L.ui.hud();
    return true;
  }

  G.select = function (p) { G.sel = p; G.board.sel = p; L.ui.selUI(); };
  G.setTraySel = function (id) { G.traySel = id; G.board.traySel = id != null; L.ui.renderTray(); };

  G.rotate = function (p, dir) {
    if (!L.interactive(p)) { G.denyPiece(p); return; }
    if (act(function () { L.setState(p, p.s + L.stepFor(p, dir)); return true; })) {
      G.board.pulse(p);
      L.audio.play(p.t === 'slider' ? 'slide' : 'rotate', p.s);
    }
  };
  G.denyPiece = function (p) {
    G.board.pulse(p); L.audio.play('deny');
    if (p.t === 'crystal') L.ui.say(L.pickLine(L.LINES.crystal), 3500);
    else if (p.t !== 'emitter' || Math.random() < 0.5) L.ui.say(L.pickLine(L.LINES.fixed), 3000);
  };

  G.onTap = function (cell, e, button) {
    if (G.solved) return;
    if (!cell) { G.select(null); if (G.traySel != null) G.setTraySel(null); return; }
    var lv = G.lv, p = L.pieceAt(lv, cell.x, cell.y);
    G.board.cursor = { x: cell.x, y: cell.y };
    if (G.traySel != null) {
      var tp = lv.byId[G.traySel];
      if (!p && tp && L.cellFree(lv, cell.x, cell.y)) { G.place(tp, cell.x, cell.y); return; }
      if (!p) { L.audio.play('deny'); return; }
      G.setTraySel(null);
    }
    if (p) {
      G.select(p);
      if (L.interactive(p)) G.rotate(p, button === 2 ? -1 : 1);
      else if (!p.free) G.denyPiece(p);
      else L.audio.play('click');
    } else if (G.sel && G.sel.free && L.isOn(G.sel) && L.cellFree(lv, cell.x, cell.y, G.sel)) {
      G.place(G.sel, cell.x, cell.y);
    } else G.select(null);
  };
  G.onLong = function (cell) {
    if (G.solved || !cell) return;
    var p = L.pieceAt(G.lv, cell.x, cell.y); if (!p) return;
    G.select(p); L.vibrate(12);
    if (L.interactive(p)) G.rotate(p, -1);
    else if (p.free) L.ui.say('Drag it to move it, or use the ⤓ button to send it back to the tray.', 3500);
  };
  G.onWheel = function (cell, dir) {
    if (G.solved || !cell) return;
    var p = L.pieceAt(G.lv, cell.x, cell.y);
    if (p && L.interactive(p)) { G.select(p); G.rotate(p, dir); }
  };
  G.rotSel = function (dir) {
    if (G.solved) return;
    var p = G.sel;
    if (!p && G.board.showCursor) p = L.pieceAt(G.lv, G.board.cursor.x, G.board.cursor.y);
    if (!p) { L.toast('Select a piece first — tap one on the board.'); return; }
    if (L.interactive(p)) G.rotate(p, dir); else G.denyPiece(p);
  };

  // ----- drags -----
  G.dragStart = function (g, e) {
    var c = g.cell; if (!c || G.solved) return null;
    var p = L.pieceAt(G.lv, c.x, c.y); if (!p) return null;
    if (p.free) {
      g.kind = 'move'; g.p = p;
      G.board.drag = { p: p, cell: null, ok: false, lx: 0, ly: 0 };
      G.dragMove(g, e); L.audio.play('lift'); G.select(p);
      return 'move';
    }
    if (L.angular(p) && L.interactive(p)) {
      var cc = G.board.clientOf(p.x, p.y);
      g.kind = 'rot'; g.p = p; g.cx = cc[0]; g.cy = cc[1];
      g.alast = Math.atan2(g.y0 - cc[1], g.x0 - cc[0]); g.acc = 0; g.s0 = p.s; g.before = L.snap(G.lv); g.counted = false;
      G.select(p);
      return 'rot';
    }
    return null;
  };
  G.dragMove = function (g, e) {
    if (G.solved && g.kind !== 'move') return;
    if (g.kind === 'move') {
      var l = G.board.local(e.clientX, e.clientY), cell = G.board.cellAt(e.clientX, e.clientY);
      G.board.drag.lx = l[0]; G.board.drag.ly = l[1]; G.board.drag.cell = cell;
      G.board.drag.ok = !!(cell && L.cellFree(G.lv, cell.x, cell.y, g.p));
      return;
    }
    if (g.kind === 'rot') {
      var a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx), d = a - g.alast;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      g.acc += d; g.alast = a;
      var steps = Math.round(g.acc / (Math.PI / 8)), ns = (((g.s0 - steps) % 8) + 8) % 8;
      if (ns !== g.p.s) {
        if (!g.counted) { g.counted = true; G.undo.push(g.before); G.redo.length = 0; G.moves++; L.ui.hud(); }
        L.setState(g.p, ns); G.board.hint = null; G.idle = 0;
        L.audio.play('rotate', ns); L.vibrate(4);
        G.retrace();
      }
    }
  };
  G.dragEnd = function (g, e, cancel) {
    if (g.kind === 'move') {
      G.board.drag = null;
      if (cancel || G.solved) return;
      var cell = G.board.cellAt(e.clientX, e.clientY), p = g.p;
      if (cell && L.cellFree(G.lv, cell.x, cell.y, p)) { if (cell.x !== p.x || cell.y !== p.y) G.place(p, cell.x, cell.y); }
      else if (!cell) G.toTray(p);
      else L.audio.play('deny');
    }
  };

  G.place = function (p, x, y) {
    if (act(function () { p.placed = true; p.x = x; p.y = y; return true; })) {
      G.board.pos[p.id] = [x, y]; G.board.pulse(p); G.board.burst(x, y, 7, 8);
      L.audio.play('place'); L.vibrate(10);
      G.traySel = null; G.board.traySel = false;
      L.ui.renderTray(); G.select(p);
    }
  };
  G.toTray = function (p) {
    if (act(function () { p.placed = false; p.x = -1; p.y = -1; return true; })) {
      L.audio.play('lift'); G.select(null); L.ui.renderTray();
    }
  };
  G.after = function () {
    G.board.hint = null;
    G.lv.pieces.forEach(function (p) { G.board.pos[p.id] = G.board.pos[p.id] && L.isOn(p) ? G.board.pos[p.id] : [p.x, p.y]; });
    if (G.sel && !L.isOn(G.sel)) G.select(null);
    G.retrace(); L.ui.renderTray(); L.ui.hud(); L.ui.selUI();
  };
  G.doUndo = function () {
    if (G.solved || !G.lv) return;
    if (!G.undo.length) { L.ui.say(L.LINES.undoEmpty, 2500); L.audio.play('deny'); return; }
    G.redo.push(L.snap(G.lv)); L.restore(G.lv, G.undo.pop()); G.after(); L.audio.play('undo');
  };
  G.doRedo = function () {
    if (G.solved || !G.lv) return;
    if (!G.redo.length) { L.ui.say(L.LINES.redoEmpty, 2500); L.audio.play('deny'); return; }
    G.undo.push(L.snap(G.lv)); L.restore(G.lv, G.redo.pop()); G.after(); L.audio.play('redo');
  };
  G.reset = function () {
    if (G.solved || !G.lv) return;
    L.restore(G.lv, G.init0); G.undo = []; G.redo = []; G.moves = 0; G.time = 0; G.traySel = null; G.board.traySel = false;
    G.select(null); G.after(); G.board.reveal = L.motionReduced() ? Infinity : 0;
    L.audio.play('whoosh'); L.ui.say(L.LINES.reset, 3000);
  };

  // ----- hints -----
  function findHint() {
    var lv = G.lv;
    for (var i = 0; i < lv.sol.length; i++) {
      var so = lv.sol[i], p = lv.byId[so.id];
      if (!p || p.decoy) continue;
      if (p.free && (!L.isOn(p) || p.x !== so.x || p.y !== so.y)) return { p: p, so: so, kind: 'place' };
      if (L.nStates(p) > 1 && p.s !== so.s) return { p: p, so: so, kind: 'rot' };
    }
    return null;
  }
  G.hint = function () {
    if (G.solved || !G.lv) return;
    var target = findHint();
    if (!target) { L.ui.say(L.LINES.noHint, 4000); return; }
    if (G.lastHint && G.lastHint.p === target.p && G.lastHint.kind === target.kind && G.board.hint && G.board.hint.until > G.board.t) { G.applyHint(target); return; }
    G.hints++; L.save.hints = (L.save.hints || 0) + 1; L.persist();
    G.lastHint = target;
    var p = target.p, so = target.so, msg = '', dir = 0;
    if (target.kind === 'place') {
      G.board.hint = { x: so.x, y: so.y, until: G.board.t + 7, dir: 0 };
      msg = (L.isOn(p) ? 'Move the ' : 'Place the ') + G.pname(p) + ' on the glowing tile.';
      if (!L.isOn(p)) { G.setTraySel(p.id); G.select(null); } else G.select(p);
    } else {
      var n = L.nStates(p), fwd = (((so.s - p.s) % n) + n) % n;
      if (p.t === 'slider') msg = 'Slide that blocker out of the beam\'s way.';
      else if (p.t === 'filter') msg = 'Tap the filter ' + fwd + '× to tint it ' + L.COLOR_NAMES[L.FILTERS[so.s]].toLowerCase() + '.';
      else if (p.t === 'lens') msg = 'Flip that lens to bend the other way.';
      else {
        var cw = (((p.s - so.s) % n) + n) % n, ccw = n - cw;
        if (cw <= ccw) { dir = 1; msg = 'Rotate it ' + cw + ' click' + (cw > 1 ? 's' : '') + ' clockwise.'; }
        else { dir = -1; msg = 'Rotate it ' + ccw + ' click' + (ccw > 1 ? 's' : '') + ' anticlockwise (long-press or ⟲).'; }
      }
      G.board.hint = { x: p.x, y: p.y, until: G.board.t + 7, dir: dir };
      G.select(p);
    }
    L.ui.say(L.pickLine(L.LINES.hint) + ' ' + msg + ' ' + L.LINES.hint2, 7000);
    L.audio.play('hint'); L.ui.hud();
  };
  G.applyHint = function (target) {
    var p = target.p, so = target.so, lv = G.lv;
    var ok = act(function () {
      if (target.kind === 'place') {
        var occ = L.pieceAt(lv, so.x, so.y);
        if (occ && occ !== p) { if (!occ.free) return false; occ.placed = false; occ.x = -1; occ.y = -1; }
        p.placed = true; p.x = so.x; p.y = so.y;
      } else L.setState(p, so.s);
      return true;
    });
    if (!ok) return;
    G.board.pos[p.id] = [p.x, p.y];
    G.board.pulse(p); G.board.burst(p.x, p.y, 7, 10); G.board.hint = null; G.lastHint = null;
    G.traySel = null; G.board.traySel = false;
    L.audio.play(target.kind === 'place' ? 'place' : 'rotate', p.s);
    L.ui.renderTray();
  };

  // ----- stars & win -----
  G.calcStars = function () {
    var par = (G.lv && G.lv.par) || 1, s = 1;
    if (G.moves <= par * 2 + 4) s = 2;
    if (G.moves <= par + 1 && G.time <= par * 8 + 30) s = 3;
    if (G.hints > 0) s = Math.min(s, 2);
    return s;
  };
  G.win = function () {
    G.solved = true; G.select(null); G.traySel = null; G.board.traySel = false; G.board.hint = null;
    var stars = G.calcStars(), spec = G.spec, first = false;
    G.lastStars = stars;
    G.board.celebrate(); L.audio.play('win'); L.vibrate([20, 40, 30]);
    if (spec.kind === 'level') {
      var d = L.save.done[spec.idx];
      first = !d;
      if (!d) d = L.save.done[spec.idx] = { s: 0, m: 9999, t: 99999 };
      d.s = Math.max(d.s, stars); d.m = Math.min(d.m, G.moves); d.t = Math.min(d.t, Math.round(G.time));
      L.persist();
    } else if (spec.kind === 'daily') {
      var dd = L.save.daily[spec.date];
      if (!dd || stars > dd.s || (stars === dd.s && G.moves < dd.m)) L.save.daily[spec.date] = { s: stars, m: G.moves, t: Math.round(G.time) };
      L.persist();
    }
    L.ui.say(L.pickLine(L.LINES.win), 4200);
    L.ui.hud(); L.ui.renderTray();
    setTimeout(function () { if (G.solved && G.lv) L.ui.showWin(stars, first); }, L.motionReduced() ? 500 : 1600);
  };

  G.tick = function (dt) {
    if (!G.lv || G.solved || document.hidden) return;
    G.time += dt; G.idle += dt;
    if (G.idle > 55) { G.idle = -40; L.ui.say(L.pickLine(L.LINES.stuck), 5000); }
    G._ht = (G._ht || 0) + dt;
    if (G._ht > 0.25) { G._ht = 0; L.ui.hudTime(); }
  };

  // ----- keyboard -----
  var MV = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  G.key = function (e) {
    var k = e.key, b = G.board, lv = G.lv; if (!lv) return false;
    if (e.ctrlKey || e.metaKey) {
      if (k === 'z' || k === 'Z') { if (e.shiftKey) G.doRedo(); else G.doUndo(); return true; }
      if (k === 'y' || k === 'Y') { G.doRedo(); return true; }
      return false;
    }
    var kl = k.length === 1 ? k.toLowerCase() : k;
    if (MV[kl]) {
      if (!b.showCursor) b.showCursor = true;
      else { b.cursor.x = L.clamp(b.cursor.x + MV[kl][0], 0, lv.w - 1); b.cursor.y = L.clamp(b.cursor.y + MV[kl][1], 0, lv.h - 1); }
      b.hover = null; L.audio.play('click');
      return true;
    }
    if (k === 'Enter' || k === ' ') { b.showCursor = true; G.onTap({ x: b.cursor.x, y: b.cursor.y }, e, e.shiftKey ? 2 : 0); return true; }
    if (kl === 'q' || kl === 'e') {
      b.showCursor = true;
      var p = L.pieceAt(lv, b.cursor.x, b.cursor.y);
      if (p) { G.select(p); if (L.interactive(p)) G.rotate(p, kl === 'q' ? -1 : 1); else G.denyPiece(p); }
      return true;
    }
    if (kl === 'z') { G.doUndo(); return true; }
    if (kl === 'y') { G.doRedo(); return true; }
    if (kl === 'h') { G.hint(); return true; }
    if (kl === 'r') { G.reset(); return true; }
    if (kl === 't' || /^[1-9]$/.test(k)) {
      var tray = lv.pieces.filter(function (q) { return q.free && !L.isOn(q); });
      if (!tray.length) { L.toast('The tray is empty. Everything is already on the board.'); return true; }
      var pick;
      if (kl === 't') { var cur = -1; tray.forEach(function (q, i) { if (q.id === G.traySel) cur = i; }); pick = tray[(cur + 1) % tray.length]; }
      else pick = tray[parseInt(k, 10) - 1];
      if (pick) { G.setTraySel(pick.id); b.showCursor = true; L.ui.say('Move the cursor to an empty tile and press Enter to place it.', 3000); }
      return true;
    }
    if (k === 'Backspace' || k === 'Delete') { if (G.sel && G.sel.free && L.isOn(G.sel)) G.toTray(G.sel); return true; }
    if (k === '+' || k === '=') { b.z = L.clamp(b.z * 1.2, 1, 3); b.clampPan(); return true; }
    if (k === '-' || k === '_') { b.z = L.clamp(b.z / 1.2, 1, 3); b.clampPan(); return true; }
    if (k === '0') { b.resetZoom(); return true; }
    return false;
  };
})();
