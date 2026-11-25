/* Lumen — util.js : shared helpers, RNG, storage, device detection */
(function () {
  'use strict';
  var L = window.L = window.L || {};

  // 8 directions, 45° apart, counter-clockwise starting East (screen y grows downward)
  L.DX = [1, 1, 0, -1, -1, -1, 0, 1];
  L.DY = [0, -1, -1, -1, 0, 1, 1, 1];

  // colour masks: R=1 G=2 B=4
  L.COLORS = {
    1: [255, 84, 112], 2: [70, 255, 160], 3: [255, 222, 80], 4: [80, 160, 255],
    5: [255, 96, 236], 6: [80, 250, 240], 7: [255, 244, 220]
  };
  L.COLOR_NAMES = { 1: 'Red', 2: 'Green', 3: 'Yellow', 4: 'Blue', 5: 'Magenta', 6: 'Cyan', 7: 'White' };
  L.FILTERS = [1, 2, 4, 3, 6, 5];
  L.col = function (m, a) {
    var c = L.COLORS[m] || L.COLORS[7];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  };
  L.hsl = function (h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; };

  // deterministic RNG (mulberry32)
  L.rng = function (seed) {
    var a = seed >>> 0;
    var f = function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    f.shuffle = function (arr) {
      for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp; }
      return arr;
    };
    return f;
  };
  L.hash = function (s) {
    var h = 2166136261 >>> 0; s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  L.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  L.lerp = function (a, b, t) { return a + (b - a) * t; };
  L.easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  L.$ = function (id) { return document.getElementById(id); };
  L.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  L.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  L.pickLine = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  // URL-safe base64 for unicode strings
  L.b64enc = function (str) {
    var b = btoa(unescape(encodeURIComponent(str)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  L.b64dec = function (s) {
    s = String(s).trim().replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  };

  // ---------- storage ----------
  var KEY = 'lumen.save.v1';
  function defaults() {
    return {
      done: {}, daily: {}, story: {}, hints: 0, egg: false, draft: null,
      settings: { sound: false, music: 0.55, sfx: 0.8, cb: false, motion: 'auto', quality: 'auto' }
    };
  }
  L.loadSave = function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    var d = defaults();
    if (!s || typeof s !== 'object') s = d;
    else {
      for (var k in d) if (!(k in s)) s[k] = d[k];
      if (!s.settings || typeof s.settings !== 'object') s.settings = d.settings;
      for (var k2 in d.settings) if (!(k2 in s.settings)) s.settings[k2] = d.settings[k2];
    }
    L.save = s;
    return s;
  };
  L.persist = function () {
    try { localStorage.setItem(KEY, JSON.stringify(L.save)); } catch (e) { /* private mode: progress lives in memory */ }
  };
  L.resetSave = function () { var keep = L.save ? L.save.settings : null; L.save = defaults(); if (keep) L.save.settings = keep; L.persist(); };

  // ---------- device / performance ----------
  L.perf = { low: false, slow: false, mobile: false };
  (function () {
    var nav = window.navigator || {};
    var hc = nav.hardwareConcurrency || 4;
    var dm = nav.deviceMemory || 4;
    var ua = nav.userAgent || '';
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (nav.maxTouchPoints > 1 && /Mac/.test(nav.platform || ''));
    L.perf.mobile = mobile;
    L.perf.low = hc <= 2 || dm <= 2 || (mobile && hc <= 4);
  })();
  L.isLow = function () {
    var q = L.save && L.save.settings.quality;
    if (q === 'low') return true;
    if (q === 'high') return false;
    return L.perf.low || L.perf.slow;
  };
  L.motionReduced = function () {
    var m = L.save && L.save.settings.motion;
    if (m === 'on') return true;
    if (m === 'off') return false;
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  };
  L.dpr = function () { return Math.min(window.devicePixelRatio || 1, L.isLow() ? 1.5 : 2); };
  L.vibrate = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };

  L.toast = function (msg, ms) {
    var t = L.$('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(L._tt);
    L._tt = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
  };

  L.copyText = function (text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      L.toast(ok ? 'Copied to clipboard ✓' : 'Copy failed — select the text and copy manually.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { L.toast('Copied to clipboard ✓'); }, fallback);
    } else fallback();
  };
})();
