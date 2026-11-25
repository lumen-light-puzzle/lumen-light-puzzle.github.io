/* Lumen — bg.js : cinematic, layered animated backdrops per world (2D canvas) */
(function () {
  'use strict';
  var L = window.L;
  var B = L.bg = { theme: 'title', t: 0, motes: [], base: null, w: 0, h: 0 };
  var PAL = {
    title: { top: '#120a2e', mid: '#2a0f4a', bot: '#05040c', glow: [190, 150, 255], mote: [255, 230, 190] },
    dawn: { top: '#ffb36b', mid: '#d0577a', bot: '#2a0e3a', glow: [255, 210, 140], mote: [255, 228, 170] },
    caves: { top: '#0a1a2c', mid: '#1f1046', bot: '#04040a', glow: [140, 120, 255], mote: [170, 210, 255] },
    city: { top: '#090b26', mid: '#3a0d4a', bot: '#050310', glow: [255, 80, 200], mote: [120, 240, 255] },
    ocean: { top: '#0a3a6a', mid: '#062246', bot: '#010814', glow: [90, 210, 255], mote: [180, 240, 255] },
    void: { top: '#05030c', mid: '#0c0620', bot: '#000000', glow: [170, 140, 255], mote: [255, 255, 255] }
  };

  B.init = function () {
    B.cv = L.$('bg'); if (!B.cv) return;
    B.ctx = B.cv.getContext('2d');
    B.resize();
  };
  B.resize = function () {
    if (!B.cv) return;
    var low = L.isLow(), s = low ? 0.6 : Math.min(window.devicePixelRatio || 1, 1.5);
    B.w = window.innerWidth; B.h = window.innerHeight; B.s = s;
    B.cv.width = Math.max(1, Math.floor(B.w * s)); B.cv.height = Math.max(1, Math.floor(B.h * s));
    B.buildBase(); B.seedMotes();
  };
  B.setTheme = function (th) {
    if (!PAL[th]) th = 'title';
    if (B.theme === th && B.base) return;
    B.theme = th; B.buildBase(); B.seedMotes();
    document.documentElement.setAttribute('data-theme', th);
  };

  B.buildBase = function () {
    if (!B.cv) return;
    var w = B.cv.width, h = B.cv.height, p = PAL[B.theme], R = L.rng(L.hash(B.theme));
    var off = document.createElement('canvas'); off.width = w; off.height = h;
    var c = off.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.top); g.addColorStop(0.55, p.mid); g.addColorStop(1, p.bot);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    var i, x, y, k;
    if (B.theme === 'dawn') {
      // sun
      var sg = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.5);
      sg.addColorStop(0, 'rgba(255,240,200,0.9)'); sg.addColorStop(0.08, 'rgba(255,210,140,0.55)'); sg.addColorStop(0.4, 'rgba(255,140,120,0.12)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      // temple silhouette
      c.fillStyle = 'rgba(30,10,40,0.85)';
      var base = h * 0.82, cols = Math.max(6, Math.floor(w / 90));
      c.fillRect(0, base, w, h - base);
      for (i = 0; i <= cols; i++) { x = i * w / cols; c.fillRect(x - w * 0.012, base - h * 0.16, w * 0.024, h * 0.16); }
      c.fillRect(0, base - h * 0.18, w, h * 0.025);
      c.beginPath(); c.moveTo(w * 0.05, base - h * 0.18); c.lineTo(w * 0.5, base - h * 0.3); c.lineTo(w * 0.95, base - h * 0.18); c.fill();
    } else if (B.theme === 'caves') {
      for (k = 0; k < 2; k++) {
        c.fillStyle = k ? 'rgba(8,4,20,0.9)' : 'rgba(40,20,80,0.55)';
        for (i = 0; i < 26; i++) {
          x = R() * w; var bw = (20 + R() * 70) * B.s, bh = (60 + R() * 260) * B.s * (k ? 0.7 : 1);
          var top = R() < 0.5;
          c.beginPath();
          if (top) { c.moveTo(x - bw / 2, 0); c.lineTo(x + bw / 2, 0); c.lineTo(x + bw * 0.1, bh); }
          else { c.moveTo(x - bw / 2, h); c.lineTo(x + bw / 2, h); c.lineTo(x - bw * 0.1, h - bh); }
          c.closePath(); c.fill();
          if (!k && R() < 0.5) {
            c.strokeStyle = 'rgba(160,140,255,0.25)'; c.lineWidth = 1.5 * B.s; c.stroke();
          }
        }
      }
    } else if (B.theme === 'city') {
      for (k = 0; k < 3; k++) {
        var shade = [0.35, 0.6, 0.92][k];
        x = 0;
        while (x < w) {
          var bw2 = (30 + R() * 80) * B.s, bh2 = h * (0.12 + R() * (0.25 + k * 0.1)) * (1 - k * 0.15);
          c.fillStyle = 'rgba(' + (8 + k * 4) + ',' + (4 + k * 2) + ',' + (24 + k * 6) + ',' + shade + ')';
          c.fillRect(x, h - bh2, bw2, bh2);
          if (k === 2) {
            for (var wy = h - bh2 + 8 * B.s; wy < h - 6; wy += 10 * B.s)
              for (var wx = x + 5 * B.s; wx < x + bw2 - 5 * B.s; wx += 9 * B.s)
                if (R() < 0.22) { c.fillStyle = R() < 0.5 ? 'rgba(255,90,210,0.6)' : 'rgba(90,240,255,0.5)'; c.fillRect(wx, wy, 3 * B.s, 4 * B.s); }
          }
          x += bw2 + R() * 6 * B.s;
        }
      }
      var hz = c.createLinearGradient(0, h * 0.5, 0, h);
      hz.addColorStop(0, 'rgba(255,60,180,0)'); hz.addColorStop(1, 'rgba(255,60,180,0.12)');
      c.fillStyle = hz; c.fillRect(0, h * 0.5, w, h * 0.5);
    } else if (B.theme === 'ocean') {
      c.fillStyle = 'rgba(2,10,24,0.9)';
      c.beginPath(); c.moveTo(0, h);
      for (x = 0; x <= w; x += 20 * B.s) c.lineTo(x, h - (40 + 30 * Math.sin(x * 0.01) + 20 * Math.sin(x * 0.033)) * B.s);
      c.lineTo(w, h); c.fill();
      for (i = 0; i < 14; i++) { // kelp
        x = R() * w; c.strokeStyle = 'rgba(20,80,70,0.5)'; c.lineWidth = (3 + R() * 4) * B.s;
        c.beginPath(); c.moveTo(x, h);
        for (y = 0; y < (120 + R() * 200) * B.s; y += 10 * B.s) c.lineTo(x + Math.sin(y * 0.05 + i) * 10 * B.s, h - y);
        c.stroke();
      }
    } else if (B.theme === 'void' || B.theme === 'title') {
      var n = B.theme === 'void' ? 380 : 220;
      for (i = 0; i < n; i++) {
        x = R() * w; y = R() * h; var r = R() * R() * 1.6 * B.s + 0.3;
        c.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.7) + ')';
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
      }
      for (i = 0; i < 4; i++) {
        var nx = R() * w, ny = R() * h, nr = (150 + R() * 300) * B.s, hue = B.theme === 'void' ? 240 + R() * 80 : 260 + R() * 60;
        var ng = c.createRadialGradient(nx, ny, 0, nx, ny, nr);
        ng.addColorStop(0, 'hsla(' + hue + ',80%,60%,0.16)'); ng.addColorStop(1, 'hsla(' + hue + ',80%,40%,0)');
        c.fillStyle = ng; c.fillRect(0, 0, w, h);
      }
    }
    // vignette
    var vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
    B.base = off;
  };

  B.seedMotes = function () {
    var n = L.isLow() ? 26 : 80, w = B.cv ? B.cv.width : 100, h = B.cv ? B.cv.height : 100;
    B.motes = [];
    for (var i = 0; i < n; i++) B.motes.push({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 0.7, p: Math.random() * 6.28, h: Math.random() });
  };

  B.draw = function (dt) {
    if (!B.cv || !B.base) return;
    var c = B.ctx, w = B.cv.width, h = B.cv.height, p = PAL[B.theme], rm = L.motionReduced();
    B.t += rm ? 0 : dt;
    var t = B.t, s = B.s;
    c.globalCompositeOperation = 'source-over';
    c.drawImage(B.base, 0, 0);
    c.globalCompositeOperation = 'lighter';
    var g, i, m;
    // world-specific light layers
    if (B.theme === 'dawn' || B.theme === 'ocean') {
      for (i = 0; i < 5; i++) {
        var a = Math.sin(t * 0.15 + i * 1.7) * 0.25 + (i - 2) * 0.22;
        c.save(); c.translate(w * 0.5, B.theme === 'dawn' ? h * 0.42 : -h * 0.1); c.rotate(a);
        g = c.createLinearGradient(0, 0, 0, h * 1.2);
        var gc = p.glow;
        g.addColorStop(0, 'rgba(' + gc[0] + ',' + gc[1] + ',' + gc[2] + ',0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(-w * 0.02, 0); c.lineTo(w * 0.02, 0); c.lineTo(w * 0.12, h * 1.2); c.lineTo(-w * 0.12, h * 1.2); c.fill();
        c.restore();
      }
    }
    if (B.theme === 'title' || B.theme === 'void') { // aurora ribbons
      for (i = 0; i < 3; i++) {
        c.beginPath();
        for (var x = 0; x <= w; x += 24 * s) {
          var y = h * (0.3 + i * 0.12) + Math.sin(x * 0.004 / s + t * 0.3 + i * 2) * 60 * s + Math.sin(x * 0.011 / s - t * 0.2) * 24 * s;
          if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = 'hsla(' + (260 + i * 40 + Math.sin(t * 0.1) * 20) + ',90%,65%,0.07)';
        c.lineWidth = (50 + i * 20) * s; c.stroke();
        c.lineWidth = 6 * s; c.strokeStyle = 'hsla(' + (200 + i * 50) + ',90%,75%,0.06)'; c.stroke();
      }
    }
    if (B.theme === 'ocean') { // caustics
      for (i = 0; i < 6; i++) {
        var cx = (Math.sin(t * 0.2 + i * 2.1) * 0.5 + 0.5) * w, cy = (Math.cos(t * 0.17 + i) * 0.3 + 0.3) * h, cr = (120 + i * 30) * s;
        g = c.createRadialGradient(cx, cy, 0, cx, cy, cr);
        g.addColorStop(0, 'rgba(120,230,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
      }
    }
    // motes
    var mc = p.mote;
    for (i = 0; i < B.motes.length; i++) {
      m = B.motes[i];
      if (!rm) {
        if (B.theme === 'ocean') { m.y -= (14 + 30 * m.z) * dt * s; m.x += Math.sin(t + m.p) * 0.3; }
        else if (B.theme === 'city') { m.y += (220 + 300 * m.z) * dt * s; m.x -= 30 * dt * s; }
        else if (B.theme === 'caves') { m.y += Math.sin(t * 0.5 + m.p) * 0.1; }
        else { m.y -= (4 + 10 * m.z) * dt * s; m.x += Math.sin(t * 0.4 + m.p) * 0.25 * s; }
        if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
        if (m.y > h + 10) { m.y = -10; m.x = Math.random() * w; }
        if (m.x < -10) m.x = w + 10;
      }
      var tw = 0.5 + 0.5 * Math.sin(t * (1 + m.z * 2) + m.p);
      if (B.theme === 'city') {
        c.strokeStyle = m.h < 0.5 ? 'rgba(255,90,210,' + 0.12 * m.z + ')' : 'rgba(90,240,255,' + 0.12 * m.z + ')';
        c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + 4 * s, m.y - 18 * s * m.z); c.stroke();
      } else if (B.theme === 'ocean') {
        c.strokeStyle = 'rgba(180,240,255,' + (0.12 + 0.2 * m.z) + ')'; c.lineWidth = 1 * s;
        c.beginPath(); c.arc(m.x, m.y, (1.5 + m.z * 3) * s, 0, 6.283); c.stroke();
      } else {
        var col = mc;
        if (B.theme === 'caves') col = [[255, 120, 160], [120, 255, 180], [120, 170, 255], [200, 160, 255]][Math.floor(m.h * 4)];
        var rr = (1 + m.z * 2.2) * s * (B.theme === 'caves' ? tw * 1.6 : 1);
        g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, rr * 4);
        g.addColorStop(0, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.35 * m.z * (0.4 + tw * 0.6)) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(m.x - rr * 4, m.y - rr * 4, rr * 8, rr * 8);
      }
    }
    // occasional shooting star
    if ((B.theme === 'void' || B.theme === 'title') && !rm) {
      var ph = (t * 0.13) % 1;
      if (ph < 0.08) {
        var k = ph / 0.08, sx = w * (0.2 + 0.6 * ((Math.floor(t * 0.13) * 0.37) % 1)), sy = h * 0.15;
        c.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - k)) + ')'; c.lineWidth = 2 * s;
        c.beginPath(); c.moveTo(sx + k * 300 * s, sy + k * 120 * s); c.lineTo(sx + k * 300 * s - 80 * s, sy + k * 120 * s - 32 * s); c.stroke();
      }
    }
    c.globalCompositeOperation = 'source-over';
  };
})();
