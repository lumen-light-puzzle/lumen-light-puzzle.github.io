/* Lumen — ui.js : screens & transitions, world map, HUD, tray, modals, settings, story */
(function () {
  'use strict';
  var L = window.L, $ = L.$;
  var U = L.ui = { screen: 'title', modalOpen: false, booted: false };
  function each(sel, fn, root) { Array.prototype.forEach.call((root || document).querySelectorAll(sel), fn); }
  U.each = each;
  function starStr(n) { var s = ''; for (var k = 0; k < 3; k++) s += k < n ? '★' : '☆'; return s; }

  /* ---------------- screens ---------------- */
  U.show = function (name, cb) {
    var next = $('scr-' + name); if (!next) return;
    var veil = $('veil');
    function swap() {
      each('.screen', function (el) {
        var on = el === next;
        el.classList.toggle('active', on);
        if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true');
        if ('inert' in el) el.inert = !on;
      });
      U.screen = name;
      if (name === 'title') { L.bg.setTheme('title'); U.refreshTitle(); }
      if (name === 'map') { U.renderMap(); L.bg.setTheme(L.WORLDS[Math.floor(U.frontier() / L.PER_WORLD)].key); }
      if (name === 'editor') L.bg.setTheme('void');
      if (cb) cb();
      setTimeout(function () {
        var f = name === 'game' ? $('board') : name === 'editor' ? $('ed-board') : name === 'map' ? document.querySelector('.node.current') || $('map-back') : $('btn-play');
        try { if (f) f.focus({ preventScroll: name !== 'map' }); } catch (e) { }
        if (name === 'map') { var cur = document.querySelector('.node.current'); if (cur) try { cur.scrollIntoView({ block: 'center' }); } catch (e2) { } }
      }, 60);
      setTimeout(function () { if (L.onResize) L.onResize(); }, 650);
    }
    if (L.motionReduced() || !U.booted) { swap(); return; }
    veil.classList.remove('out'); void veil.offsetWidth; veil.classList.add('in');
    L.audio.play('whoosh');
    setTimeout(function () { swap(); veil.classList.remove('in'); veil.classList.add('out'); }, 430);
  };

  U.back = function () {
    if (U.modalOpen) { U.close(); return; }
    var s = U.screen, G = L.game;
    if (s === 'game') {
      var sp = G.spec || {};
      if (sp.kind === 'level') U.show('map');
      else if (sp.from === 'editor') U.show('editor', function () { L.editor.enter(); });
      else U.show('title');
    } else if (s === 'map' || s === 'editor') U.show('title');
  };

  /* ---------------- progress helpers ---------------- */
  U.unlocked = function (i) { return i === 0 || !!L.save.done[i - 1] || !!L.save.done[i]; };
  U.frontier = function () { for (var i = 0; i < L.TOTAL; i++) if (!L.save.done[i]) return i; return L.TOTAL - 1; };
  U.totalStars = function () { var t = 0; for (var k in L.save.done) t += (L.save.done[k] && L.save.done[k].s) || 0; return t; };

  /* ---------------- world map ---------------- */
  var PTS = [[12, 30], [37, 20], [63, 32], [88, 22], [86, 74], [62, 82], [37, 70], [12, 80]];
  function trailPath(n) {
    var d = 'M' + PTS[0][0] + ' ' + PTS[0][1];
    for (var k = 1; k < n; k++) {
      var a = PTS[k - 1], b = PTS[k];
      if (k === 4) d += ' C 104 ' + a[1] + ', 104 ' + b[1] + ', ' + b[0] + ' ' + b[1];
      else { var mx = (a[0] + b[0]) / 2; d += ' C ' + mx + ' ' + a[1] + ', ' + mx + ' ' + b[1] + ', ' + b[0] + ' ' + b[1]; }
    }
    return d;
  }
  U.renderMap = function () {
    var host = $('map-worlds'), html = '', front = U.frontier();
    L.WORLDS.forEach(function (W, wi) {
      var i0 = wi * L.PER_WORLD, open = U.unlocked(i0), litN = 0, ws = 0;
      for (var j = 0; j < L.PER_WORLD; j++) { if (U.unlocked(i0 + j)) litN = j + 1; var dj = L.save.done[i0 + j]; if (dj) ws += dj.s; }
      html += '<section class="world w-' + W.key + (open ? '' : ' locked') + '" style="--accent:' + W.accent + ';--wd:' + wi + '" aria-label="World ' + (wi + 1) + ': ' + L.esc(W.name) + '">';
      html += '<header class="world-head"><div><span class="world-num">World ' + (wi + 1) + ' · ★ ' + ws + '/24</span><h3>' + L.esc(W.name) + '</h3><p>' + L.esc(W.sub) + '</p></div>';
      html += open ? '<button class="chip story-btn" data-story="' + wi + '" aria-label="Read the story of ' + L.esc(W.name) + '">📜 Story</button>'
        : '<span class="lock-note">🔒 Light up ' + L.esc(L.WORLDS[wi - 1].name) + ' first</span>';
      html += '</header><div class="trail"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<path class="trail-base" d="' + trailPath(8) + '" vector-effect="non-scaling-stroke"/>' +
        (litN > 1 ? '<path class="trail-lit" d="' + trailPath(litN) + '" vector-effect="non-scaling-stroke"/><path class="trail-spark" d="' + trailPath(litN) + '" vector-effect="non-scaling-stroke"/>' : '') +
        '</svg>';
      for (var k = 0; k < L.PER_WORLD; k++) {
        var i = i0 + k, d = L.save.done[i], un = U.unlocked(i), r = L.RECIPES[i];
        var cls = 'node' + (d ? ' done' : '') + (un ? '' : ' locked') + (i === front && !d ? ' current' : '') + (d && d.s === 3 ? ' perfect' : '');
        var lab = 'Level ' + (i + 1) + ': ' + r.n + (un ? (d ? ', ' + d.s + ' of 3 stars' : ', not yet solved') : ', locked');
        html += '<button class="' + cls + '" style="left:' + PTS[k][0] + '%;top:' + PTS[k][1] + '%;--k:' + k + '" data-level="' + i + '" aria-label="' + L.esc(lab) + '">' +
          '<span class="node-gem" aria-hidden="true"></span><b>' + (un ? k + 1 : '🔒') + '</b>' +
          (un ? '<span class="nstars" aria-hidden="true">' + starStr(d ? d.s : 0) + '</span><span class="nname" aria-hidden="true">' + L.esc(r.n) + '</span>' : '') + '</button>';
      }
      html += '</div></section>';
    });
    host.innerHTML = html;
    $('star-total').textContent = '★ ' + U.totalStars() + ' / ' + (L.TOTAL * 3);
  };

  U.playLevel = function (i) {
    if (i >= L.TOTAL) { U.show('map'); return; }
    var wi = Math.floor(i / L.PER_WORLD);
    if (!L.save.story['i' + wi]) { U.storyIntro(wi, function () { U.playLevel(i); }); return; }
    U.show('game', function () { L.game.start({ kind: 'level', idx: i }); L.bg.setTheme(L.game.lv.theme); });
  };
  U.playDaily = function () {
    var key = L.todayKey();
    U.show('game', function () { L.game.start({ kind: 'daily', date: key }); L.bg.setTheme(L.game.lv.theme); });
  };

  /* ---------------- modal ---------------- */
  U.modal = function (html, opts) {
    opts = opts || {};
    var m = $('modal'), body = $('modal-body'), card = $('modal-card');
    if (!U.modalOpen) U._prevFocus = document.activeElement;
    body.innerHTML = html; card.className = 'modal-card ' + (opts.cls || '');
    card.scrollTop = 0;
    m.hidden = false; U.modalOpen = true; U._onClose = opts.onClose || null;
    m.classList.remove('open'); void m.offsetWidth; m.classList.add('open');
    var f = body.querySelector('[data-focus]') || body.querySelector('button, input, select, textarea, a[href]');
    setTimeout(function () { try { (f || $('modal-x')).focus({ preventScroll: true }); } catch (e) { } }, 40);
    return body;
  };
  U.close = function (silent) {
    var m = $('modal'); if (m.hidden) return;
    m.classList.remove('open'); m.hidden = true; U.modalOpen = false;
    var cb = U._onClose; U._onClose = null;
    try { if (U._prevFocus && U._prevFocus.focus && document.contains(U._prevFocus)) U._prevFocus.focus({ preventScroll: true }); } catch (e) { }
    if (cb && !silent) cb();
  };

  /* ---------------- story ---------------- */
  U.story = function (kicker, title, text, btn, cb, accent) {
    var words = String(text).split(' ').map(function (w, k) { return '<span style="--i:' + k + '">' + L.esc(w) + '</span>'; }).join(' ');
    var body = U.modal('<div class="story" style="--accent:' + (accent || '#ffc46b') + '"><div class="story-orb" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<p class="kicker">' + L.esc(kicker) + '</p><h2 id="modal-title">' + L.esc(title) + '</h2><p class="story-text">' + words + '</p>' +
      '<div class="mbtns"><button class="btn primary" data-act="go" data-focus><span>' + L.esc(btn) + '</span></button></div></div>', { cls: 'story-card', onClose: cb });
    body.querySelector('[data-act="go"]').addEventListener('click', function () { U.close(); });
    L.audio.play('hint');
  };
  U.storyIntro = function (wi, cb) {
    var W = L.WORLDS[wi];
    L.save.story['i' + wi] = 1; L.persist();
    U.story('World ' + (wi + 1) + ' of 5', W.name, W.intro, wi === 0 ? 'Light the way →' : 'Onward →', cb, W.accent);
  };
  U.finale = function (cb) {
    var html = '<div class="story finale"><div class="story-orb" aria-hidden="true"><i></i><i></i><i></i></div><p class="kicker">The End · for now</p>' +
      '<h2 id="modal-title">Let there be Lumen</h2><p class="story-text">You collected <strong>' + U.totalStars() + ' / ' + (L.TOTAL * 3) + '</strong> stars and taught a whole universe to glow. ' +
      'The Daily Prism has a fresh puzzle every day, and the Workshop is waiting for your own devious designs.</p>' +
      '<p class="credit-line">Designed &amp; built by <strong>Kumar Nikhil</strong> · <a href="https://kumarnikhildeveloperaccount.github.io/" target="_blank" rel="noopener">More projects by Kumar Nikhil →</a></p>' +
      '<p class="grat">With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.</p>' +
      '<div class="mbtns"><button class="btn primary" data-act="go" data-focus><span>Back to the Lightways</span></button></div></div>';
    var body = U.modal(html, { cls: 'story-card', onClose: cb });
    body.querySelector('[data-act="go"]').addEventListener('click', function () { U.close(); });
    L.audio.play('win');
  };

  /* ---------------- win ---------------- */
  var WIN_T = ['Radiant!', 'Dazzling!', 'Luminous!', 'Brilliant!', 'Crystal clear!', 'Light work!', 'Gleaming!'];
  U.showWin = function (stars, first) {
    if (U.screen !== 'game') return;
    var G = L.game, sp = G.spec, lv = G.lv, isLv = sp.kind === 'level';
    var st = '';
    for (var k = 0; k < 3; k++) st += '<span class="wstar' + (k < stars ? ' on' : '') + '" style="--k:' + k + '">★</span>';
    var kick = isLv ? L.WORLDS[lv.world].name + ' · Level ' + (sp.idx % L.PER_WORLD + 1) : sp.kind === 'daily' ? 'Daily Prism · ' + sp.date : (sp.from === 'editor' ? 'Workshop test' : 'Shared puzzle');
    var tip = stars === 3 ? 'Flawless. The crystals are composing a song about you.'
      : G.hints ? 'Hints cap a run at 2★. Replay it unaided to claim the third.'
        : 'For 3★: solve in ≤ ' + (lv.par + 1) + ' moves within ' + L.fmtTime(lv.par * 8 + 30) + '.';
    var hasNext = isLv && sp.idx + 1 < L.TOTAL;
    var best = isLv && L.save.done[sp.idx];
    var html = '<div class="win"><div class="win-rays" aria-hidden="true"></div><p class="kicker">' + L.esc(kick) + '</p>' +
      '<h2 id="modal-title">' + L.pickLine(WIN_T) + '</h2><div class="wstars" role="img" aria-label="' + stars + ' of 3 stars">' + st + '</div>' +
      '<dl class="wstats"><div><dt>Moves</dt><dd>' + G.moves + '<small> / par ' + lv.par + '</small></dd></div><div><dt>Time</dt><dd>' + L.fmtTime(G.time) + '</dd></div><div><dt>Hints</dt><dd>' + G.hints + '</dd></div></dl>' +
      (best && !first ? '<p class="win-best">Personal best: ' + starStr(best.s) + ' · ' + best.m + ' moves · ' + L.fmtTime(best.t) + '</p>' : '') +
      '<p class="win-tip">' + L.esc(tip) + '</p><div class="mbtns">' +
      (hasNext ? '<button class="btn primary" data-act="next" data-focus><span>Next level →</span></button>' : '') +
      (sp.kind === 'daily' ? '<button class="btn primary" data-act="share" data-focus><span>Share result</span></button>' : '') +
      '<button class="btn" data-act="replay"><span>↺ Replay</span></button>' +
      '<button class="btn ghost" data-act="back"><span>' + (isLv ? 'World map' : sp.from === 'editor' ? 'Back to Workshop' : 'Title screen') + '</span></button></div></div>';
    var body = U.modal(html, { cls: 'win-card', onClose: function () { U.afterWin('back'); } });
    for (var s2 = 0; s2 < stars; s2++) (function (n) { setTimeout(function () { L.audio.play('star', n); }, 380 + n * 280); })(s2);
    each('[data-act]', function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'share') {
          var txt = 'Lumen · Daily Prism ' + sp.date + ' — ' + starStr(stars) + ' in ' + G.moves + ' moves (' + L.fmtTime(G.time) + '). https://kumarnikhildeveloperaccount.github.io/lumen/';
          if (navigator.share) navigator.share({ title: 'Lumen Daily Prism', text: txt }).catch(function () { L.copyText(txt); });
          else L.copyText(txt);
          return;
        }
        U._onClose = null; U.close(true); U.afterWin(a);
      });
    }, body);
  };
  U.afterWin = function (a) {
    var G = L.game, sp = G.spec;
    function go() {
      if (a === 'replay') { G.start(sp); return; }
      if (a === 'next') { U.playLevel(sp.idx + 1); return; }
      U.back();
    }
    if (sp.kind === 'level' && sp.idx % L.PER_WORLD === L.PER_WORLD - 1) {
      var wi = Math.floor(sp.idx / L.PER_WORLD), W = L.WORLDS[wi];
      if (!L.save.story['o' + wi]) {
        L.save.story['o' + wi] = 1; L.persist();
        U.story('World ' + (wi + 1) + ' complete', W.name + ' is glowing', W.outro, wi === 4 ? 'And then…' : 'Continue →', function () {
          if (wi === 4) U.finale(go); else go();
        }, W.accent);
        return;
      }
    }
    go();
  };

  /* ---------------- game HUD ---------------- */
  var DAILY_NAMES = ['Morning Glint', 'Prism Toast', 'Photon Brunch', 'Coffee & Caustics', 'Rainbow Errand', 'Sunbeam Sudoku', 'Glimmer Commute', 'Lunchtime Lux'];
  U.gameTitle = function () {
    var G = L.game, lv = G.lv, sp = G.spec;
    var top = sp.kind === 'level' ? L.WORLDS[lv.world].name + ' · ' + (sp.idx % L.PER_WORLD + 1) : sp.kind === 'daily' ? 'Daily Prism · ' + sp.date : (sp.from === 'editor' ? 'Workshop test' : 'Shared puzzle');
    $('g-world').textContent = top;
    $('g-name').textContent = sp.kind === 'daily' ? DAILY_NAMES[L.hash(sp.date) % DAILY_NAMES.length] : (lv.name || 'Untitled');
    var zh = $('zoom-hint');
    if (G.board.cs < 40 && (L.perf.mobile || window.innerWidth < 700)) {
      zh.hidden = false; clearTimeout(U._zt); U._zt = setTimeout(function () { zh.hidden = true; }, 4200);
    } else zh.hidden = true;
  };
  U.hud = function () {
    var G = L.game; if (!G.lv) return;
    $('g-moves').textContent = G.moves;
    $('g-par').textContent = 'par ' + G.lv.par;
    var s = G.solved ? (G.lastStars || 1) : G.calcStars(), gs = $('g-stars');
    gs.innerHTML = '<span class="on">' + '★'.repeat(s) + '</span>' + '☆'.repeat(3 - s);
    gs.setAttribute('aria-label', 'Projected stars: ' + s + ' of 3');
    U.hudTime(); U.soundUI();
  };
  U.hudTime = function () { var G = L.game; $('g-time').textContent = L.fmtTime(G.time); var s = G.solved ? (G.lastStars || 1) : G.calcStars(); if (s !== U._ls) { U._ls = s; if (!G.solved) { var gs = $('g-stars'); gs.innerHTML = '<span class="on">' + '★'.repeat(s) + '</span>' + '☆'.repeat(3 - s); gs.classList.remove('drop'); void gs.offsetWidth; gs.classList.add('drop'); } } };
  U.selUI = function () {
    var p = L.game.sel;
    $('a-totray').hidden = !(p && p.free && L.isOn(p));
    var rot = !!(p && L.interactive(p));
    $('a-ccw').classList.toggle('dim', !rot); $('a-cw').classList.toggle('dim', !rot);
  };
  U.say = function (txt, ms) {
    var n = $('narrator'); $('nar-text').textContent = txt;
    n.classList.remove('show'); void n.offsetWidth; n.classList.add('show');
    clearTimeout(U._st); U._st = setTimeout(function () { n.classList.remove('show'); }, ms || 4000);
  };
  U.litMeter = function (tr) {
    var lv = L.game.lv, h = '';
    lv.pieces.forEach(function (p) {
      if (p.t !== 'crystal') return;
      h += '<i class="lm' + (tr.hits[p.id] === p.c ? ' on' : '') + (tr.over[p.id] ? ' bad' : '') + '" style="--c:' + L.col(p.c) + '"></i>';
    });
    $('lit-meter').innerHTML = h + '<span>' + tr.lit + ' / ' + tr.total + ' lit</span>';
  };
  U.soundUI = function () {
    var on = !!L.save.settings.sound, b = $('btn-sound');
    b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on);
    $('btn-sound-label').textContent = on ? 'Sound on — every crystal sings' : 'Sound is off — tap to enable';
    var g = $('g-sound'); g.textContent = on ? '🔊' : '🔇'; g.setAttribute('aria-label', on ? 'Mute sound' : 'Enable sound');
  };
  U.toggleSound = function () {
    L.audio.setEnabled(!L.save.settings.sound); U.soundUI();
    if (L.save.settings.sound) { L.audio.play('hint'); L.toast('🎶 Sound on. Each crystal plays a note of the chord.'); }
    else L.toast('Sound off. The photons will hum quietly to themselves.');
  };

  /* ---------------- tray ---------------- */
  var TNAME = { mirror: 'Mirror', splitter: 'Splitter', prism: 'Prism', filter: 'Filter', lens: 'Lens' };
  U.renderTray = function () {
    var G = L.game, lv = G.lv, tray = $('tray');
    var any = lv && lv.pieces.some(function (p) { return p.free; });
    tray.classList.toggle('empty', !any);
    if (!any) { tray.innerHTML = ''; return; }
    var items = lv.pieces.filter(function (p) { return p.free && !L.isOn(p); }), h = '<span class="tray-label" aria-hidden="true">Tray</span>';
    if (!items.length) h += '<span class="tray-none">Tray empty — everything is on the board. Very tidy.</span>';
    items.forEach(function (p, k) {
      var sel = G.traySel === p.id, ex = p.t === 'filter' ? p.s : (L.angular(p) ? (p.s || 8) : null);
      h += '<button class="tray-item' + (sel ? ' sel' : '') + '" data-id="' + p.id + '" aria-pressed="' + sel + '" aria-label="' + TNAME[p.t] + ' (' + (k + 1) + '). Tap, then tap a tile — or drag it onto the board.">' +
        '<img src="' + L.draw.icon(p.t, ex, 72) + '" alt="" draggable="false"><small>' + (TNAME[p.t] || p.t) + '</small></button>';
    });
    tray.innerHTML = h;
  };
  function trayInput() {
    var tray = $('tray'), ghost = $('drag-ghost'), td = null;
    function findP(id) { var lv = L.game.lv; return lv && lv.byId[id]; }
    function move(e) {
      var G = L.game, b = G.board, cell = b.cellAt(e.clientX, e.clientY), p = findP(td.id);
      if (cell && p) {
        var l = b.local(e.clientX, e.clientY);
        b.drag = { p: p, cell: cell, ok: L.cellFree(G.lv, cell.x, cell.y), lx: l[0], ly: l[1] };
        ghost.classList.remove('show');
      } else {
        b.drag = null; ghost.classList.add('show');
        ghost.style.transform = 'translate(' + (e.clientX - 32) + 'px,' + (e.clientY - 32) + 'px) scale(1.1)';
      }
    }
    tray.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest ? e.target.closest('.tray-item') : null;
      if (!btn || L.game.solved) return;
      L.audio.unlock();
      td = { id: +btn.getAttribute('data-id'), x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId };
      try { btn.setPointerCapture(e.pointerId); } catch (er) { }
      e.preventDefault();
    });
    tray.addEventListener('pointermove', function (e) {
      if (!td || e.pointerId !== td.pid) return;
      var dx = e.clientX - td.x0, dy = e.clientY - td.y0;
      if (!td.moved && dx * dx + dy * dy > 64) {
        td.moved = true; var p = findP(td.id);
        ghost.innerHTML = p ? '<img src="' + L.draw.icon(p.t, p.t === 'filter' ? p.s : (L.angular(p) ? (p.s || 8) : null), 72) + '" alt="">' : '';
        L.audio.play('lift');
      }
      if (td.moved) move(e);
    });
    function up(e, cancel) {
      if (!td || e.pointerId !== td.pid) return;
      var G = L.game, b = G.board, t = td; td = null;
      ghost.classList.remove('show'); b.drag = null;
      if (cancel) return;
      var p = findP(t.id); if (!p) return;
      if (!t.moved) {
        G.setTraySel(G.traySel === t.id ? null : t.id);
        if (G.traySel != null) { L.audio.play('click'); if (!U._trayTold) { U._trayTold = 1; U.say(L.LINES.tray, 4000); } }
        return;
      }
      var cell = b.cellAt(e.clientX, e.clientY);
      if (cell && L.cellFree(G.lv, cell.x, cell.y)) G.place(p, cell.x, cell.y);
      else L.audio.play('deny');
    }
    tray.addEventListener('pointerup', function (e) { up(e, false); });
    tray.addEventListener('pointercancel', function (e) { up(e, true); });
    tray.addEventListener('click', function (e) { // keyboard activation only
      if (e.detail !== 0) return;
      var btn = e.target.closest ? e.target.closest('.tray-item') : null; if (!btn) return;
      var G = L.game, id = +btn.getAttribute('data-id');
      G.setTraySel(G.traySel === id ? null : id); G.board.showCursor = true;
      if (G.traySel != null) U.say('Move the cursor with the arrow keys and press Enter to place it.', 3500);
      try { $('board').focus({ preventScroll: true }); } catch (er) { }
    });
  }

  /* ---------------- settings ---------------- */
  U.applySettings = function () {
    var s = L.save.settings, de = document.documentElement;
    de.classList.toggle('rm', L.motionReduced());
    de.classList.toggle('cbm', !!s.cb);
    de.classList.toggle('low', L.isLow());
    if (L.audio.ctx) L.audio.applyVol();
  };
  function sw(id, on, label, sub) {
    return '<div class="set-row"><div><strong>' + label + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
      '<button class="switch' + (on ? ' on' : '') + '" id="' + id + '" role="switch" aria-checked="' + !!on + '" aria-label="' + label + '"><i></i></button></div>';
  }
  function seg(id, val, opts, label, sub) {
    var h = '<div class="set-row"><div><strong>' + label + '</strong>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><div class="seg" role="radiogroup" aria-label="' + label + '" id="' + id + '">';
    opts.forEach(function (o) { h += '<button role="radio" data-v="' + o[0] + '" aria-checked="' + (val === o[0]) + '" class="' + (val === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; });
    return h + '</div></div>';
  }
  U.settings = function () {
    var s = L.save.settings;
    var html = '<div class="settings"><p class="kicker">Tune your photons</p><h2 id="modal-title">Settings</h2>' +
      '<h3>Sound</h3>' + sw('s-sound', s.sound, 'Sound', 'Generative soundtrack + synthesized effects') +
      '<label class="set-row range"><span><strong>Music</strong></span><input type="range" id="s-music" min="0" max="1" step="0.05" value="' + s.music + '"></label>' +
      '<label class="set-row range"><span><strong>Effects</strong></span><input type="range" id="s-sfx" min="0" max="1" step="0.05" value="' + s.sfx + '"></label>' +
      '<h3>Accessibility</h3>' + sw('s-cb', s.cb, 'Colour-blind shapes', '▲ red · ■ green · ● blue · ★ white, on crystals, emitters &amp; filters') +
      seg('s-motion', s.motion, [['auto', 'Auto'], ['on', 'Reduce'], ['off', 'Full']], 'Motion', 'Auto follows your device setting') +
      seg('s-quality', s.quality, [['auto', 'Auto'], ['high', 'High'], ['low', 'Battery']], 'Visual quality', 'Battery mode lowers particles &amp; glow') +
      '<h3>Progress</h3><p class="muted">Saved on this device only. No accounts, no cloud, no snooping.</p>' +
      '<div class="mbtns left"><button class="chip" id="s-export">⇪ Export progress</button><button class="chip" id="s-import">⇩ Import progress</button><button class="chip danger" id="s-reset">Reset progress</button></div>' +
      '<div id="s-io"></div>' +
      '<h3>Controls</h3><ul class="keys">' +
      '<li><b>Tap</b> rotate · <b>long-press / right-click</b> rotate back · <b>drag</b> around a mirror to spin</li>' +
      '<li><b>Pinch</b> or <b>Ctrl + wheel</b> zoom · <b>wheel</b> over a piece rotates</li>' +
      '<li><kbd>←↑→↓</kbd> cursor · <kbd>Enter</kbd> rotate/place · <kbd>Q</kbd>/<kbd>E</kbd> rotate · <kbd>T</kbd> tray · <kbd>H</kbd> hint · <kbd>Z</kbd>/<kbd>Y</kbd> undo/redo · <kbd>R</kbd> reset · <kbd>M</kbd> mute · <kbd>Esc</kbd> back</li>' +
      '<li><b>Gamepad</b>: D-pad cursor · A rotate · B reverse · X hint · Y undo · RB tray · Start back</li></ul></div>';
    var body = U.modal(html, { cls: 'settings-card' });
    function toggle(id, fn) {
      var b = $(id); b.addEventListener('click', function () { var on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); fn(on); L.audio.play('click'); });
    }
    toggle('s-sound', function (on) { L.audio.setEnabled(on); U.soundUI(); if (on) L.audio.play('hint'); });
    toggle('s-cb', function (on) { s.cb = on; L.persist(); U.applySettings(); });
    $('s-music').addEventListener('input', function () { s.music = +this.value; L.persist(); U.applySettings(); });
    $('s-sfx').addEventListener('input', function () { s.sfx = +this.value; L.persist(); U.applySettings(); });
    $('s-sfx').addEventListener('change', function () { L.audio.play('crystal', 0); });
    ['s-motion', 's-quality'].forEach(function (id) {
      each('button', function (b) {
        b.addEventListener('click', function () {
          each('button', function (o) { o.classList.toggle('on', o === b); o.setAttribute('aria-checked', o === b); }, $(id));
          s[id === 's-motion' ? 'motion' : 'quality'] = b.getAttribute('data-v'); L.persist(); U.applySettings();
          if (id === 's-quality') { L.bg.resize(); if (L.onResize) L.onResize(); }
          L.audio.play('click');
        });
      }, $(id));
    });
    $('s-export').addEventListener('click', function () {
      var code = L.b64enc(JSON.stringify({ v: 1, done: L.save.done, daily: L.save.daily, story: L.save.story, hints: L.save.hints, egg: L.save.egg }));
      $('s-io').innerHTML = '<textarea class="code" readonly rows="3" aria-label="Progress code">' + code + '</textarea><button class="chip" id="s-copy">Copy code</button>';
      $('s-copy').addEventListener('click', function () { L.copyText(code); });
    });
    $('s-import').addEventListener('click', function () {
      $('s-io').innerHTML = '<textarea class="code" rows="3" id="s-code" placeholder="Paste a progress code" aria-label="Paste a progress code"></textarea><button class="chip" id="s-load">Load progress</button>';
      $('s-load').addEventListener('click', function () {
        try {
          var o = JSON.parse(L.b64dec($('s-code').value));
          if (!o || o.v !== 1 || typeof o.done !== 'object') throw new Error('bad');
          L.save.done = o.done || {}; L.save.daily = o.daily || {}; L.save.story = o.story || {}; L.save.hints = o.hints || 0; L.save.egg = !!o.egg;
          L.persist(); L.toast('Progress restored ✓ Welcome back, Lightwright.'); if (U.screen === 'map') U.renderMap(); U.refreshTitle();
        } catch (e) { L.toast('That code looks scrambled — and not in the fun puzzle way.'); }
      });
    });
    var armed = false;
    $('s-reset').addEventListener('click', function () {
      if (!armed) { armed = true; this.textContent = 'Tap again to erase everything'; var self = this; setTimeout(function () { armed = false; self.textContent = 'Reset progress'; }, 3500); return; }
      L.resetSave(); L.toast('Progress reset. The temple is dark again. Dramatic.'); U.close(true); if (U.screen === 'map') U.renderMap(); U.refreshTitle();
    });
  };

  /* ---------------- about ---------------- */
  U.about = function () {
    var html = '<div class="about"><p class="kicker">About · Made by</p><h2 id="modal-title">Lumen</h2>' +
      '<p>A light-bending puzzle adventure: 40 puzzles across five worlds, a Daily Prism, and a Workshop for building your own. Every beam is ray-traced on a canvas; every crystal plays a note of the chord; every sound is synthesized live in your browser.</p>' +
      '<ul class="about-list"><li><b>Mirrors</b> reflect · <b>Prisms</b> split white into red, green &amp; blue · <b>Filters</b> keep one colour</li>' +
      '<li><b>Splitters</b> copy a beam · <b>Portals</b> teleport it · <b>Lenses</b> bend it 45° · <b>Blockers</b> slide out of the way</li>' +
      '<li>Crystals want <em>exactly</em> their own colour. Yellow = red + green, cyan = green + blue, magenta = red + blue.</li></ul>' +
      '<p class="muted">100% free, works offline once loaded, no sign-up, no trackers. Progress stays in your browser. Psst — there is a secret. It involves a very famous code (and possibly disco).</p>' +
      '<div class="made"><p>Designed &amp; built by <strong>Kumar Nikhil</strong></p><p class="links">' +
      '<a href="https://kumarnikhildeveloperaccount.github.io/" target="_blank" rel="noopener">Portfolio</a>' +
      '<a href="https://www.linkedin.com/in/kumar-nikhil-1000a9192/" target="_blank" rel="noopener">LinkedIn</a>' +
      '<a href="mailto:nkashyapnikhilnk@gmail.com">Email</a></p>' +
      '<p><a class="more" href="https://kumarnikhildeveloperaccount.github.io/" target="_blank" rel="noopener">More projects by Kumar Nikhil →</a></p>' +
      '<p class="grat">With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.</p></div></div>';
    U.modal(html, { cls: 'about-card' });
  };

  /* ---------------- title ---------------- */
  U.refreshTitle = function () {
    var key = L.todayKey(), d = L.save.daily[key];
    $('daily-sub').textContent = d ? starStr(d.s) + ' solved today in ' + d.m + ' moves' : 'a fresh puzzle every day · ' + key;
    $('btn-play').querySelector('span:last-child').textContent = Object.keys(L.save.done).length ? 'Continue the journey' : 'Begin the journey';
    U.soundUI();
  };
  function quips() {
    var q = $('title-quip'), i = Math.floor(Math.random() * L.LINES.title.length);
    function nx() {
      if (U.screen === 'title' && !document.hidden) {
        q.classList.remove('in'); void q.offsetWidth;
        q.textContent = L.LINES.title[i++ % L.LINES.title.length]; q.classList.add('in');
      }
    }
    nx(); setInterval(nx, 6500);
  }

  /* ---------------- init ---------------- */
  U.init = function () {
    $('map-worlds').addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-level],[data-story]') : null; if (!t) return;
      if (t.hasAttribute('data-story')) {
        var wi = +t.getAttribute('data-story'), W = L.WORLDS[wi];
        U.story('World ' + (wi + 1) + ' of 5', W.name, W.intro + (L.save.story['o' + wi] ? '  ✦  ' + W.outro : ''), 'Close', null, W.accent);
        return;
      }
      var i = +t.getAttribute('data-level');
      if (!U.unlocked(i)) {
        L.audio.play('deny'); t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
        L.toast(L.pickLine(['Locked. The light has not reached this far… yet.', 'Solve the previous puzzle to unlock this one.', 'This door opens from the other side. The previous level side.']));
        return;
      }
      L.audio.play('click'); U.playLevel(i);
    });
    $('map-back').addEventListener('click', function () { U.show('title'); });
    $('map-settings').addEventListener('click', U.settings);
    $('g-back').addEventListener('click', U.back);
    $('g-menu').addEventListener('click', U.settings);
    $('g-sound').addEventListener('click', U.toggleSound);
    $('btn-sound').addEventListener('click', U.toggleSound);
    $('modal-x').addEventListener('click', function () { U.close(); });
    $('modal-back').addEventListener('click', function () { U.close(); });
    $('narrator').addEventListener('click', function () { this.classList.remove('show'); });
    // focus trap inside the modal
    $('modal').addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var els = Array.prototype.filter.call($('modal-card').querySelectorAll('button, a[href], input, select, textarea'), function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
    trayInput();
    quips();
    U.refreshTitle();
  };
})();
