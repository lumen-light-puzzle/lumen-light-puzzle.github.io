/* Lumen — main.js : boot, main loop, resize, keyboard routing, easter egg, share links */
(function () {
  'use strict';
  var L = window.L, $ = L.$;
  L.eggOn = false;

  function toggleEgg() {
    L.eggOn = !L.eggOn; L.save.egg = true; L.persist();
    document.documentElement.classList.toggle('disco', L.eggOn);
    L.audio.play('egg');
    var line = L.eggOn ? L.LINES.egg : L.LINES.eggOff;
    if (L.ui.screen === 'game') L.ui.say(line, 4200); else L.toast(line, 3600);
  }
  L.toggleEgg = toggleEgg;
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  var kbuf = [], tbuf = '';
  function eggKeys(k) {
    k = String(k || '').toLowerCase();
    kbuf.push(k); if (kbuf.length > KONAMI.length) kbuf.shift();
    if (kbuf.join() === KONAMI.join()) { kbuf = []; toggleEgg(); }
    if (k.length === 1) { tbuf = (tbuf + k).slice(-5); if (tbuf === 'disco') { tbuf = ''; toggleEgg(); } }
  }

  L.onKey = function (e) {
    var k = e.key, U = L.ui;
    if (!k) return false;
    eggKeys(k);
    var ae = document.activeElement;
    if (U.modalOpen) {
      if (k === 'Escape') { U.close(); return true; }
      if (e.pad) {
        if (k.indexOf('Arrow') === 0) { L.focusMove(k); return true; }
        if (k === 'Enter' && ae && ae.click && ae !== document.body) { ae.click(); return true; }
      }
      return false;
    }
    var typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
    if (typing && !e.pad) { if (k === 'Escape') { ae.blur(); return true; } return false; }
    if (k === 'Escape') { U.back(); return true; }
    if ((k === 'm' || k === 'M') && !e.ctrlKey && !e.metaKey) { U.toggleSound(); return true; }
    if (U.screen === 'game') {
      var onCtl = ae && ae !== document.body && ae.id !== 'board' && /^(BUTTON|A)$/.test(ae.tagName);
      if (onCtl && !e.pad && (k === 'Enter' || k === ' ' || k === 'Tab')) return false;
      return L.game.key(e);
    }
    if (U.screen === 'editor') {
      if (e.pad || !ae || ae === document.body || ae.id === 'ed-board') return L.editor.key(e);
      if (k.indexOf('Arrow') === 0) { L.focusMove(k); return true; }
      return false;
    }
    if (k.indexOf('Arrow') === 0) { L.focusMove(k); return true; }
    if (e.pad && k === 'Enter' && ae && ae.click && ae !== document.body) { ae.click(); return true; }
    return false;
  };

  var rt = 0;
  L.onResize = function () {
    L.bg.resize();
    if (L.ui.screen === 'game' && L.game.lv) L.game.board.resize();
    if (L.ui.screen === 'editor' && L.editor.board) L.editor.board.resize();
    L.ui.applySettings();
  };
  function queueResize() { clearTimeout(rt); rt = setTimeout(L.onResize, 120); }

  function handleHash() {
    var h = location.hash || '';
    var m = h.match(/play=([A-Za-z0-9_\-%]+)/);
    if (!m) return false;
    var data;
    try { data = L.editor.parse(m[1]); } catch (e) { L.toast('That share link is a bit scrambled. Ask your friend to copy it again.', 4000); return false; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e2) { }
    L.toast('🔗 Shared puzzle: “' + data.name + '”', 3200);
    return L.editor.playData(data, 'share');
  }

  function boot() {
    L.loadSave();
    L.ui.applySettings();
    L.bg.init(); L.bg.setTheme('title');
    L.game.init(); L.editor.init(); L.ui.init();
    var U = L.ui;

    $('btn-play').addEventListener('click', function () {
      L.audio.unlock();
      U.show('map', function () { if (!L.save.story.i0) setTimeout(function () { U.storyIntro(0, function () { }); }, 500); });
    });
    $('btn-daily').addEventListener('click', function () { L.audio.unlock(); U.playDaily(); });
    $('btn-editor').addEventListener('click', function () { L.audio.unlock(); U.show('editor', function () { L.editor.enter(); }); });
    $('btn-settings').addEventListener('click', U.settings);
    $('btn-about').addEventListener('click', U.about);
    // the narrator never blocks taps on the board underneath it
    $('narrator').style.pointerEvents = 'none';

    // easter egg #2: tap the logo five times quickly
    var taps = 0, tt = 0;
    $('logo').addEventListener('pointerdown', function () {
      L.audio.unlock();
      taps++; clearTimeout(tt); tt = setTimeout(function () { taps = 0; }, 900);
      var span = $('logo').querySelectorAll('span')[(taps - 1) % 5]; if (span) { span.classList.remove('pop'); void span.offsetWidth; span.classList.add('pop'); }
      L.audio.play('rotate', taps);
      if (taps >= 5) { taps = 0; toggleEgg(); }
    });

    // iOS: unlock Web Audio on the first gesture (only if the player enabled sound)
    var unlock = function () { L.audio.unlock(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('keydown', function (e) { if (L.onKey(e)) e.preventDefault(); });

    window.addEventListener('resize', queueResize);
    window.addEventListener('orientationchange', function () { setTimeout(L.onResize, 300); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', queueResize);
    window.addEventListener('hashchange', handleHash);
    try {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      var f = function () { L.ui.applySettings(); };
      if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f);
    } catch (e) { }

    U.show('title');
    U.booted = true;
    if (L.save.egg) setTimeout(function () { L.toast('Welcome back. The disco remembers you. 🌈', 2600); }, 1200);
    handleHash();

    // main loop with a frame-time watchdog that lowers effects on slow devices
    var last = performance.now(), acc = 0, frames = 0, warm = 0, flip = 0;
    function frame(now) {
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      if (!L.perf.slow && !document.hidden) {
        warm += dt;
        if (warm > 2.5) {
          acc += dt; frames++;
          if (acc > 4) {
            if (frames / acc < 34) { L.perf.slow = true; L.bg.resize(); L.ui.applySettings(); }
            acc = 0; frames = 0;
          }
        }
      }
      try { L.pad.poll(); } catch (e) { }
      var low = L.isLow();
      flip = (flip + 1) % 2;
      if (!low || flip === 0) L.bg.draw(low ? dt * 2 : dt);
      if (U.screen === 'game' && L.game.lv) { L.game.board.draw(dt); L.game.tick(dt); }
      else if (U.screen === 'editor' && L.editor.board) L.editor.board.draw(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
