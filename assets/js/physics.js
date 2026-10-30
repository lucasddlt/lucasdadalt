/* =========================================================
   Physics backgrounds — one scene per section, same drawing style:
   thin streamlines in a neutral tone, a few red tracers, a caption.
     joukowski : potential flow past a Joukowski airfoil (Laplace)
     stokes    : Stokes flow past a sphere vs potential flow
     karman    : Navier–Stokes (lattice Boltzmann D2Q9), cylinder wake
     benard    : Rayleigh–Bénard convection rolls (Boussinesq)
     waves     : wave equation, plucked string harmonics
     orbits    : Hohmann transfer Earth → Mars (Kepler)
   A scene only runs while its section is on screen.
   ========================================================= */
(function () {
  "use strict";
  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var INTRO = 1500;
  var TAU = Math.PI * 2;

  /* ---------- small helpers ---------- */
  function C(re, im) { return { re: re, im: im }; }
  function add(a, b) { return C(a.re + b.re, a.im + b.im); }
  function sub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function mul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function div(a, b) { var d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
  function cabs(a) { return Math.hypot(a.re, a.im); }
  function expi(t) { return C(Math.cos(t), Math.sin(t)); }
  function csqrt(a) {
    var r = cabs(a), re = Math.sqrt(Math.max(0, (r + a.re) / 2)), im = Math.sqrt(Math.max(0, (r - a.re) / 2));
    return C(re, a.im < 0 ? -im : im);
  }
  function ease(x) { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    function v(n, d) { return (cs.getPropertyValue(n) || "").trim() || d; }
    return { line: v("--flow-line", "#e7e1e2"), edge: v("--ink-3", "#8a8083"), ink: v("--ink", "#1a1415"),
             ink2: v("--ink-2", "#5d5355"), fill: v("--bg", "#ffffff"), accent: v("--red", "#cf0a1f") };
  }
  function bisect(arr, x) {
    var lo = 0, hi = arr.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < x) lo = m + 1; else hi = m; }
    return lo;
  }

  /* Integrate a streamline of a steady 2-D field with unit-speed RK2 steps.
     vel(x,y) -> [u,v] in world units; returns {p:[sx,sy,...], t:[...]} in screen units. */
  function streamline(x, y, vel, h, maxSteps, stop, toScreen) {
    var p = [], t = [0], time = 0, px = x, py = y;
    for (var k = 0; k < maxSteps; k++) {
      var s = toScreen(x, y); p.push(s[0], s[1]);
      if (stop(x, y)) break;
      var a = vel(x, y), na = Math.hypot(a[0], a[1]);
      if (na < 1e-6) break;
      var mx = x + a[0] / na * h / 2, my = y + a[1] / na * h / 2;
      var b = vel(mx, my), nb = Math.hypot(b[0], b[1]);
      if (nb < 1e-6) break;
      x += b[0] / nb * h; y += b[1] / nb * h;
      time += h / nb; t.push(time);
      px = x; py = y;
    }
    if (t.length > p.length / 2) t.length = p.length / 2;
    return { p: p, t: t, n: p.length / 2, phase: Math.random() };
  }

  /* ---------- scene runner ---------- */
  function Scene(canvas, def) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.def = def;
    this.band = canvas.closest(".band") || canvas.parentNode;
    this.visible = false; this.running = false; this.built = false; this.raf = 0;
    this.mode = null; this.state = null; this.cache = null;
  }
  Scene.prototype.layout = function () {
    var r = this.canvas.getBoundingClientRect();
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.W * this.dpr); this.canvas.height = Math.round(this.H * this.dpr);
    this.wide = this.W > 860;
    var copy = this.band.querySelector(".band-copy");
    if (copy) {
      var b = copy.getBoundingClientRect(), pb = parseFloat(getComputedStyle(copy).paddingBottom) || 0;
      this.zone = { x0: b.left - r.left - 24, x1: b.right - r.left + 24, y0: b.top - r.top - 24, y1: b.bottom - pb - r.top + 24 };
    } else this.zone = null;
    var cap = this.band.querySelector(".band-caption"), y1 = this.H - 16;
    if (cap) y1 = cap.getBoundingClientRect().top - r.top - 12;
    var y0 = this.zone ? this.zone.y1 : 0;
    this.free = { y0: y0, y1: Math.max(y0 + 80, y1), mid: (y0 + Math.max(y0 + 80, y1)) / 2, h: Math.max(80, y1 - y0) };
  };
  Scene.prototype.inZone = function (x, y) {
    var z = this.zone; return !!z && x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1;
  };
  Scene.prototype.rebuild = function (intro) {
    this.pause();
    this.col = readColors(); this.layout();
    this.state = this.def.build(this);
    this.cache = null; this.built = true; this.canvas.classList.add("on");
    this.start = performance.now() - (intro ? 0 : INTRO);
    this.draw(performance.now());
    if (!REDUCE) this.play();
  };
  Scene.prototype.play = function () {
    if (this.running || REDUCE || !this.visible || document.hidden) return;
    var self = this; this.running = true;
    var loop = function (now) { if (!self.running) return; self.draw(now); self.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  };
  Scene.prototype.pause = function () { this.running = false; cancelAnimationFrame(this.raf); };
  Scene.prototype.draw = function (now) {
    var el = REDUCE ? 1e9 : now - this.start, ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.def.frame) { ctx.clearRect(0, 0, this.W, this.H); this.def.frame(this, ctx, el / 1000); return; }
    // streamline scenes: intro draw-in, then cached lines + moving tracers
    if (el < INTRO) { ctx.clearRect(0, 0, this.W, this.H); this.drawLines(ctx, el / INTRO); return; }
    if (!this.cache) {
      this.cache = document.createElement("canvas");
      this.cache.width = this.canvas.width; this.cache.height = this.canvas.height;
      var c = this.cache.getContext("2d"); c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawLines(c, 1);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.cache, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!REDUCE) this.drawTracers(ctx, (el - INTRO) / 1000);
  };
  Scene.prototype.drawLines = function (c, frac) {
    var L = this.state.lines;
    c.lineWidth = 1; c.strokeStyle = this.col.line; c.lineJoin = "round";
    for (var i = 0; i < L.length; i++) {
      var f = ease(frac * 1.25 - (i / L.length) * 0.25), n = Math.max(2, Math.floor(L[i].n * f)), p = L[i].p;
      c.beginPath(); c.moveTo(p[0], p[1]);
      for (var k = 1; k < n; k++) c.lineTo(p[2 * k], p[2 * k + 1]);
      if (L[i].closed && f >= 1) c.closePath();
      c.stroke();
    }
    if (this.state.body) this.state.body(c, this);
  };
  Scene.prototype.drawTracers = function (c, time) {
    var L = this.state.lines, speed = this.state.speed || 1, every = this.state.every || 2, tail = this.state.tail || 0.45;
    c.lineCap = "round"; c.strokeStyle = this.col.accent; c.fillStyle = this.col.accent;
    for (var i = 0; i < L.length; i += every) {
      var l = L[i], T = l.t[l.t.length - 1];
      if (!(T > 0)) continue;
      var tau = (time * speed + l.phase * T) % T;
      var i1 = bisect(l.t, tau), t0 = tau - tail, i0;
      if (t0 < 0 && l.closed) t0 += T;
      i0 = t0 < 0 ? 0 : bisect(l.t, t0);
      if (i0 > i1 && !l.closed) continue;
      var hx = l.p[2 * i1], hy = l.p[2 * i1 + 1];
      if (this.inZone(hx, hy)) continue;
      c.globalAlpha = 0.8; c.lineWidth = 1.5; c.beginPath();
      if (i0 <= i1) {
        c.moveTo(l.p[2 * i0], l.p[2 * i0 + 1]);
        for (var k = i0 + 1; k <= i1; k++) c.lineTo(l.p[2 * k], l.p[2 * k + 1]);
      } else { // wraps around a closed orbit
        c.moveTo(l.p[2 * i0], l.p[2 * i0 + 1]);
        for (var a = i0 + 1; a < l.n; a++) c.lineTo(l.p[2 * a], l.p[2 * a + 1]);
        for (var b = 0; b <= i1; b++) c.lineTo(l.p[2 * b], l.p[2 * b + 1]);
      }
      c.stroke(); c.globalAlpha = 1;
      c.beginPath(); c.arc(hx, hy, 1.7, 0, TAU); c.fill();
    }
  };
  function circleBody(cx, cy, r) {
    return function (c, s) {
      c.beginPath(); c.arc(cx, cy, r, 0, TAU);
      c.fillStyle = s.col.fill; c.fill(); c.lineWidth = 1.2; c.strokeStyle = s.col.edge; c.stroke();
    };
  }
  function output(scene, key, text) {
    var el = scene.band.querySelector('[data-out="' + key + '"]'); if (el) el.textContent = text;
  }

  /* ---------- 1. Joukowski airfoil, potential flow ---------- */
  var joukowski = {
    modeDefault: "6",
    build: function (s) {
      var alpha = parseFloat(s.mode || "6") * Math.PI / 180;
      var MU = C(-0.09, 0.07), R = cabs(sub(C(1, 0), MU)), gamma = 0;
      function W(z) {
        var zp = sub(z, MU);
        return add(sub(expi(-alpha), div(mul(C(R * R, 0), expi(alpha)), mul(zp, zp))), div(C(0, gamma / TAU), zp));
      }
      var A = W(C(1, 0)), B = div(C(0, 1 / TAU), sub(C(1, 0), MU));
      gamma = div(C(-A.re, -A.im), B).re;
      output(s, "gamma", gamma.toFixed(2));
      function jk(z) { return add(z, div(C(1, 0), z)); }
      function inv(w) {
        var q = csqrt(sub(mul(w, w), C(4, 0)));
        var z1 = C((w.re + q.re) / 2, (w.im + q.im) / 2), z2 = C((w.re - q.re) / 2, (w.im - q.im) / 2);
        return cabs(sub(z1, MU)) >= cabs(sub(z2, MU)) ? z1 : z2;
      }
      var scale = s.wide ? Math.min(s.W * 0.11, s.H * 0.2) : Math.min(s.W * 0.2, s.free.h * 0.32);
      var cx = s.wide ? s.W * 0.7 : s.W * 0.55, cy = s.wide ? s.H * 0.5 : s.free.mid;
      function scr(z) { return [cx + z.re * scale, cy - z.im * scale]; }
      var left = (-20 - cx) / scale, right = (s.W + 40 - cx) / scale;
      var top = (cy + 40) / scale, bottom = -(s.H + 40 - cy) / scale;
      var spacing = Math.max(15, Math.min(24, s.H / 26)) / scale, lines = [];
      for (var y = bottom; y <= top; y += spacing) {
        var zeta = inv(C(left, y + 1e-4)), pts = [], times = [0], t = 0, prev = null, h = 0.02;
        for (var g = 0; g < 6000; g++) {
          var zz = jk(zeta), sc = scr(zz);
          if (prev) {
            var dzt = sub(C(1, 0), div(C(1, 0), mul(zeta, zeta)));
            var sp = cabs(W(zeta)) / Math.max(cabs(dzt), 1e-3);
            t += Math.hypot(zz.re - prev.re, zz.im - prev.im) / Math.max(sp, 0.05); times.push(t);
          }
          pts.push(sc[0], sc[1]); prev = zz;
          if (zz.re > right) break;
          var v1 = W(zeta), n1 = cabs(v1) || 1, mid = C(zeta.re + v1.re / n1 * h / 2, zeta.im - v1.im / n1 * h / 2);
          var v2 = W(mid), n2 = cabs(v2) || 1;
          zeta = C(zeta.re + v2.re / n2 * h, zeta.im - v2.im / n2 * h);
          if (cabs(sub(zeta, MU)) < R * 1.002) break;
        }
        if (pts.length > 8) lines.push({ p: pts, t: times, n: pts.length / 2, phase: Math.random() });
      }
      var foil = [];
      for (var k = 0; k <= 240; k++) { var th = k / 240 * TAU, a = scr(jk(add(MU, C(R * Math.cos(th), R * Math.sin(th))))); foil.push(a[0], a[1]); }
      return {
        lines: lines, speed: 1.1,
        body: function (c, sc) {
          c.beginPath(); c.moveTo(foil[0], foil[1]);
          for (var i = 2; i < foil.length; i += 2) c.lineTo(foil[i], foil[i + 1]);
          c.closePath(); c.fillStyle = sc.col.fill; c.fill(); c.lineWidth = 1.2; c.strokeStyle = sc.col.edge; c.stroke();
        }
      };
    }
  };

  /* ---------- 2. Sphere at low Reynolds number: Stokes vs potential ---------- */
  var stokes = {
    modeDefault: "stokes",
    build: function (s) {
      var potential = s.mode === "potential", a = 1;
      var scale = s.wide ? Math.min(s.H * 0.13, s.W * 0.06) : Math.min(s.free.h * 0.2, s.W * 0.11);
      var cx = s.wide ? s.W * 0.72 : s.W * 0.6, cy = s.wide ? s.H * 0.5 : s.free.mid;
      function scr(x, y) { return [cx + x * scale, cy - y * scale]; }
      function vel(x, y) {
        var r = Math.hypot(x, y); if (r < a) return [0, 0];
        var ct = x / r, st = Math.abs(y) / r, q = a / r, q3 = q * q * q, ur, ut;
        if (potential) { ur = ct * (1 - q3); ut = -st * (1 + q3 / 2); }
        else { ur = ct * (1 - 1.5 * q + 0.5 * q3); ut = -st * (1 - 0.75 * q - 0.25 * q3); }
        var ux = ur * ct - ut * st, uy = ur * st + ut * ct;
        return [ux, y < 0 ? -uy : uy];
      }
      var left = (-30 - cx) / scale, right = (s.W + 30 - cx) / scale, half = (Math.max(cy, s.H - cy) + 30) / scale;
      var spacing = Math.max(14, Math.min(22, s.H / 24)) / scale, lines = [], h = 3 / scale;
      for (var y = spacing / 2; y <= half; y += spacing) {
        [y, -y].forEach(function (yy) {
          lines.push(streamline(left, yy, vel, h, 5000, function (x, z) { return x > right || Math.hypot(x, z) < a * 1.001; }, scr));
        });
      }
      output(s, "drag", potential ? "0 (d'Alembert)" : "6πμaU");
      return { lines: lines, speed: 1.4 * scale / 40, tail: 0.6 * 40 / scale, body: circleBody(cx, cy, a * scale) };
    }
  };

  /* ---------- 3. Rayleigh–Bénard convection rolls ---------- */
  var benard = {
    build: function (s) {
      var k = 3.117, top = s.wide ? s.H * 0.14 : s.free.y0 + 30, bot = s.wide ? s.H * 0.86 : s.free.y1 - 26, Hpx = bot - top;
      var cellPx = Hpx * Math.PI / k;               // half-wavelength = one roll
      var x0 = s.wide ? s.W * 0.38 : 0;             // rolls start right of the text on wide screens
      var lines = [], levels = [0.12, 0.3, 0.48, 0.66, 0.84, 0.95];
      var nCells = Math.ceil((s.W - x0) / cellPx) + 1;
      for (var m = 0; m < nCells; m++) {
        var xa = m * Math.PI / k, xb = (m + 1) * Math.PI / k, sgn = m % 2 === 0 ? 1 : -1;
        levels.forEach(function (c) {
          var xmin = xa + Math.asin(c) / k, xmax = xb - Math.asin(c) / k, N = 90, up = [], dn = [];
          for (var i = 0; i <= N; i++) {
            var x = xmin + (xmax - xmin) * (1 - Math.cos(Math.PI * i / N)) / 2;
            var sk = Math.abs(Math.sin(k * x)), ratio = Math.min(1, c / Math.max(sk, 1e-9));
            var zl = Math.asin(ratio) / Math.PI;
            up.push([x, 1 - zl]); dn.push([x, zl]);
          }
          // closed loop: along the top branch, then back along the bottom one
          var loop = up.concat(dn.reverse());
          // orient the loop with the flow: u = π sin(kx) cos(πz) at the top branch
          if (sgn > 0) loop.reverse();
          var p = [], t = [0], time = 0;
          for (var j = 0; j < loop.length; j++) {
            var sc = [x0 + (loop[j][0] / (Math.PI / k)) * cellPx, bot - loop[j][1] * Hpx]; p.push(sc[0], sc[1]);
            if (j > 0) {
              var X = loop[j][0], Z = loop[j][1];
              var u = Math.PI * Math.sin(k * X) * Math.cos(Math.PI * Z), w = -k * Math.cos(k * X) * Math.sin(Math.PI * Z);
              var ds = Math.hypot(loop[j][0] - loop[j - 1][0], loop[j][1] - loop[j - 1][1]);
              time += ds / Math.max(Math.hypot(u, w), 0.08); t.push(time);
            }
          }
          lines.push({ p: p, t: t, n: p.length / 2, closed: true, phase: Math.random() });
        });
      }
      return {
        lines: lines, speed: 0.35, every: 3, tail: 0.5,
        body: function (c, sc) {
          c.lineWidth = 2; c.strokeStyle = sc.col.accent; c.beginPath(); c.moveTo(x0, bot + 6); c.lineTo(sc.W, bot + 6); c.stroke();
          c.strokeStyle = sc.col.edge; c.beginPath(); c.moveTo(x0, top - 6); c.lineTo(sc.W, top - 6); c.stroke();
          c.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue("--mono");
          c.fillStyle = sc.col.edge; c.fillText("T", x0 + 8, top - 12);
          c.fillStyle = sc.col.accent; c.fillText("T + ΔT", x0 + 8, bot + 20);
        }
      };
    }
  };

  /* ---------- 4. Cylinder wake: Navier–Stokes by lattice Boltzmann (D2Q9, BGK) ---------- */
  var karman = (function () {
    var NX = 170, NY = 64, CXL = 38, CYL = 31.6, RAD = 5.5, U0 = 0.1, RE = 80;
    var NU = U0 * 2 * RAD / RE, OMEGA = 1 / (3 * NU + 0.5);
    var EX = [0, 1, 0, -1, 0, 1, -1, -1, 1], EY = [0, 0, 1, 0, -1, 1, 1, -1, -1], OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
    var WT = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
    var N = NX * NY, f = new Float32Array(9 * N), g = new Float32Array(9 * N), solid = new Uint8Array(N);
    var ux = new Float32Array(N), uy = new Float32Array(N), steps = 0, ready = false;
    function feq(i, r, u, v) { var eu = EX[i] * u + EY[i] * v, uu = u * u + v * v; return WT[i] * r * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * uu); }
    function init() {
      for (var y = 0; y < NY; y++) for (var x = 0; x < NX; x++) {
        var c = y * NX + x;
        solid[c] = (x - CXL) * (x - CXL) + (y - CYL) * (y - CYL) <= RAD * RAD ? 1 : 0;
        var v = 0.012 * Math.sin(TAU * x / NX); // small kick to break symmetry
        for (var i = 0; i < 9; i++) f[9 * c + i] = feq(i, 1, U0, v);
      }
      steps = 0; ready = true;
    }
    function step() {
      for (var y = 0; y < NY; y++) {
        for (var x = 0; x < NX; x++) {
          var c = y * NX + x, b = 9 * c;
          if (solid[c]) continue;
          var r = 0, mu = 0, mv = 0;
          for (var i = 0; i < 9; i++) { var fi = f[b + i]; r += fi; mu += EX[i] * fi; mv += EY[i] * fi; }
          var u = mu / r, v = mv / r;
          if (x === 0) { r = 1; u = U0; v = 0; }
          ux[c] = u; uy[c] = v;
          for (var j = 0; j < 9; j++) {
            var post = x === 0 ? feq(j, r, u, v) : f[b + j] + OMEGA * (feq(j, r, u, v) - f[b + j]);
            var tx = x + EX[j], ty = y + EY[j];
            if (ty < 0) ty += NY; else if (ty >= NY) ty -= NY;
            if (tx < 0 || tx >= NX) continue;
            var tc = ty * NX + tx;
            if (solid[tc]) g[b + OPP[j]] = post; else g[9 * tc + j] = post;
          }
        }
      }
      // outflow: copy the last interior column
      for (var yy = 0; yy < NY; yy++) {
        var cl = yy * NX + NX - 1, cp = cl - 1;
        for (var k = 0; k < 9; k++) g[9 * cl + k] = g[9 * cp + k];
        g[9 * (yy * NX) + 1] = feq(1, 1, U0, 0); g[9 * (yy * NX) + 5] = feq(5, 1, U0, 0); g[9 * (yy * NX) + 8] = feq(8, 1, U0, 0);
      }
      var t = f; f = g; g = t; steps++;
    }
    function sample(x, y) { // bilinear velocity at lattice position
      if (x < 0 || x >= NX - 1 || y < 0 || y >= NY - 1) return [U0, 0];
      var i = x | 0, j = y | 0, fx = x - i, fy = y - j, c = j * NX + i;
      var u = ux[c] * (1 - fx) * (1 - fy) + ux[c + 1] * fx * (1 - fy) + ux[c + NX] * (1 - fx) * fy + ux[c + NX + 1] * fx * fy;
      var v = uy[c] * (1 - fx) * (1 - fy) + uy[c + 1] * fx * (1 - fy) + uy[c + NX] * (1 - fx) * fy + uy[c + NX + 1] * fx * fy;
      return [u, v];
    }
    // warm the flow up in idle time so the vortex street is already there when the section is reached
    function warm() {
      if (!ready) init();
      var budget = 4000, chunk = function (dl) {
        var n = 0;
        while (steps < budget && (dl ? dl.timeRemaining() > 2 : n < 40)) { step(); n++; }
        if (steps < budget) (window.requestIdleCallback || function (cb) { return setTimeout(cb, 16); })(chunk);
      };
      (window.requestIdleCallback || function (cb) { return setTimeout(cb, 200); })(chunk);
    }
    if (document.readyState === "complete") warm(); else window.addEventListener("load", warm);

    var seeds = [], SEED_Y = [-9, -6, -3.5, -1.5, 1.5, 3.5, 6, 9], RELEASE = 5, MAXP = 260;
    return {
      build: function (s) {
        if (!ready) init();
        var sc = s.wide ? s.H / (NY - 2) : s.free.h / NY;
        var sx = (s.wide ? s.W * 0.58 : s.W * 0.16) - CXL * sc, sy = s.wide ? (s.H - NY * sc) / 2 : s.free.y0;
        s.kz = { sc: sc, sx: sx, sy: sy };
        seeds = SEED_Y.map(function (dy) { return { y: CYL + dy, pts: [] }; });
        output(s, "re", String(RE));
        return { perFrame: 4 };
      },
      frame: function (s, ctx, time) {
        var st = s.state, kz = s.kz;
        if (!REDUCE) {
          var t0 = performance.now();
          for (var n = 0; n < st.perFrame; n++) step();
          var dt = performance.now() - t0;
          if (dt > 9 && st.perFrame > 2) st.perFrame--; else if (dt < 4 && st.perFrame < 8) st.perFrame++;
          // release and advect dye particles (streaklines)
          seeds.forEach(function (sd) {
            if (steps % RELEASE < st.perFrame) sd.pts.push([CXL - RAD - 3, sd.y]);
            for (var i = 0; i < sd.pts.length; i++) {
              var p = sd.pts[i], v1 = sample(p[0], p[1]), h = st.perFrame;
              var v2 = sample(p[0] + v1[0] * h / 2, p[1] + v1[1] * h / 2);
              p[0] += v2[0] * h; p[1] += v2[1] * h;
            }
            while (sd.pts.length && (sd.pts[0][0] > NX - 2 || sd.pts.length > MAXP)) sd.pts.shift();
          });
        } else if (!seeds[0].pts.length) {
          for (var w = 0; w < 600; w++) step();
        }
        // draw streaklines
        ctx.lineJoin = "round"; ctx.lineCap = "round";
        seeds.forEach(function (sd, idx) {
          var pts = sd.pts; if (pts.length < 2) return;
          var central = idx === 3 || idx === 4;
          ctx.strokeStyle = central ? s.col.accent : s.col.edge;
          ctx.globalAlpha = central ? 0.85 : 0.5; ctx.lineWidth = central ? 1.4 : 1;
          ctx.beginPath();
          for (var i = pts.length - 1; i >= 0; i--) {
            var X = kz.sx + pts[i][0] * kz.sc, Y = kz.sy + pts[i][1] * kz.sc;
            var far = i < pts.length - 1 && Math.abs(pts[i][0] - pts[i + 1][0]) + Math.abs(pts[i][1] - pts[i + 1][1]) > 4;
            if (i === pts.length - 1 || far) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
          }
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        circleBody(kz.sx + CXL * kz.sc, kz.sy + CYL * kz.sc, RAD * kz.sc)(ctx, s);
      }
    };
  })();

  /* ---------- 5. Wave equation: plucked string ---------- */
  var waves = {
    build: function (s) {
      var x0 = s.wide ? s.W * 0.5 : s.W * 0.08, x1 = s.W - (s.wide ? 64 : 20);
      var y = s.wide ? s.H * 0.52 : s.free.mid, amp = s.wide ? s.H * 0.22 : s.free.h * 0.3, M = 12, pl = 0.22;
      var coef = [];
      for (var n = 1; n <= M; n++) coef.push(2 / (n * n * Math.PI * Math.PI * pl * (1 - pl)) * Math.sin(n * Math.PI * pl));
      return { x0: x0, x1: x1, y: y, amp: amp, coef: coef };
    },
    frame: function (s, ctx, time) {
      var st = s.state, w = 0.9, Np = 160, L = st.x1 - st.x0;
      ctx.lineWidth = 1; ctx.strokeStyle = s.col.line;
      for (var n = 1; n <= 4; n++) { // the first four modes, faint
        var a = st.coef[n - 1] * Math.cos(n * w * time) * st.amp;
        ctx.beginPath();
        for (var i = 0; i <= Np; i++) { var X = i / Np; var Y = st.y - a * Math.sin(n * Math.PI * X); if (i) ctx.lineTo(st.x0 + X * L, Y); else ctx.moveTo(st.x0, Y); }
        ctx.stroke();
      }
      ctx.strokeStyle = s.col.accent; ctx.lineWidth = 1.6; ctx.beginPath();
      for (var j = 0; j <= Np * 2; j++) {
        var x = j / (Np * 2), u = 0;
        for (var m = 1; m <= st.coef.length; m++) u += st.coef[m - 1] * Math.sin(m * Math.PI * x) * Math.cos(m * w * time);
        var YY = st.y - u * st.amp;
        if (j) ctx.lineTo(st.x0 + x * L, YY); else ctx.moveTo(st.x0, YY);
      }
      ctx.stroke();
      ctx.fillStyle = s.col.ink;
      [st.x0, st.x1].forEach(function (X) { ctx.beginPath(); ctx.arc(X, st.y, 3, 0, TAU); ctx.fill(); });
    }
  };

  /* ---------- 6. Hohmann transfer Earth → Mars ---------- */
  var orbits = {
    build: function (s) {
      var cx = s.wide ? s.W * 0.72 : s.W * 0.5, cy = s.wide ? s.H * 0.46 : s.free.mid;
      var R = Math.min(s.wide ? s.H * 0.34 : s.free.h * 0.42, s.W * 0.4) / 1.524;
      var aT = (1 + 1.524) / 2, e = (1.524 - 1) / (1.524 + 1), Tt = 0.5 * Math.pow(aT, 1.5);
      output(s, "days", String(Math.round(Tt * 365.25)));
      return { cx: cx, cy: cy, R: R, aT: aT, e: e, Tt: Tt, th0: Math.PI * 0.85 };
    },
    frame: function (s, ctx, time) {
      var st = s.state, R = st.R, cx = st.cx, cy = st.cy, yrs = 0.09;   // 1 s of animation = 0.09 year
      var cycle = st.Tt + 0.35, t = (time * yrs) % cycle, tt = Math.min(t, st.Tt);
      function P(r, th) { return [cx + r * R * Math.cos(th), cy - r * R * Math.sin(th)]; }
      ctx.lineWidth = 1; ctx.strokeStyle = s.col.line;
      [1, 1.524].forEach(function (r) { ctx.beginPath(); ctx.arc(cx, cy, r * R, 0, TAU); ctx.stroke(); });
      // transfer ellipse (focus at the Sun)
      ctx.setLineDash([3, 5]); ctx.strokeStyle = s.col.edge; ctx.beginPath();
      for (var k = 0; k <= 180; k++) {
        var nu = Math.PI * k / 180, r = st.aT * (1 - st.e * st.e) / (1 + st.e * Math.cos(nu)), q = P(r, st.th0 + nu);
        if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // spacecraft by Kepler's equation
      function craft(time) {
        var M = Math.PI * time / st.Tt, E = M;
        for (var i = 0; i < 8; i++) E -= (E - st.e * Math.sin(E) - M) / (1 - st.e * Math.cos(E));
        var nu = 2 * Math.atan(Math.sqrt((1 + st.e) / (1 - st.e)) * Math.tan(E / 2)), r = st.aT * (1 - st.e * Math.cos(E));
        return P(r, st.th0 + nu);
      }
      ctx.strokeStyle = s.col.accent; ctx.lineWidth = 1.6; ctx.beginPath();
      for (var j = 0; j <= 60; j++) { var c = craft(tt * j / 60); if (j) ctx.lineTo(c[0], c[1]); else ctx.moveTo(c[0], c[1]); }
      ctx.stroke();
      var sc = craft(tt), phi0 = Math.PI - TAU * st.Tt / 1.8808;
      var E1 = P(1, st.th0 + TAU * tt), M1 = P(1.524, st.th0 + phi0 + TAU * tt / 1.8808);
      ctx.fillStyle = s.col.ink; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(E1[0], E1[1], 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = s.col.accent; ctx.beginPath(); ctx.arc(M1[0], M1[1], 3.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sc[0], sc[1], 2.2, 0, TAU); ctx.fill();
      ctx.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue("--mono");
      ctx.fillStyle = s.col.edge;
      ctx.fillText("Earth", E1[0] + 7, E1[1] - 6); ctx.fillText("Mars", M1[0] + 7, M1[1] - 6); ctx.fillText("Sun", cx + 8, cy + 14);
    }
  };

  var DEFS = { joukowski: joukowski, stokes: stokes, karman: karman, benard: benard, waves: waves, orbits: orbits };
  var scenes = [];
  document.querySelectorAll("canvas[data-scene]").forEach(function (cv) {
    var def = DEFS[cv.getAttribute("data-scene")]; if (!def) return;
    var sc = new Scene(cv, def); sc.mode = def.modeDefault || null; scenes.push(sc);
    // mode switches in the caption (angle of attack, Stokes / potential)
    sc.band.querySelectorAll("[data-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        sc.mode = b.getAttribute("data-mode");
        sc.band.querySelectorAll("[data-mode]").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        sc.rebuild(true);
      });
    });
  });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var sc = scenes.filter(function (x) { return x.canvas === en.target; })[0]; if (!sc) return;
        sc.visible = en.isIntersecting;
        if (sc.visible) { if (!sc.built) sc.rebuild(true); else sc.play(); } else sc.pause();
      });
    }, { rootMargin: "80px 0px" });
    scenes.forEach(function (sc) { io.observe(sc.canvas); });
  } else scenes.forEach(function (sc) { sc.visible = true; sc.rebuild(false); });

  var rt = 0;
  function rebuildAll() { scenes.forEach(function (sc) { if (sc.built) sc.rebuild(false); }); }
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(rebuildAll, 180); });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", rebuildAll); else if (mq.addListener) mq.addListener(rebuildAll);
  }
  new MutationObserver(rebuildAll).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-lang"] });
  document.addEventListener("visibilitychange", function () {
    scenes.forEach(function (sc) { if (document.hidden) sc.pause(); else sc.play(); });
  });
})();
