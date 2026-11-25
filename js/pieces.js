/* Lumen — pieces.js : procedural vector art for every board piece */
(function () {
  'use strict';
  var L = window.L;
  var TAU = Math.PI * 2;
  var P = L.draw = {};

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  P.rr = rr;
  function poly(c, n, r, rot) {
    c.beginPath();
    for (var i = 0; i < n; i++) { var a = rot + i * TAU / n; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath();
  }
  function glow(c, r, col, a) {
    var g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
    c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2);
  }
  function rgbaT(m) { var k = L.COLORS[m] || L.COLORS[7]; return 'rgba(' + k[0] + ',' + k[1] + ',' + k[2] + ',A)'; }
  P.rgbaT = rgbaT;

  // colour-blind glyphs: red ▲, green ■, blue ●, white ★
  P.glyph = function (c, mask, size, ink) {
    c.save();
    c.fillStyle = ink || 'rgba(10,8,20,0.85)'; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1, size * 0.12);
    var parts = [];
    if (mask === 7) parts = ['star']; else { if (mask & 1) parts.push('tri'); if (mask & 2) parts.push('sq'); if (mask & 4) parts.push('circ'); }
    var gap = size * 1.05, x0 = -(parts.length - 1) * gap / 2;
    parts.forEach(function (sh, i) {
      c.save(); c.translate(x0 + i * gap, 0);
      var s = size / 2;
      c.beginPath();
      if (sh === 'tri') { c.moveTo(0, -s); c.lineTo(s * 0.95, s * 0.75); c.lineTo(-s * 0.95, s * 0.75); c.closePath(); }
      else if (sh === 'sq') { c.rect(-s * 0.8, -s * 0.8, s * 1.6, s * 1.6); }
      else if (sh === 'circ') { c.arc(0, 0, s * 0.85, 0, TAU); }
      else { for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? s * 0.45 : s; if (k) c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else c.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); } c.closePath(); }
      c.fill(); c.stroke(); c.restore();
    });
    c.restore();
  };

  P.emitter = function (c, p, cs, t, o) {
    var r = cs * 0.38, ang = -p.d * Math.PI / 4, col = rgbaT(p.c);
    c.save();
    c.rotate(ang);
    // housing
    var g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#5b4a6e'); g.addColorStop(0.5, '#2a2036'); g.addColorStop(1, '#181220');
    poly(c, 8, r, Math.PI / 8); c.fillStyle = g; c.fill();
    c.lineWidth = cs * 0.035; c.strokeStyle = 'rgba(255,214,150,0.55)'; c.stroke();
    // barrel
    var bg2 = c.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
    bg2.addColorStop(0, '#8d7aa3'); bg2.addColorStop(0.5, '#3b2f4c'); bg2.addColorStop(1, '#1d1626');
    rr(c, r * 0.1, -r * 0.28, r * 1.05, r * 0.56, r * 0.12); c.fillStyle = bg2; c.fill();
    c.strokeStyle = 'rgba(255,214,150,0.4)'; c.lineWidth = cs * 0.02; c.stroke();
    // core
    var pulse = 0.75 + 0.25 * Math.sin(t * 4 + p.id);
    c.globalCompositeOperation = 'lighter';
    glow(c, r * 1.3, col, 0.35 * pulse);
    c.beginPath(); c.arc(0, 0, r * 0.32, 0, TAU); c.fillStyle = col.replace('A', 0.95); c.fill();
    c.beginPath(); c.arc(r * 1.1, 0, r * 0.16, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();
    c.globalCompositeOperation = 'source-over';
    c.restore();
    if (o.cb) { c.save(); c.translate(-cs * 0.28, cs * 0.3); P.glyph(c, p.c, cs * 0.14); c.restore(); }
  };

  P.crystal = function (c, p, cs, t, o) {
    var lit = o.lit || 0, col = rgbaT(p.c), r = cs * 0.3, bob = o.rm ? 0 : Math.sin(t * 2 + p.id) * cs * 0.025 * (0.4 + lit);
    c.save(); c.translate(0, bob);
    // pedestal
    c.save(); c.translate(0, cs * 0.3 - bob); c.scale(1, 0.35);
    c.beginPath(); c.arc(0, 0, cs * 0.3, 0, TAU); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fill(); c.restore();
    if (lit > 0.02) {
      c.globalCompositeOperation = 'lighter';
      glow(c, cs * (0.9 + 0.15 * Math.sin(t * 3)), col, 0.45 * lit);
      if (!o.rm) {
        c.save(); c.rotate(t * 0.6);
        for (var i = 0; i < 6; i++) {
          c.rotate(TAU / 6);
          var g = c.createLinearGradient(0, 0, cs * 0.95, 0);
          g.addColorStop(0, col.replace('A', 0.35 * lit)); g.addColorStop(1, col.replace('A', 0));
          c.fillStyle = g; c.beginPath(); c.moveTo(0, -cs * 0.03); c.lineTo(cs * 0.95, -cs * 0.09); c.lineTo(cs * 0.95, cs * 0.09); c.lineTo(0, cs * 0.03); c.fill();
        }
        c.restore();
      }
      c.globalCompositeOperation = 'source-over';
    }
    // gem body: crown + pavilion facets
    var top = -r, girdle = -r * 0.25, bot = r * 1.05, hw = r * 0.95;
    var facets = [
      [[0, top], [-hw * 0.5, girdle], [hw * 0.5, girdle]],
      [[0, top], [-hw * 0.5, girdle], [-hw, girdle]],
      [[0, top], [hw * 0.5, girdle], [hw, girdle]],
      [[-hw, girdle], [-hw * 0.5, girdle], [0, bot]],
      [[-hw * 0.5, girdle], [hw * 0.5, girdle], [0, bot]],
      [[hw * 0.5, girdle], [hw, girdle], [0, bot]]
    ];
    var shades = [0.95, 0.65, 0.8, 0.5, 0.75, 0.4];
    facets.forEach(function (f, k) {
      c.beginPath(); c.moveTo(f[0][0], f[0][1]); c.lineTo(f[1][0], f[1][1]); c.lineTo(f[2][0], f[2][1]); c.closePath();
      var a = (0.22 + 0.7 * lit) * shades[k];
      c.fillStyle = col.replace('A', a); c.fill();
      c.strokeStyle = 'rgba(255,255,255,' + (0.18 + 0.5 * lit) + ')'; c.lineWidth = cs * 0.012; c.stroke();
    });
    // dim core when unlit
    if (lit < 0.98) {
      c.globalCompositeOperation = 'lighter';
      var pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + p.id * 1.3);
      glow(c, r * 0.8, col, 0.12 + 0.12 * pulse);
      c.globalCompositeOperation = 'source-over';
    }
    // sparkle
    if (lit > 0.5 && !o.rm) {
      var sp = (t * 0.7 + p.id * 0.37) % 1;
      if (sp < 0.25) {
        var k2 = Math.sin(sp / 0.25 * Math.PI);
        c.save(); c.translate(-r * 0.35, -r * 0.45); c.globalCompositeOperation = 'lighter';
        c.strokeStyle = 'rgba(255,255,255,' + k2 + ')'; c.lineWidth = cs * 0.015;
        c.beginPath(); c.moveTo(-cs * 0.1 * k2, 0); c.lineTo(cs * 0.1 * k2, 0); c.moveTo(0, -cs * 0.1 * k2); c.lineTo(0, cs * 0.1 * k2); c.stroke();
        c.restore();
      }
    }
    if (o.over) {
      c.strokeStyle = 'rgba(255,80,80,' + (0.5 + 0.4 * Math.sin(t * 10)) + ')'; c.lineWidth = cs * 0.03;
      c.beginPath(); c.arc(0, 0, r * 1.35, 0, TAU); c.stroke();
    }
    c.restore();
    if (o.cb) { c.save(); c.translate(0, cs * 0.02); P.glyph(c, p.c, cs * 0.15); c.restore(); }
  };

  function pivot(c, cs, t, o) {
    var g = c.createRadialGradient(0, -cs * 0.05, 0, 0, 0, cs * 0.3);
    g.addColorStop(0, 'rgba(90,80,120,0.9)'); g.addColorStop(1, 'rgba(25,20,40,0.9)');
    c.beginPath(); c.arc(0, 0, cs * 0.3, 0, TAU); c.fillStyle = g; c.fill();
    c.save(); c.rotate(o.rm ? 0 : t * 0.4);
    c.setLineDash([cs * 0.03, cs * 0.05]); c.strokeStyle = 'rgba(255,220,160,0.35)'; c.lineWidth = cs * 0.015;
    c.beginPath(); c.arc(0, 0, cs * 0.26, 0, TAU); c.stroke(); c.setLineDash([]);
    c.restore();
  }

  P.mirror = function (c, p, cs, t, o) {
    pivot(c, cs, t, o);
    c.save(); c.rotate(o.angle);
    var len = cs * 0.44, th = cs * 0.075;
    // back
    rr(c, -len, -th * 0.2, len * 2, th * 1.1, th * 0.4); c.fillStyle = '#241c30'; c.fill();
    // silver face with moving specular
    var g = c.createLinearGradient(-len, 0, len, 0), sh = ((t * 0.25 + p.id * 0.3) % 1.6) - 0.3;
    g.addColorStop(0, '#9aa6c0'); g.addColorStop(L.clamp(sh - 0.08, 0, 1), '#c9d2e8');
    g.addColorStop(L.clamp(sh, 0, 1), '#ffffff'); g.addColorStop(L.clamp(sh + 0.08, 0, 1), '#c9d2e8'); g.addColorStop(1, '#8590ab');
    rr(c, -len, -th * 0.9, len * 2, th * 1.1, th * 0.4); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,230,180,0.65)'; c.lineWidth = cs * 0.014; c.stroke();
    c.restore();
    c.beginPath(); c.arc(0, 0, cs * 0.05, 0, TAU); c.fillStyle = '#ffd78a'; c.fill();
    if (p.free) freeMark(c, cs);
  };

  P.splitter = function (c, p, cs, t, o) {
    pivot(c, cs, t, o);
    c.save(); c.rotate(o.angle);
    var len = cs * 0.44, th = cs * 0.09;
    rr(c, -len, -th / 2, len * 2, th, th * 0.3);
    var g = c.createLinearGradient(0, -th, 0, th);
    g.addColorStop(0, 'rgba(160,240,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(120,180,255,0.55)');
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(200,250,255,0.9)'; c.lineWidth = cs * 0.014; c.stroke();
    c.setLineDash([cs * 0.04, cs * 0.035]); c.beginPath(); c.moveTo(-len * 0.9, 0); c.lineTo(len * 0.9, 0);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke(); c.setLineDash([]);
    c.restore();
    if (p.free) freeMark(c, cs);
  };

  P.prism = function (c, p, cs, t, o) {
    var r = cs * 0.36;
    c.save(); c.translate(0, cs * 0.04);
    poly(c, 3, r, -Math.PI / 2);
    var g = c.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(180,200,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0.4)');
    c.fillStyle = g; c.fill();
    var hue = (t * 40) % 360;
    c.lineWidth = cs * 0.03; c.strokeStyle = 'hsla(' + hue + ',90%,70%,0.9)'; c.stroke();
    c.globalCompositeOperation = 'lighter';
    ['255,90,120', '90,255,160', '90,160,255'].forEach(function (rgb, i) {
      c.strokeStyle = 'rgba(' + rgb + ',0.5)'; c.lineWidth = cs * 0.015;
      c.beginPath(); c.moveTo(-r * 0.2, r * 0.05); c.lineTo(r * 0.55, -r * 0.2 + i * r * 0.2); c.stroke();
    });
    c.globalCompositeOperation = 'source-over';
    c.restore();
    if (p.free) freeMark(c, cs);
  };

  P.filter = function (c, p, cs, t, o) {
    var m = L.FILTERS[p.s] || 7, col = rgbaT(m), r = cs * 0.32;
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    var g = c.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, col.replace('A', 0.75)); g.addColorStop(1, col.replace('A', 0.3));
    c.fillStyle = g; c.fill();
    c.lineWidth = cs * 0.06; c.strokeStyle = '#2b2238'; c.stroke();
    c.lineWidth = cs * 0.016; c.strokeStyle = col.replace('A', 0.95); c.stroke();
    for (var i = 0; i < 6; i++) { // bolts
      var a = i * TAU / 6 + 0.3;
      c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, cs * 0.018, 0, TAU); c.fillStyle = '#d8c79f'; c.fill();
    }
    c.beginPath(); c.ellipse ? c.ellipse(-r * 0.3, -r * 0.35, r * 0.28, r * 0.12, -0.6, 0, TAU) : c.arc(-r * 0.3, -r * 0.35, r * 0.15, 0, TAU);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    if (o.cb) P.glyph(c, m, cs * 0.14);
    if (p.free) freeMark(c, cs);
  };

  P.lens = function (c, p, cs, t, o) {
    c.save(); c.rotate(o.angle);
    var h = cs * 0.4, w = cs * 0.16;
    c.beginPath(); c.moveTo(0, -h); c.quadraticCurveTo(w * 2, 0, 0, h); c.quadraticCurveTo(-w * 2, 0, 0, -h); c.closePath();
    var g = c.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, 'rgba(120,220,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(120,220,255,0.35)');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(200,250,255,0.9)'; c.lineWidth = cs * 0.016; c.stroke();
    // bend arrow (points to bend side)
    c.strokeStyle = 'rgba(255,230,160,0.9)'; c.lineWidth = cs * 0.03; c.lineCap = 'round';
    c.beginPath(); c.arc(0, cs * 0.05, cs * 0.3, -Math.PI * 0.85, -Math.PI * 0.6); c.stroke();
    var ax = Math.cos(-Math.PI * 0.6) * cs * 0.3, ay = Math.sin(-Math.PI * 0.6) * cs * 0.3 + cs * 0.05;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax - cs * 0.08, ay - cs * 0.02); c.moveTo(ax, ay); c.lineTo(ax - cs * 0.03, ay + cs * 0.07); c.stroke();
    c.restore();
    if (p.free) freeMark(c, cs);
  };

  var PORTAL_C = [[255, 120, 230], [100, 240, 255], [255, 210, 90]];
  P.portal = function (c, p, cs, t, o) {
    var k = PORTAL_C[(p.g || 0) % 3], rgb = k[0] + ',' + k[1] + ',' + k[2], r = cs * 0.36, sp = o.rm ? 0 : t * 1.8;
    var g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.7, 'rgba(' + rgb + ',0.25)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = g; c.fill();
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 3; i++) {
      c.strokeStyle = 'rgba(' + rgb + ',' + (0.75 - i * 0.2) + ')'; c.lineWidth = cs * (0.035 - i * 0.008);
      c.beginPath(); c.arc(0, 0, r * (0.95 - i * 0.22), sp * (i % 2 ? -1 : 1) + i, sp * (i % 2 ? -1 : 1) + i + Math.PI * 1.2); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    if (p.pair == null) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold ' + Math.round(cs * 0.22) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 0); }
  };

  P.wall = function (c, p, cs, t, o) {
    var s = cs * 0.42;
    rr(c, -s, -s, s * 2, s * 2, cs * 0.08);
    var g = c.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, o.wallA || '#4a3c5c'); g.addColorStop(1, o.wallB || '#1c1526');
    c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = cs * 0.02; c.stroke();
    var R = L.rng(p.id * 977 + 3);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = cs * 0.015;
    c.beginPath(); var x = -s * 0.6 + R() * s * 0.4, y = -s * 0.8;
    c.moveTo(x, y); for (var i = 0; i < 4; i++) { x += (R() - 0.5) * s * 0.5; y += s * 0.4; c.lineTo(x, y); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.07)'; rr(c, -s + cs * 0.04, -s + cs * 0.04, s * 2 - cs * 0.08, s * 0.4, cs * 0.05); c.fill();
  };

  P.slider = function (c, p, cs, t, o) {
    var s = cs * 0.38;
    rr(c, -s, -s, s * 2, s * 2, cs * 0.07);
    var g = c.createLinearGradient(0, -s, 0, s);
    g.addColorStop(0, '#6c7a8e'); g.addColorStop(1, '#2a3140');
    c.fillStyle = g; c.fill();
    c.save(); rr(c, -s, -s, s * 2, s * 2, cs * 0.07); c.clip();
    c.strokeStyle = 'rgba(255,200,60,0.55)'; c.lineWidth = cs * 0.07;
    for (var i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * cs * 0.2 - s, s); c.lineTo(i * cs * 0.2 + s, -s); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = cs * 0.02; rr(c, -s, -s, s * 2, s * 2, cs * 0.07); c.stroke();
    // arrows toward other track cell
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(0, 0, cs * 0.09, 0, TAU); c.fillStyle = '#1b1f2a'; c.fill();
    c.strokeStyle = 'rgba(255,230,140,0.9)'; c.lineWidth = cs * 0.02; c.stroke();
  };

  function freeMark(c, cs) {
    c.save(); c.translate(cs * 0.33, -cs * 0.33);
    c.beginPath(); c.arc(0, 0, cs * 0.07, 0, TAU); c.fillStyle = 'rgba(255,215,130,0.95)'; c.fill();
    c.strokeStyle = 'rgba(40,20,10,0.8)'; c.lineWidth = cs * 0.015;
    c.beginPath(); c.moveTo(-cs * 0.035, 0); c.lineTo(cs * 0.035, 0); c.moveTo(0, -cs * 0.035); c.lineTo(0, cs * 0.035); c.stroke();
    c.restore();
  }

  // Static icon for tray / palette (returns data URL), cached
  var iconCache = {};
  P.icon = function (t, extra, size) {
    size = size || 64;
    var key = t + ':' + (extra == null ? '' : extra) + ':' + size;
    if (iconCache[key]) return iconCache[key];
    var cv = document.createElement('canvas'); cv.width = cv.height = size;
    var c = cv.getContext('2d'); c.translate(size / 2, size / 2);
    var p = { id: 1, t: t, s: 0, c: 7, d: 0, g: 0, pair: 1 };
    var o = { angle: -Math.PI / 4, lit: 0.6, rm: true, cb: false };
    if (t === 'mirror' || t === 'splitter') { p.s = extra || 2; o.angle = -p.s * Math.PI / 8; }
    if (t === 'filter') p.s = extra || 0;
    if (t === 'crystal' || t === 'emitter') p.c = extra || 7;
    if (t === 'lens') o.angle = 0;
    try { (P[t] || P.wall)(c, p, size * 0.95, 0.5, o); } catch (e) { }
    iconCache[key] = cv.toDataURL();
    return iconCache[key];
  };
})();
