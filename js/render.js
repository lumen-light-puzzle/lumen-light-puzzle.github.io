/* Lumen — render.js : the board renderer (beams with additive glow, halos, particles, zoom) */
(function () {
  'use strict';
  var L = window.L, TAU = Math.PI * 2;
  var THEME = {
    dawn: { plate: ['rgba(60,24,48,0.78)', 'rgba(24,10,26,0.88)'], tile: 'rgba(255,214,170,0.07)', edge: 'rgba(255,200,140,0.35)', wallA: '#7a5a4a', wallB: '#2e1c22' },
    caves: { plate: ['rgba(26,20,60,0.8)', 'rgba(8,6,22,0.9)'], tile: 'rgba(170,150,255,0.07)', edge: 'rgba(160,140,255,0.35)', wallA: '#4b3f78', wallB: '#15102a' },
    city: { plate: ['rgba(30,10,46,0.8)', 'rgba(6,4,18,0.9)'], tile: 'rgba(255,90,210,0.06)', edge: 'rgba(90,240,255,0.4)', wallA: '#3a3550', wallB: '#120e1e' },
    ocean: { plate: ['rgba(6,40,70,0.75)', 'rgba(2,12,28,0.9)'], tile: 'rgba(120,220,255,0.07)', edge: 'rgba(110,220,255,0.35)', wallA: '#2c5a66', wallB: '#0b1c26' },
    void: { plate: ['rgba(20,14,40,0.78)', 'rgba(2,2,8,0.92)'], tile: 'rgba(200,190,255,0.06)', edge: 'rgba(200,180,255,0.35)', wallA: '#3c3658', wallB: '#0c0a16' }
  };

  function Board(cv, opts) {
    this.cv = cv; this.c = cv.getContext('2d'); this.opts = opts || {};
    this.lv = null; this.tr = null; this.z = 1; this.px = 0; this.py = 0;
    this.anim = {}; this.pos = {}; this.kick = {}; this.litAmt = {};
    this.parts = []; this.rings = []; this.sel = null; this.hover = null; this.cursor = { x: 0, y: 0 };
    this.showCursor = false; this.hint = null; this.reveal = Infinity; this.flash = 0; this.drag = null;
    this.traySel = false; this.cw = 1; this.ch = 1; this.cs = 40; this.ox = 0; this.oy = 0; this.t = 0;
  }
  L.Board = Board;
  var BP = Board.prototype;

  BP.resize = function () {
    var el = this.cv.parentElement, r = el.getBoundingClientRect();
    this.cw = Math.max(50, r.width); this.ch = Math.max(50, r.height);
    this.dpr = L.dpr();
    this.cv.width = Math.round(this.cw * this.dpr); this.cv.height = Math.round(this.ch * this.dpr);
    this.cv.style.width = this.cw + 'px'; this.cv.style.height = this.ch + 'px';
    this.layout();
  };
  BP.layout = function () {
    if (!this.lv) return;
    var pad = Math.min(this.cw, this.ch) < 520 ? 8 : 26;
    this.cs = Math.max(18, Math.floor(Math.min((this.cw - pad * 2) / this.lv.w, (this.ch - pad * 2) / this.lv.h, 150)));
    this.ox = Math.round((this.cw - this.cs * this.lv.w) / 2);
    this.oy = Math.round((this.ch - this.cs * this.lv.h) / 2);
    this.clampPan();
  };
  BP.targetAngle = function (p) {
    if (p.t === 'mirror' || p.t === 'splitter') return -(p.s || 0) * Math.PI / 8;
    if (p.t === 'lens') return p.s ? Math.PI : 0;
    return 0;
  };
  BP.setLevel = function (lv, keepView) {
    this.lv = lv; this.anim = {}; this.pos = {}; this.kick = {}; this.litAmt = {}; this.parts = []; this.rings = [];
    var self = this;
    lv.pieces.forEach(function (p) { self.anim[p.id] = self.targetAngle(p); self.pos[p.id] = [p.x, p.y]; });
    if (!keepView) { this.z = 1; this.px = 0; this.py = 0; }
    this.reveal = L.motionReduced() ? Infinity : 0;
    this.theme = THEME[lv.theme] || THEME.void;
    this.hint = null; this.sel = null; this.drag = null;
    this.layout();
  };
  BP.local = function (clientX, clientY) {
    var r = this.cv.getBoundingClientRect(), X = clientX - r.left, Y = clientY - r.top;
    var sx = (X - this.px - this.cw / 2) / this.z + this.cw / 2, sy = (Y - this.py - this.ch / 2) / this.z + this.ch / 2;
    return [sx - this.ox, sy - this.oy];
  };
  BP.cellAt = function (clientX, clientY) {
    if (!this.lv) return null;
    var l = this.local(clientX, clientY), x = Math.floor(l[0] / this.cs), y = Math.floor(l[1] / this.cs);
    if (x < 0 || y < 0 || x >= this.lv.w || y >= this.lv.h) return null;
    return { x: x, y: y };
  };
  BP.clientOf = function (x, y) { // centre of cell -> client coordinates
    var r = this.cv.getBoundingClientRect();
    var sx = this.ox + (x + 0.5) * this.cs, sy = this.oy + (y + 0.5) * this.cs;
    return [r.left + this.cw / 2 + (sx - this.cw / 2) * this.z + this.px, r.top + this.ch / 2 + (sy - this.ch / 2) * this.z + this.py];
  };
  BP.clampPan = function () {
    var mx = Math.max(0, (this.cw * this.z - this.cw) / 2 + 40), my = Math.max(0, (this.ch * this.z - this.ch) / 2 + 40);
    if (this.z <= 1.001) { this.px = 0; this.py = 0; return; }
    this.px = L.clamp(this.px, -mx, mx); this.py = L.clamp(this.py, -my, my);
  };
  BP.setPan = function (px, py) { this.px = px; this.py = py; this.clampPan(); };
  // zoom so that the board point under client point m0 (at z0, pan0) moves under client point m
  BP.pinch = function (z, m0, m, z0, px0, py0) {
    var r = this.cv.getBoundingClientRect();
    var ax = m0.x - r.left, ay = m0.y - r.top, bx = m.x - r.left, by = m.y - r.top;
    var sx = (ax - this.cw / 2 - px0) / z0 + this.cw / 2, sy = (ay - this.ch / 2 - py0) / z0 + this.ch / 2;
    this.z = L.clamp(z, 1, 3);
    this.px = bx - this.cw / 2 - this.z * (sx - this.cw / 2);
    this.py = by - this.ch / 2 - this.z * (sy - this.ch / 2);
    this.clampPan();
  };
  BP.resetZoom = function () { this.z = 1; this.px = 0; this.py = 0; };

  // ---------- effects ----------
  BP.burst = function (x, y, mask, n) {
    var low = L.isLow(), cs = this.cs, max = low ? 120 : 520;
    n = Math.round((n || 26) * (low ? 0.35 : 1) * (L.motionReduced() ? 0.3 : 1));
    for (var i = 0; i < n && this.parts.length < max; i++) {
      var a = Math.random() * TAU, sp = (0.6 + Math.random() * 2.6) * cs;
      this.parts.push({ x: (x + 0.5) * cs, y: (y + 0.5) * cs, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.5 + Math.random() * 0.9, c: mask, sz: (0.02 + Math.random() * 0.05) * cs });
    }
    this.rings.push({ x: x, y: y, c: mask, t: 0 });
  };
  BP.pulse = function (p) { this.kick[p.id] = 1; };
  BP.celebrate = function () {
    var self = this;
    this.flash = 1;
    this.lv.pieces.forEach(function (p) { if (p.t === 'crystal') self.burst(p.x, p.y, p.c, 40); });
    this.rings.push({ x: (this.lv.w - 1) / 2, y: (this.lv.h - 1) / 2, c: 7, t: 0, big: true });
  };

  // ---------- drawing ----------
  BP.draw = function (dt) {
    var lv = this.lv, c = this.c; if (!lv) return;
    var rm = L.motionReduced(), low = L.isLow();
    this.t += dt; var t = this.t, cs = this.cs, W = lv.w, H = lv.h, th = this.theme || THEME.void;
    var self = this, i, p;
    if (this.reveal < 1e6) { this.reveal += dt * 16; if (this.reveal > 400) this.reveal = Infinity; }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.translate(this.cw / 2 + this.px, this.ch / 2 + this.py);
    c.scale(this.z, this.z);
    c.translate(-this.cw / 2 + this.ox, -this.ch / 2 + this.oy);

    // plate
    var m = cs * 0.18, bw = W * cs, bh = H * cs;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = low ? 0 : 30; c.shadowOffsetY = 10;
    L.draw.rr(c, -m, -m, bw + m * 2, bh + m * 2, cs * 0.28);
    var pg = c.createLinearGradient(0, -m, 0, bh + m);
    pg.addColorStop(0, th.plate[0]); pg.addColorStop(1, th.plate[1]);
    c.fillStyle = pg; c.fill(); c.restore();
    L.draw.rr(c, -m, -m, bw + m * 2, bh + m * 2, cs * 0.28);
    c.strokeStyle = th.edge; c.lineWidth = Math.max(1, cs * 0.02); c.stroke();
    // tiles
    var tp = cs * 0.06;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      L.draw.rr(c, x * cs + tp, y * cs + tp, cs - tp * 2, cs - tp * 2, cs * 0.14);
      c.fillStyle = (x + y) % 2 ? th.tile : 'rgba(255,255,255,0.035)'; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.fillRect(x * cs + cs / 2 - 1, y * cs + cs / 2 - 1, 2, 2);
    }

    // slider tracks
    lv.pieces.forEach(function (q) {
      if (q.t !== 'slider' || !q.track) return;
      c.strokeStyle = 'rgba(255,220,140,0.28)'; c.lineWidth = cs * 0.05; c.lineCap = 'round';
      c.setLineDash([cs * 0.06, cs * 0.08]);
      c.beginPath();
      q.track.forEach(function (tk, k) { var X = (tk[0] + 0.5) * cs, Y = (tk[1] + 0.5) * cs; if (k) c.lineTo(X, Y); else c.moveTo(X, Y); });
      c.stroke(); c.setLineDash([]);
      q.track.forEach(function (tk) { c.beginPath(); c.arc((tk[0] + 0.5) * cs, (tk[1] + 0.5) * cs, cs * 0.06, 0, TAU); c.fillStyle = 'rgba(255,220,140,0.35)'; c.fill(); });
    });

    // placement hints
    if (this.traySel) {
      for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
        if (!L.cellFree(lv, xx, yy)) continue;
        c.beginPath(); c.arc((xx + 0.5) * cs, (yy + 0.5) * cs, cs * (0.07 + 0.02 * Math.sin(t * 4 + xx + yy)), 0, TAU);
        c.fillStyle = 'rgba(255,220,150,0.5)'; c.fill();
      }
    }

    // beams
    if (this.tr) this.drawBeams(c, t, rm, low);

    // pieces
    var cb = L.save.settings.cb;
    lv.pieces.forEach(function (q) {
      if (!L.isOn(q)) return;
      if (self.drag && self.drag.p === q) return;
      // animate
      var a = self.anim[q.id] == null ? self.targetAngle(q) : self.anim[q.id], tg = self.targetAngle(q), d = tg - a;
      var per = q.t === 'lens' ? TAU : Math.PI;
      while (d > per / 2) d -= per; while (d < -per / 2) d += per;
      a = rm ? tg : a + d * Math.min(1, dt * 16); self.anim[q.id] = a;
      var ps = self.pos[q.id] || [q.x, q.y];
      if (rm) ps = [q.x, q.y]; else { ps[0] += (q.x - ps[0]) * Math.min(1, dt * 14); ps[1] += (q.y - ps[1]) * Math.min(1, dt * 14); }
      self.pos[q.id] = ps;
      var k = self.kick[q.id] || 0; if (k) { k = Math.max(0, k - dt * 4); self.kick[q.id] = k; }
      var lt = self.litAmt[q.id] || 0, want = self.tr && self.tr.hits[q.id] === q.c ? 1 : 0;
      lt += (want - lt) * Math.min(1, dt * 6); self.litAmt[q.id] = lt;
      c.save();
      c.translate((ps[0] + 0.5) * cs, (ps[1] + 0.5) * cs);
      var sc = 1 + 0.14 * Math.sin(k * Math.PI);
      c.scale(sc, sc);
      var fn = L.draw[q.t];
      if (fn) fn(c, q, cs, t, { angle: a, lit: lt, over: self.tr && self.tr.over[q.id], rm: rm, cb: cb, wallA: th.wallA, wallB: th.wallB });
      c.restore();
    });

    // dragged piece
    if (this.drag) {
      var dp = this.drag.p, dc = this.drag.cell;
      if (dc) {
        L.draw.rr(c, dc.x * cs + tp, dc.y * cs + tp, cs - tp * 2, cs - tp * 2, cs * 0.14);
        c.strokeStyle = this.drag.ok ? 'rgba(140,255,200,0.9)' : 'rgba(255,110,110,0.9)'; c.lineWidth = cs * 0.04; c.stroke();
      }
      c.save(); c.globalAlpha = 0.85; c.translate(this.drag.lx, this.drag.ly); c.scale(1.12, 1.12);
      L.draw[dp.t](c, dp, cs, t, { angle: this.targetAngle(dp), lit: 0, rm: rm, cb: cb });
      c.restore();
    }

    // particles & rings
    c.globalCompositeOperation = 'lighter';
    for (i = this.rings.length - 1; i >= 0; i--) {
      var rg = this.rings[i]; rg.t += dt;
      var life = rg.big ? 1.4 : 0.8; if (rg.t > life) { this.rings.splice(i, 1); continue; }
      var f = rg.t / life, rad = cs * (rg.big ? 0.3 + f * Math.max(W, H) * 0.9 : 0.3 + f * 1.4);
      c.strokeStyle = L.col(rg.c, (1 - f) * 0.7); c.lineWidth = cs * (rg.big ? 0.12 : 0.06) * (1 - f) + 1;
      c.beginPath(); c.arc((rg.x + 0.5) * cs, (rg.y + 0.5) * cs, rad, 0, TAU); c.stroke();
    }
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i]; p.life += dt;
      if (p.life > p.max) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy = p.vy * 0.96 + cs * 0.9 * dt;
      var al = 1 - p.life / p.max;
      c.fillStyle = L.col(p.c, al);
      c.beginPath(); c.arc(p.x, p.y, p.sz * (0.5 + al), 0, TAU); c.fill();
      if (!low) { c.fillStyle = L.col(p.c, al * 0.18); c.beginPath(); c.arc(p.x, p.y, p.sz * 4, 0, TAU); c.fill(); }
    }
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 1.6);
      c.fillStyle = 'rgba(255,245,220,' + (this.flash * 0.18) + ')';
      c.fillRect(-m, -m, bw + m * 2, bh + m * 2);
    }
    c.globalCompositeOperation = 'source-over';

    // overlays: hover, selection, hint, cursor
    function ring(x, y, col, wdt, dash, spin) {
      c.save(); c.translate((x + 0.5) * cs, (y + 0.5) * cs); if (spin && !rm) c.rotate(t * spin);
      if (dash) c.setLineDash([cs * 0.08, cs * 0.06]);
      c.strokeStyle = col; c.lineWidth = wdt; c.beginPath(); c.arc(0, 0, cs * 0.46, 0, TAU); c.stroke(); c.restore();
    }
    if (this.hover && !this.drag) {
      var hp = L.pieceAt(lv, this.hover.x, this.hover.y);
      if (hp && L.interactive(hp)) ring(this.hover.x, this.hover.y, 'rgba(255,255,255,0.28)', cs * 0.025, false);
    }
    if (this.sel && L.isOn(this.sel)) ring(this.sel.x, this.sel.y, 'rgba(140,230,255,0.9)', cs * 0.035, true, 0.8);
    if (this.hint && this.hint.until > t) {
      var hx = this.hint.x, hy = this.hint.y, pul = 0.5 + 0.5 * Math.sin(t * 6);
      c.save(); c.globalCompositeOperation = 'lighter';
      c.translate((hx + 0.5) * cs, (hy + 0.5) * cs);
      var hg = c.createRadialGradient(0, 0, 0, 0, 0, cs * 0.8);
      hg.addColorStop(0, 'rgba(255,210,120,' + (0.25 + 0.2 * pul) + ')'); hg.addColorStop(1, 'rgba(255,210,120,0)');
      c.fillStyle = hg; c.fillRect(-cs, -cs, cs * 2, cs * 2);
      c.strokeStyle = 'rgba(255,215,130,' + (0.6 + 0.4 * pul) + ')'; c.lineWidth = cs * 0.045;
      c.beginPath(); c.arc(0, 0, cs * (0.48 + 0.04 * pul), 0, TAU); c.stroke();
      if (this.hint.dir) { // curved arrow
        var dirn = this.hint.dir, a0 = -Math.PI / 2, a1 = a0 + dirn * 1.3;
        c.beginPath(); c.arc(0, 0, cs * 0.6, Math.min(a0, a1), Math.max(a0, a1)); c.stroke();
        var ex = Math.cos(a1) * cs * 0.6, ey = Math.sin(a1) * cs * 0.6, tx = -Math.sin(a1) * dirn, ty = Math.cos(a1) * dirn;
        c.beginPath(); c.moveTo(ex + tx * cs * 0.12, ey + ty * cs * 0.12);
        c.lineTo(ex - ty * cs * 0.08, ey + tx * cs * 0.08); c.lineTo(ex + ty * cs * 0.08, ey - tx * cs * 0.08); c.closePath();
        c.fillStyle = 'rgba(255,215,130,0.95)'; c.fill();
      }
      c.restore();
    }
    if (this.showCursor) {
      var cx0 = this.cursor.x * cs, cy0 = this.cursor.y * cs, k2 = cs * 0.22, o2 = cs * 0.04;
      c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = cs * 0.035; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx0 + o2, cy0 + o2 + k2); c.lineTo(cx0 + o2, cy0 + o2); c.lineTo(cx0 + o2 + k2, cy0 + o2);
      c.moveTo(cx0 + cs - o2 - k2, cy0 + o2); c.lineTo(cx0 + cs - o2, cy0 + o2); c.lineTo(cx0 + cs - o2, cy0 + o2 + k2);
      c.moveTo(cx0 + cs - o2, cy0 + cs - o2 - k2); c.lineTo(cx0 + cs - o2, cy0 + cs - o2); c.lineTo(cx0 + cs - o2 - k2, cy0 + cs - o2);
      c.moveTo(cx0 + o2 + k2, cy0 + cs - o2); c.lineTo(cx0 + o2, cy0 + cs - o2); c.lineTo(cx0 + o2, cy0 + cs - o2 - k2);
      c.stroke();
    }
  };

  BP.drawBeams = function (c, t, rm, low) {
    var cs = this.cs, segs = this.tr.segs, reveal = this.reveal, egg = L.save.egg && L.eggOn;
    var W = this.lv.w, H = this.lv.h, m = cs * 0.18;
    c.save();
    L.draw.rr(c, -m, -m, W * cs + m * 2, H * cs + m * 2, cs * 0.28); c.clip();
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    var passes = low ? [[0.34, 0.12], [0.07, 0.9]] : [[0.62, 0.05], [0.3, 0.12], [0.13, 0.38], [0.045, 0.95]];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (reveal < s.depth) continue;
      var f = Math.min(1, (reveal - s.depth) / s.len);
      var x1 = (s.x1 + 0.5) * cs, y1 = (s.y1 + 0.5) * cs, x2 = (s.x2 + 0.5) * cs, y2 = (s.y2 + 0.5) * cs;
      if (s.end === 'out') { x2 = x1 + (x2 - x1) * 1; y2 = y1 + (y2 - y1) * 1; }
      x2 = x1 + (x2 - x1) * f; y2 = y1 + (y2 - y1) * f;
      var fl = rm ? 1 : 0.88 + 0.12 * Math.sin(t * 7 + s.depth * 1.7 + i);
      var rgb = L.COLORS[s.c] || L.COLORS[7], colA;
      if (egg) colA = function (a) { return 'hsla(' + ((t * 140 + s.depth * 40 + i * 25) % 360) + ',100%,65%,' + a + ')'; };
      else colA = function (a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; };
      for (var k = 0; k < passes.length; k++) {
        c.strokeStyle = k === passes.length - 1 ? 'rgba(255,255,255,' + (passes[k][1] * fl * 0.85) + ')' : colA(passes[k][1] * fl);
        c.lineWidth = cs * passes[k][0];
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      }
      if (k === passes.length) { c.strokeStyle = colA(0.6 * fl); c.lineWidth = cs * 0.08; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
      // photons flowing along the beam
      if (!rm && !low && f >= 1) {
        var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.round(s.len * 1.3));
        for (var j = 0; j < n; j++) {
          var u = ((t * 1.4 + j / n + s.depth * 0.13) % 1);
          var px = x1 + dx * u, py = y1 + dy * u;
          c.fillStyle = colA(0.55 * Math.sin(u * Math.PI));
          c.beginPath(); c.arc(px, py, cs * 0.045, 0, TAU); c.fill();
        }
      }
      // impact glow
      if (f >= 1 && s.end !== 'out') {
        var gr = c.createRadialGradient(x2, y2, 0, x2, y2, cs * 0.42);
        gr.addColorStop(0, colA(0.45 * fl)); gr.addColorStop(1, colA(0));
        c.fillStyle = gr; c.fillRect(x2 - cs * 0.42, y2 - cs * 0.42, cs * 0.84, cs * 0.84);
      }
      // emitter muzzle
      if (s.depth === 0) {
        var g0 = c.createRadialGradient(x1, y1, 0, x1, y1, cs * 0.5);
        g0.addColorStop(0, colA(0.3)); g0.addColorStop(1, colA(0));
        c.fillStyle = g0; c.fillRect(x1 - cs * 0.5, y1 - cs * 0.5, cs, cs);
      }
    }
    // blocked flashes
    var fl2 = this.tr.flashes;
    for (var q = 0; q < fl2.length; q++) {
      var bx = (fl2[q].x + 0.5) * cs, by = (fl2[q].y + 0.5) * cs;
      var gb = c.createRadialGradient(bx, by, 0, bx, by, cs * 0.5);
      gb.addColorStop(0, L.col(fl2[q].c, 0.35)); gb.addColorStop(1, L.col(fl2[q].c, 0));
      c.fillStyle = gb; c.fillRect(bx - cs * 0.5, by - cs * 0.5, cs, cs);
    }
    c.restore();
  };
})();
