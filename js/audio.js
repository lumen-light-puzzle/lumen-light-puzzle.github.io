/* Lumen — audio.js : generative ambient soundtrack + synthesized SFX (Web Audio).
   Silent until the player enables sound (and unlocked on a user gesture for iOS). */
(function () {
  'use strict';
  var L = window.L;
  var A = L.audio = { ctx: null, chord: [57, 60, 64, 67], world: 0, timer: null, step: 0, next: 0 };
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function impulse(c, sec, decay) {
    var len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  A.init = function () {
    if (A.ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { A.ctx = new AC(); } catch (e) { A.ctx = null; return false; }
    var c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = 0;
    var comp = c.createDynamicsCompressor ? c.createDynamicsCompressor() : null;
    if (comp) { comp.threshold.value = -16; comp.ratio.value = 4; A.master.connect(comp); comp.connect(c.destination); }
    else A.master.connect(c.destination);
    A.musicBus = c.createGain(); A.sfxBus = c.createGain();
    try {
      A.verb = c.createConvolver(); A.verb.buffer = impulse(c, L.isLow() ? 1.6 : 2.8, 2.4);
      A.verbGain = c.createGain(); A.verbGain.gain.value = 0.4;
      A.verb.connect(A.verbGain); A.verbGain.connect(A.master);
    } catch (e) { A.verb = null; }
    A.delay = c.createDelay(1.5); A.delay.delayTime.value = 0.42;
    A.fb = c.createGain(); A.fb.gain.value = 0.33;
    A.dlp = c.createBiquadFilter(); A.dlp.type = 'lowpass'; A.dlp.frequency.value = 2400;
    A.delay.connect(A.dlp); A.dlp.connect(A.fb); A.fb.connect(A.delay); A.dlp.connect(A.master);
    A.musicBus.connect(A.master); A.sfxBus.connect(A.master);
    if (A.verb) { A.musicBus.connect(A.verb); A.sfxBus.connect(A.verb); }
    A.applyVol();
    return true;
  };

  A.ok = function () { return !!(A.ctx && L.save && L.save.settings.sound && A.ctx.state === 'running'); };

  A.unlock = function () {
    if (!L.save || !L.save.settings.sound) return;
    if (!A.init()) return;
    if (A.ctx.state !== 'running' && A.ctx.resume) { try { A.ctx.resume().then(function () { A.startMusic(); }, function () { }); } catch (e) { } }
    if (!A._primed) {
      A._primed = true;
      try { var b = A.ctx.createBuffer(1, 1, 22050), s = A.ctx.createBufferSource(); s.buffer = b; s.connect(A.ctx.destination); s.start(0); } catch (e) { }
    }
    A.applyVol();
    A.startMusic();
  };
  A.setEnabled = function (on) {
    L.save.settings.sound = !!on; L.persist();
    if (on) A.unlock(); else { A.applyVol(); A.stopMusic(); }
  };
  A.applyVol = function () {
    if (!A.ctx) return;
    var s = L.save.settings, t = A.ctx.currentTime;
    A.master.gain.setTargetAtTime(s.sound ? 0.9 : 0, t, 0.08);
    A.musicBus.gain.setTargetAtTime(s.music * 0.55, t, 0.1);
    A.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
  };

  function tone(freq, dur, o) {
    o = o || {};
    var c = A.ctx, t = o.at || c.currentTime;
    var osc = c.createOscillator(); osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    var g = c.createGain(), v = o.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = osc;
    if (o.lp) { var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(o.bus || A.sfxBus);
    if (o.send) g.connect(A.delay);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o) {
    o = o || {};
    var c = A.ctx, t = o.at || c.currentTime, len = Math.max(1, Math.floor(c.sampleRate * dur));
    var b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = c.createBufferSource(); s.buffer = b;
    var f = c.createBiquadFilter(); f.type = o.ftype || 'bandpass'; f.frequency.value = o.freq || 3000; f.Q.value = o.q || 1.2;
    var g = c.createGain(); g.gain.setValueAtTime(o.vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || A.sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function bell(f, vol, at, bus) {
    vol = vol || 0.15;
    tone(f, 2.4, { vol: vol, at: at, bus: bus, send: true });
    tone(f * 2.005, 1.3, { vol: vol * 0.3, at: at, bus: bus });
    tone(f * 3.01, 0.7, { vol: vol * 0.12, at: at, bus: bus, type: 'triangle' });
  }
  function pluck(f, at) {
    tone(f, 0.9, { type: 'triangle', vol: 0.05, at: at, bus: A.musicBus, lp: 1800, send: true });
  }
  function pad(ch, t, dur) {
    var c = A.ctx, dets = L.isLow() ? [0] : [-7, 7];
    ch.forEach(function (m) {
      dets.forEach(function (det) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m - 12); o.detune.value = det;
        var f = c.createBiquadFilter(); f.type = 'lowpass';
        f.frequency.setValueAtTime(320, t); f.frequency.linearRampToValueAtTime(1000, t + dur * 0.5); f.frequency.linearRampToValueAtTime(320, t + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
        o.connect(f); f.connect(g); g.connect(A.musicBus);
        o.start(t); o.stop(t + dur + 0.7);
      });
    });
    // sub
    tone(mtof(ch[0] - 24), dur, { vol: 0.05, at: t, att: 1.2, bus: A.musicBus });
  }

  function sched() {
    if (!A.ok()) return;
    var c = A.ctx, W = L.WORLDS[A.world] || L.WORLDS[0], beat = 60 / (W.bpm || 66) / 2;
    while (A.next < c.currentTime + 0.7) {
      var st = A.step, t = A.next;
      if (st % 32 === 0) { A.ci = Math.floor(st / 32) % W.chords.length; A.chord = W.chords[A.ci]; pad(A.chord, t, beat * 32); }
      if (st % 2 === 0 && Math.random() < 0.5) {
        var n = A.chord[Math.floor(Math.random() * A.chord.length)] + 12 + (Math.random() < 0.3 ? 12 : 0);
        pluck(mtof(n), t);
      }
      if (st % 16 === 8 && Math.random() < 0.35) bell(mtof(A.chord[0] + 24), 0.035, t, A.musicBus);
      A.step++; A.next += beat;
    }
  }
  A.startMusic = function () {
    if (!A.ok() || A.timer) return;
    A.next = A.ctx.currentTime + 0.15; A.step = 0;
    A.timer = setInterval(sched, 200);
  };
  A.stopMusic = function () { if (A.timer) clearInterval(A.timer); A.timer = null; };
  A.setWorld = function (w) {
    if (w < 0 || w == null) w = 4;
    if (A.world === w) return;
    A.world = w; A.chord = L.WORLDS[w].chords[0]; A.step = 0;
    if (A.ctx) A.next = A.ctx.currentTime + 0.1;
  };

  var S = {
    click: function () { tone(1250, 0.05, { type: 'triangle', vol: 0.05 }); },
    rotate: function (s) { tone(620 + (s || 0) * 45, 0.11, { type: 'triangle', vol: 0.07 }); noise(0.04, { freq: 5200, vol: 0.05 }); },
    place: function () { tone(190, 0.28, { slide: 80, vol: 0.22 }); tone(1320, 0.25, { vol: 0.04, send: true }); noise(0.08, { freq: 900, vol: 0.06 }); },
    lift: function () { tone(300, 0.15, { slide: 700, vol: 0.07 }); },
    slide: function () { noise(0.22, { freq: 600, q: 0.7, vol: 0.12 }); tone(140, 0.2, { slide: 110, vol: 0.08 }); },
    undo: function () { tone(660, 0.18, { slide: 330, vol: 0.08 }); },
    redo: function () { tone(330, 0.18, { slide: 660, vol: 0.08 }); },
    deny: function () { tone(150, 0.16, { type: 'square', vol: 0.04, lp: 700 }); },
    crystal: function (i) {
      var ch = A.chord, m = ch[i % ch.length] + 12 + 12 * (Math.floor(i / ch.length) % 2);
      bell(mtof(m), 0.16);
      noise(0.5, { freq: 7000, q: 0.5, vol: 0.03 });
    },
    unlit: function () { tone(520, 0.25, { slide: 380, vol: 0.04 }); },
    hint: function () { [0, 1, 2].forEach(function (k) { tone(mtof(A.chord[k % A.chord.length] + 24), 0.5, { vol: 0.05, at: A.ctx.currentTime + k * 0.08, send: true }); }); },
    win: function () {
      var t0 = A.ctx.currentTime + 0.05, ch = A.chord;
      for (var k = 0; k < 8; k++) bell(mtof(ch[k % ch.length] + 12 * (1 + Math.floor(k / ch.length))), 0.1, t0 + k * 0.09);
      ch.forEach(function (m) { tone(mtof(m), 3.2, { vol: 0.05, at: t0 + 0.75, att: 0.3, type: 'triangle' }); });
      noise(1.6, { freq: 8000, q: 0.4, vol: 0.04, at: t0 + 0.7 });
    },
    star: function (n) { bell(mtof(A.chord[0] + 24 + n * 4), 0.09); },
    whoosh: function () { noise(0.6, { ftype: 'lowpass', freq: 1400, q: 0.5, vol: 0.12 }); },
    egg: function () { for (var k = 0; k < 12; k++) tone(mtof(60 + k * 2), 0.2, { type: 'square', vol: 0.03, at: A.ctx.currentTime + k * 0.05, lp: 3000 }); }
  };
  A.play = function (name, arg) {
    if (!A.ok() || !S[name]) return;
    try { S[name](arg); } catch (e) { /* never let audio break the game */ }
  };

  document.addEventListener('visibilitychange', function () {
    if (!A.ctx) return;
    try {
      if (document.hidden) A.ctx.suspend();
      else if (L.save.settings.sound) A.ctx.resume();
    } catch (e) { }
  });
})();
