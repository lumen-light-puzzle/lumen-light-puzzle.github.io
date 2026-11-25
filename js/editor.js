/* Lumen — editor.js : the Level Workshop (build, live-trace, test, share codes) */
(function () {
  'use strict';
  var L = window.L, $ = L.$;
  var E = L.editor = { data: null, tool: 'mirror', color: 7, board: null, lv: null, nid: 0 };
  var TOOLS = [
    { t: 'emitter', n: 'Emitter', tip: 'Emitters shoot light. Tap one again to turn it 45°.' },
    { t: 'crystal', n: 'Crystal', tip: 'Crystals take the selected colour. Tap one to repaint it.' },
    { t: 'mirror', n: 'Mirror', tip: 'Tap a mirror to rotate it 22.5°. Right-click / long-press removes.' },
    { t: 'splitter', n: 'Splitter', tip: 'Half passes, half reflects. Tap to rotate.' },
    { t: 'prism', n: 'Prism', tip: 'Splits white into red (left), green (straight) and blue (right).' },
    { t: 'filter', n: 'Filter', tip: 'Keeps only its colour. Tap to change tint.' },
    { t: 'lens', n: 'Lens', tip: 'Bends beams by 45° (diagonals!). Tap to flip.' },
    { t: 'portal', n: 'Portal', tip: 'Portals pair up in the order you place them.' },
    { t: 'wall', n: 'Wall', tip: 'Walls swallow light. Very rude.' },
    { t: 'erase', n: 'Eraser', tip: 'Tap a piece to remove it.' }
  ];
  var SW = [7, 1, 2, 4, 3, 6, 5];

  function sample() {
    return {
      name: 'My first puzzle', w: 6, h: 6, tray: false, pieces: [
        { id: 0, t: 'emitter', x: 0, y: 3, s: 0, c: 7, d: 0 },
        { id: 1, t: 'mirror', x: 3, y: 3, s: 2, c: 0, d: 0 },
        { id: 2, t: 'crystal', x: 3, y: 0, s: 0, c: 7, d: 0 },
        { id: 3, t: 'wall', x: 5, y: 1, s: 0, c: 0, d: 0 }
      ]
    };
  }
  function load() {
    var d = null;
    if (L.save.draft && typeof L.save.draft === 'string') { try { d = L.decodeData(L.save.draft); } catch (e) { d = null; } }
    return d || sample();
  }
  var saveT = 0;
  function persistDraft() {
    clearTimeout(saveT);
    saveT = setTimeout(function () { try { L.save.draft = L.encodeLevel(E.data); L.persist(); } catch (e) { } }, 400);
  }

  function status(msg) {
    var el = $('e-status');
    if (msg) { el.textContent = msg; clearTimeout(E._mt); E._mt = setTimeout(function () { status(); }, 3200); return; }
    var tr = E.board.tr, em = E.data.pieces.some(function (p) { return p.t === 'emitter'; });
    el.textContent = !em ? 'Place an emitter to begin' : !tr || !tr.total ? 'Now add a crystal to light' :
      tr.solved ? '✓ Solved as built — Test or Share it' : 'Lit ' + tr.lit + ' / ' + tr.total + ' · build it solved, we scramble it';
  }

  function sync(full) {
    L.pairPortals(E.data.pieces);
    E.lv.w = E.data.w; E.lv.h = E.data.h; E.lv.pieces = E.data.pieces; E.lv.name = E.data.name;
    L.indexLevel(E.lv);
    if (full) { E.board.setLevel(E.lv, true); E.board.resize(); }
    E.board.tr = L.trace(E.lv);
    status();
    persistDraft();
  }

  function palette() {
    var h = '';
    TOOLS.forEach(function (t, k) {
      var on = E.tool === t.t;
      h += '<button class="pal' + (on ? ' on' : '') + '" data-tool="' + t.t + '" aria-pressed="' + on + '" title="' + t.n + ' (' + ((k + 1) % 10) + ')">' +
        (t.t === 'erase' ? '<span class="pal-x" aria-hidden="true">⌫</span>' : '<img src="' + L.draw.icon(t.t, t.t === 'crystal' || t.t === 'emitter' ? E.color : null, 64) + '" alt="">') +
        '<small>' + t.n + '</small></button>';
    });
    h += '<span class="pal-sep" aria-hidden="true"></span>';
    SW.forEach(function (c) {
      var on = E.color === c;
      h += '<button class="swatch' + (on ? ' on' : '') + '" data-color="' + c + '" style="--c:' + L.col(c) + '" aria-pressed="' + on + '" aria-label="Colour ' + L.COLOR_NAMES[c] + '"><i></i></button>';
    });
    $('ed-palette').innerHTML = h;
  }

  function remove(p, quiet) {
    var i = E.data.pieces.indexOf(p); if (i >= 0) E.data.pieces.splice(i, 1);
    if (!quiet) { L.audio.play('lift'); E.board.burst(p.x, p.y, 7, 6); sync(); }
  }
  function apply(x, y, dir) {
    var p = L.pieceAt(E.lv, x, y), t = E.tool;
    if (t === 'erase') { if (p) remove(p); else L.audio.play('deny'); return; }
    if (p && p.t === t) {
      if (t === 'emitter') p.d = (p.d + 8 + (dir > 0 ? -1 : 1)) % 8;
      else if (t === 'crystal') p.c = E.color !== p.c ? E.color : SW[(SW.indexOf(p.c) + 1) % SW.length];
      else if (L.nStates(p) > 1) L.setState(p, p.s + L.stepFor(p, dir));
      else { L.audio.play('deny'); status(t.charAt(0).toUpperCase() + t.slice(1) + 's have no settings — only placement.'); return; }
      E.board.pulse(p); L.audio.play('rotate', p.s || p.d || 0); sync(); return;
    }
    if (t === 'portal' && !p && E.data.pieces.filter(function (q) { return q.t === 'portal'; }).length >= 6) { L.toast('Six portals is plenty. Any more and physics files a complaint.'); return; }
    if (E.data.pieces.length >= 80 && !p) { L.toast('That board is very full. The photons need elbow room.'); return; }
    if (p) remove(p, true);
    var np = { id: E.nid++, t: t, x: x, y: y, s: 0, c: 0, d: 0 };
    if (t === 'emitter') { np.c = E.color; np.d = x === 0 ? 0 : x === E.data.w - 1 ? 4 : y === 0 ? 6 : y === E.data.h - 1 ? 2 : 0; }
    if (t === 'crystal') np.c = E.color;
    if (t === 'mirror' || t === 'splitter') np.s = 2;
    if (t === 'filter') np.s = Math.max(0, L.FILTERS.indexOf(E.color));
    E.data.pieces.push(np); E.board.pos[np.id] = [x, y]; E.board.anim[np.id] = E.board.targetAngle(np);
    E.board.pulse(np); E.board.burst(x, y, np.c || 7, 8);
    L.audio.play('place'); L.vibrate(8); sync();
  }

  E.tap = function (cell, e, button) { if (!cell) return; E.board.cursor = { x: cell.x, y: cell.y }; apply(cell.x, cell.y, button === 2 ? -1 : 1); };
  E.long = function (cell) { if (!cell) return; var p = L.pieceAt(E.lv, cell.x, cell.y); if (p) { L.vibrate(12); remove(p); } };
  E.wheel = function (cell, dir) {
    if (!cell) return; var p = L.pieceAt(E.lv, cell.x, cell.y);
    if (p && (L.nStates(p) > 1 || p.t === 'emitter')) { if (p.t === 'emitter') p.d = (p.d + 8 - dir) % 8; else L.setState(p, p.s + L.stepFor(p, dir)); L.audio.play('rotate', p.s || 0); sync(); }
  };

  function fillSelect(id, lo, hi, val) {
    var s = $(id), h = '';
    for (var v = lo; v <= hi; v++) h += '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + v + '</option>';
    s.innerHTML = h;
  }
  function resizeTo(w, h) {
    E.data.w = w; E.data.h = h;
    E.data.pieces = E.data.pieces.filter(function (p) { return p.x < w && p.y < h; });
    sync(true);
  }
  function inputs() {
    fillSelect('ed-w', 3, 10, E.data.w); fillSelect('ed-h', 3, 12, E.data.h);
    $('ed-tray').checked = !!E.data.tray; $('ed-name').value = E.data.name || '';
  }

  E.code = function () { return L.encodeLevel(E.data); };
  E.parse = function (str) {
    str = String(str || '').trim();
    var m = str.match(/play=([A-Za-z0-9_\-%]+)/); if (m) str = m[1];
    try { str = decodeURIComponent(str); } catch (e) { }
    return L.decodeData(str);
  };
  E.playData = function (data, from) {
    var lv;
    try { lv = L.levelFromData(data, L.hash(L.encodeLevel(data))); }
    catch (err) { L.toast(err && err.message && err.message.length < 160 ? err.message : 'That puzzle could not be built.', 4500); L.audio.play('deny'); return false; }
    L.ui.show('game', function () { L.game.start({ kind: 'custom', lv: lv, from: from }); L.bg.setTheme('void'); });
    return true;
  };
  E.shareLink = function (code) { return location.href.split('#')[0].split('?')[0] + '#play=' + code; };

  function exportModal() {
    var code = E.code(), link = E.shareLink(code), ok = E.board.tr && E.board.tr.solved;
    var body = L.ui.modal('<div class="share"><p class="kicker">Level Workshop</p><h2 id="modal-title">Share “' + L.esc(E.data.name || 'Untitled') + '”</h2>' +
      (ok ? '<p>Anyone with this code or link can play your puzzle — it is scrambled automatically, and your solution powers the hint button.</p>'
        : '<p class="warn">Heads-up: as built, not every crystal is lit. Friends can import it to edit, but it cannot be played until it is solved.</p>') +
      '<label class="lbl" for="sh-code">Share code</label><textarea id="sh-code" class="code" readonly rows="3">' + code + '</textarea>' +
      '<label class="lbl" for="sh-link">Direct link</label><input id="sh-link" class="code" readonly value="' + L.esc(link) + '">' +
      '<div class="mbtns"><button class="btn primary" id="sh-copy" data-focus><span>Copy link</span></button><button class="btn" id="sh-copyc"><span>Copy code</span></button>' +
      (navigator.share ? '<button class="btn ghost" id="sh-native"><span>Share…</span></button>' : '') + '</div></div>', { cls: 'share-card' });
    $('sh-copy').addEventListener('click', function () { L.copyText(link); });
    $('sh-copyc').addEventListener('click', function () { L.copyText(code); });
    if ($('sh-native')) $('sh-native').addEventListener('click', function () { navigator.share({ title: 'Lumen puzzle: ' + (E.data.name || 'Untitled'), text: 'Can you light every crystal?', url: link }).catch(function () { }); });
    body.querySelector('#sh-code').addEventListener('focus', function () { this.select(); });
  }
  function importModal() {
    L.ui.modal('<div class="share"><p class="kicker">Level Workshop</p><h2 id="modal-title">Import a puzzle</h2>' +
      '<p>Paste a share code or link. Codes are just compressed light — no servers involved.</p>' +
      '<textarea id="im-code" class="code" rows="4" placeholder="Paste code or link here" aria-label="Share code or link" data-focus></textarea>' +
      '<div class="mbtns"><button class="btn primary" id="im-play"><span>▶ Play it</span></button><button class="btn" id="im-edit"><span>✎ Open in Workshop</span></button></div></div>', { cls: 'share-card' });
    function get() {
      try { return E.parse($('im-code').value); }
      catch (e) { L.toast('Hmm, that code is not valid. Check you copied all of it.', 3500); L.audio.play('deny'); return null; }
    }
    $('im-play').addEventListener('click', function () { var d = get(); if (!d) return; L.ui.close(true); E.playData(d, 'editor'); });
    $('im-edit').addEventListener('click', function () { var d = get(); if (!d) return; E.setData(d); L.ui.close(true); L.toast('Imported “' + d.name + '” ✓'); });
  }

  E.setData = function (d) {
    E.data = d; E.nid = 0;
    d.pieces.forEach(function (p) { E.nid = Math.max(E.nid, p.id + 1); });
    inputs(); sync(true);
  };

  E.init = function () {
    E.data = load();
    E.data.pieces.forEach(function (p) { E.nid = Math.max(E.nid, p.id + 1); });
    E.lv = { w: E.data.w, h: E.data.h, theme: 'void', pieces: E.data.pieces, world: -1 };
    L.indexLevel(E.lv);
    E.board = new L.Board($('ed-board'), { mode: 'edit' });
    L.attachBoardInput(E.board, { tap: E.tap, long: E.long, wheel: E.wheel, hover: function (c) { E.board.hover = c; } });
    palette(); inputs();
    $('ed-palette').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null; if (!b) return;
      if (b.hasAttribute('data-tool')) {
        E.tool = b.getAttribute('data-tool');
        TOOLS.forEach(function (t) { if (t.t === E.tool) status(t.tip); });
      } else if (b.hasAttribute('data-color')) { E.color = +b.getAttribute('data-color'); status('Colour: ' + L.COLOR_NAMES[E.color] + '. New emitters, crystals and filters use it.'); }
      palette(); L.audio.play('click');
    });
    $('ed-w').addEventListener('change', function () { resizeTo(+this.value, E.data.h); });
    $('ed-h').addEventListener('change', function () { resizeTo(E.data.w, +this.value); });
    $('ed-tray').addEventListener('change', function () { E.data.tray = this.checked; persistDraft(); status(this.checked ? 'Mirrors will start in the player’s tray.' : 'Mirrors stay where you put them (just scrambled).'); });
    $('ed-name').addEventListener('input', function () { E.data.name = this.value.slice(0, 32); persistDraft(); });
    var armed = false;
    $('ed-clear').addEventListener('click', function () {
      var b = this;
      if (!armed) { armed = true; b.textContent = 'Sure?'; setTimeout(function () { armed = false; b.textContent = 'Clear'; }, 3000); return; }
      armed = false; b.textContent = 'Clear';
      E.data.pieces = []; L.audio.play('whoosh'); sync(true); status('Blank canvas. Infinite possibilities. Mild panic.');
    });
    $('e-back').addEventListener('click', function () { L.ui.show('title'); });
    $('e-test').addEventListener('click', function () { E.playData(E.data, 'editor'); });
    $('e-export').addEventListener('click', exportModal);
    $('e-import').addEventListener('click', importModal);
  };
  E.enter = function () { inputs(); palette(); sync(true); };

  E.key = function (e) {
    var k = e.key, b = E.board, kl = k.length === 1 ? k.toLowerCase() : k;
    var MV = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    var ae = document.activeElement;
    if (ae && ae !== b.cv && ae !== document.body && !e.pad) return false;
    if (MV[k]) {
      if (!b.showCursor) b.showCursor = true;
      else { b.cursor.x = L.clamp(b.cursor.x + MV[k][0], 0, E.data.w - 1); b.cursor.y = L.clamp(b.cursor.y + MV[k][1], 0, E.data.h - 1); }
      return true;
    }
    if (k === 'Enter' || k === ' ' || kl === 'e') { b.showCursor = true; apply(b.cursor.x, b.cursor.y, e.shiftKey ? -1 : 1); return true; }
    if (kl === 'q') { b.showCursor = true; apply(b.cursor.x, b.cursor.y, -1); return true; }
    if (k === 'Delete' || k === 'Backspace') { var p = L.pieceAt(E.lv, b.cursor.x, b.cursor.y); if (p) remove(p); return true; }
    if (/^[0-9]$/.test(k)) { var i = (parseInt(k, 10) + 9) % 10; if (TOOLS[i]) { E.tool = TOOLS[i].t; palette(); status(TOOLS[i].tip); } return true; }
    return false;
  };
})();
