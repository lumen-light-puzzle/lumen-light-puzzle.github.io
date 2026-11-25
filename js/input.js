/* Lumen — input.js : pointer (mouse/touch/pen), pinch-zoom, wheel, keyboard routing, gamepad */
(function () {
  'use strict';
  var L = window.L;

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) || 1; }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  /* Generic board gestures. h = {tap(cell,e,button), long(cell,e), dragStart(g,e)->mode|null, dragMove(g,e), dragEnd(g,e), wheel(cell,dir), hover(cell)} */
  L.attachBoardInput = function (board, h) {
    var cv = board.cv, pts = {}, npts = 0, g = null, lastTap = 0;
    function list() { var a = []; for (var k in pts) a.push(pts[k]); return a; }
    cv.addEventListener('pointerdown', function (e) {
      if (L.audio) L.audio.unlock();
      try { cv.focus({ preventScroll: true }); } catch (er) { }
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      if (!pts[e.pointerId]) npts++;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      board.showCursor = false;
      if (npts === 2) {
        if (g && g.timer) clearTimeout(g.timer);
        if (g && g.mode && g.mode !== 'pan' && h.dragEnd) h.dragEnd(g, e, true);
        var a = list();
        g = { pinch: true, d0: dist(a[0], a[1]), z0: board.z, m0: mid(a[0], a[1]), px0: board.px, py0: board.py };
        return;
      }
      if (npts > 2) return;
      var cell = board.cellAt(e.clientX, e.clientY);
      g = { x0: e.clientX, y0: e.clientY, t0: performance.now(), cell: cell, moved: false, button: e.button, type: e.pointerType, mode: null, longDone: false };
      var gg = g;
      if (e.button === 0 || e.pointerType !== 'mouse') {
        g.timer = setTimeout(function () {
          if (g === gg && !gg.moved && !gg.pinch) { gg.longDone = true; if (h.long) h.long(gg.cell, e); }
        }, 480);
      }
      e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) {
        if (e.pointerType === 'mouse' && h.hover) h.hover(board.cellAt(e.clientX, e.clientY));
        return;
      }
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (!g) return;
      if (g.pinch) {
        if (npts >= 2) {
          var a = list(), z = g.z0 * dist(a[0], a[1]) / g.d0;
          board.pinch(z, g.m0, mid(a[0], a[1]), g.z0, g.px0, g.py0);
        }
        return;
      }
      var dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.moved && dx * dx + dy * dy > 81) {
        g.moved = true; clearTimeout(g.timer);
        if (!g.longDone) {
          g.mode = h.dragStart ? h.dragStart(g, e) : null;
          if (!g.mode && board.z > 1.01) { g.mode = 'pan'; g.px0 = board.px; g.py0 = board.py; }
        }
      }
      if (g.moved && g.mode) {
        if (g.mode === 'pan') board.setPan(g.px0 + dx, g.py0 + dy);
        else if (h.dragMove) h.dragMove(g, e);
      }
    });
    function end(e, cancel) {
      if (pts[e.pointerId]) { delete pts[e.pointerId]; npts--; }
      if (npts < 0) npts = 0;
      if (!g) return;
      if (g.pinch) { if (npts === 0) g = null; return; }
      clearTimeout(g.timer);
      if (!cancel && !g.moved && !g.longDone) {
        var now = performance.now();
        if (now - lastTap < 300 && board.z > 1.01 && !g.cell) { board.resetZoom(); }
        lastTap = now;
        if (h.tap) h.tap(g.cell, e, g.button);
      } else if (g.moved && g.mode && g.mode !== 'pan' && h.dragEnd) h.dragEnd(g, e, cancel);
      g = null;
    }
    cv.addEventListener('pointerup', function (e) { end(e, false); });
    cv.addEventListener('pointercancel', function (e) { end(e, true); });
    cv.addEventListener('lostpointercapture', function (e) { if (pts[e.pointerId]) end(e, true); });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && h.hover) h.hover(null); });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    cv.addEventListener('dblclick', function (e) { e.preventDefault(); });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        var z = L.clamp(board.z * (e.deltaY > 0 ? 0.9 : 1.1), 1, 3), m = { x: e.clientX, y: e.clientY };
        board.pinch(z, m, m, board.z, board.px, board.py);
      } else if (h.wheel) {
        var now = performance.now();
        if (now - (board._wt || 0) < 90) return;
        board._wt = now;
        h.wheel(board.cellAt(e.clientX, e.clientY), e.deltaY > 0 ? 1 : -1);
      }
    }, { passive: false });
  };

  /* ---------- Gamepad: maps to synthetic keys ---------- */
  var PAD_MAP = { 0: 'Enter', 1: 'q', 2: 'h', 3: 'z', 4: 'y', 5: 't', 8: 'Escape', 9: 'Escape', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
  var prev = {}, axisHeld = {}, repeatAt = {};
  L.pad = {
    connected: false,
    poll: function () {
      if (!navigator.getGamepads) return;
      var pads; try { pads = navigator.getGamepads(); } catch (e) { return; }
      if (!pads) return;
      var now = performance.now();
      for (var i = 0; i < pads.length; i++) {
        var gp = pads[i]; if (!gp) continue;
        L.pad.connected = true;
        for (var b in PAD_MAP) {
          var btn = gp.buttons[b], down = !!(btn && (btn.pressed || btn.value > 0.5)), key = i + ':' + b;
          if (down && !prev[key]) { L.onKey({ key: PAD_MAP[b], pad: true, preventDefault: function () { } }); repeatAt[key] = now + 380; }
          else if (down && b >= 12 && now > (repeatAt[key] || 0)) { L.onKey({ key: PAD_MAP[b], pad: true, preventDefault: function () { } }); repeatAt[key] = now + 130; }
          prev[key] = down;
        }
        var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, dirs = [];
        if (ax < -0.6) dirs.push('ArrowLeft'); if (ax > 0.6) dirs.push('ArrowRight');
        if (ay < -0.6) dirs.push('ArrowUp'); if (ay > 0.6) dirs.push('ArrowDown');
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach(function (k) {
          var held = dirs.indexOf(k) >= 0, id = i + ':' + k;
          if (held && (!axisHeld[id] || now > axisHeld[id])) { L.onKey({ key: k, pad: true, preventDefault: function () { } }); axisHeld[id] = now + (axisHeld[id] ? 140 : 380); }
          if (!held) axisHeld[id] = 0;
        });
      }
    }
  };
  window.addEventListener('gamepadconnected', function () { L.pad.connected = true; L.toast('🎮 Gamepad connected — A rotate · B reverse · X hint · Y undo'); });

  /* ---------- spatial focus for menus (keyboard arrows / gamepad) ---------- */
  L.focusMove = function (key) {
    var scope = document.querySelector('.modal:not([hidden]) .modal-card') || document.querySelector('.screen.active');
    if (!scope) return;
    var els = Array.prototype.slice.call(scope.querySelectorAll('button:not([disabled]):not([hidden]), a[href], input, select, textarea'))
      .filter(function (el) { return el.offsetParent !== null; });
    if (!els.length) return;
    var cur = document.activeElement;
    if (els.indexOf(cur) < 0) { els[0].focus(); return; }
    var r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2, best = null, bd = 1e9;
    els.forEach(function (el) {
      if (el === cur) return;
      var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - cx, dy = y - cy;
      var ok = key === 'ArrowUp' ? dy < -4 : key === 'ArrowDown' ? dy > 4 : key === 'ArrowLeft' ? dx < -4 : dx > 4;
      if (!ok) return;
      var d = (key === 'ArrowUp' || key === 'ArrowDown') ? Math.abs(dy) + Math.abs(dx) * 2 : Math.abs(dx) + Math.abs(dy) * 2;
      if (d < bd) { bd = d; best = el; }
    });
    if (best) { best.focus(); try { best.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { } }
  };
})();
