/* Hero background: potential flow past a Joukowski airfoil.
   Streamlines are integrated in the circle plane (zeta) and mapped to the
   airfoil plane with z = zeta + 1/zeta. Circulation comes from the Kutta
   condition (zero velocity at the trailing edge). */
(function () {
  "use strict";
  var canvas = document.getElementById("flow");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- complex arithmetic ---------- */
  function C(re, im) { return { re: re, im: im }; }
  function add(a, b) { return C(a.re + b.re, a.im + b.im); }
  function sub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function mul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function div(a, b) { var d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); }
  function cabs(a) { return Math.hypot(a.re, a.im); }
  function expi(t) { return C(Math.cos(t), Math.sin(t)); }
  function csqrt(a) {
    var r = cabs(a);
    var re = Math.sqrt(Math.max(0, (r + a.re) / 2));
    var im = Math.sqrt(Math.max(0, (r - a.re) / 2));
    if (a.im < 0) im = -im;
    return C(re, im);
  }

  /* ---------- flow model ---------- */
  var MU = C(-0.09, 0.07);            // circle centre (sets thickness and camber)
  var R = cabs(sub(C(1, 0), MU));     // circle passes through zeta = 1 -> sharp trailing edge
  var alpha = 6 * Math.PI / 180;      // angle of attack
  var gamma = 0;                      // circulation

  function velZeta(z) {               // complex velocity dw/dzeta (u - i v)
    var zp = sub(z, MU);
    var t1 = expi(-alpha);
    var t2 = div(mul(C(R * R, 0), expi(alpha)), mul(zp, zp));
    var t3 = div(C(0, gamma / (2 * Math.PI)), zp);
    return add(sub(t1, t2), t3);
  }
  function solveKutta() {
    gamma = 0;
    var te = C(1, 0);
    var A = velZeta(te);
    var B = div(C(0, 1 / (2 * Math.PI)), sub(te, MU));
    gamma = div(C(-A.re, -A.im), B).re;
  }
  function joukowski(z) { return add(z, div(C(1, 0), z)); }
  function inverseJoukowski(w) {
    var s = csqrt(sub(mul(w, w), C(4, 0)));
    var z1 = C((w.re + s.re) / 2, (w.im + s.im) / 2);
    var z2 = C((w.re - s.re) / 2, (w.im - s.im) / 2);
    return cabs(sub(z1, MU)) >= cabs(sub(z2, MU)) ? z1 : z2;
  }

  /* ---------- view ---------- */
  var W = 0, H = 0, dpr = 1, scale = 1, cx = 0, cy = 0;
  var lines = [], airfoil = [], colors = {}, staticLayer = null;
  var start = 0, raf = 0, running = false, visible = true;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.line = cs.getPropertyValue("--flow-line").trim() || "#e6e0e1";
    colors.edge = cs.getPropertyValue("--ink-3").trim() || "#8a8083";
    colors.fill = cs.getPropertyValue("--bg").trim() || "#ffffff";
    colors.accent = cs.getPropertyValue("--red").trim() || "#d1001c";
  }
  function toScreen(z) { return [cx + z.re * scale, cy - z.im * scale]; }
  function toWorld(x, y) { return C((x - cx) / scale, -(y - cy) / scale); }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var wide = W > 860;
    scale = wide ? Math.min(W * 0.11, H * 0.2) : Math.min(W * 0.2, H * 0.16);
    cx = wide ? W * 0.7 : W * 0.55;
    cy = wide ? H * 0.5 : H * 0.8;
  }

  function buildLines() {
    lines = [];
    var left = toWorld(-20, 0).re, right = toWorld(W + 40, 0).re;
    var top = toWorld(0, -40).im, bottom = toWorld(0, H + 40).im;
    var spacing = Math.max(15, Math.min(24, H / 26)) / scale; // world units between seeds
    for (var y = bottom; y <= top; y += spacing) {
      var zeta = inverseJoukowski(C(left, y + 1e-4));
      var pts = [], times = [0], h = 0.02, guard = 0, prev = null, t = 0;
      while (guard++ < 6000) {
        var zz = joukowski(zeta);
        var s = toScreen(zz);
        if (prev) {
          var ds = Math.hypot(zz.re - prev.re, zz.im - prev.im);
          var dz = sub(C(1, 0), div(C(1, 0), mul(zeta, zeta)));
          var speed = cabs(velZeta(zeta)) / Math.max(cabs(dz), 1e-3);
          t += ds / Math.max(speed, 0.05);
          times.push(t);
        }
        pts.push(s[0], s[1]);
        prev = zz;
        if (zz.re > right) break;
        // RK2 step along the unit tangent in the zeta plane
        var v1 = velZeta(zeta), n1 = cabs(v1) || 1;
        var k1 = C(v1.re / n1, -v1.im / n1);
        var mid = C(zeta.re + k1.re * h / 2, zeta.im + k1.im * h / 2);
        var v2 = velZeta(mid), n2 = cabs(v2) || 1;
        var k2 = C(v2.re / n2, -v2.im / n2);
        zeta = C(zeta.re + k2.re * h, zeta.im + k2.im * h);
        if (cabs(sub(zeta, MU)) < R * 1.002) break; // hit the body: stop
      }
      if (pts.length > 8) lines.push({ p: pts, t: times, phase: Math.random(), n: pts.length / 2 });
    }
    airfoil = [];
    for (var k = 0; k <= 240; k++) {
      var th = (k / 240) * 2 * Math.PI;
      var zc = add(MU, C(R * Math.cos(th), R * Math.sin(th)));
      var a = toScreen(joukowski(zc));
      airfoil.push(a[0], a[1]);
    }
  }

  function strokeLine(c, L, frac) {
    var n = Math.max(2, Math.floor(L.n * frac));
    c.beginPath();
    c.moveTo(L.p[0], L.p[1]);
    for (var i = 1; i < n; i++) c.lineTo(L.p[2 * i], L.p[2 * i + 1]);
    c.stroke();
  }
  function drawAirfoil(c) {
    c.beginPath();
    c.moveTo(airfoil[0], airfoil[1]);
    for (var i = 2; i < airfoil.length; i += 2) c.lineTo(airfoil[i], airfoil[i + 1]);
    c.closePath();
    c.fillStyle = colors.fill; c.fill();
    c.lineWidth = 1.2; c.strokeStyle = colors.edge; c.stroke();
  }
  function renderStatic(frac) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = colors.line;
    for (var i = 0; i < lines.length; i++) {
      var stagger = Math.min(1, Math.max(0, frac * 1.25 - (i / lines.length) * 0.25));
      strokeLine(ctx, lines[i], easeOut(stagger));
    }
    drawAirfoil(ctx);
  }
  function cacheStatic() {
    staticLayer = document.createElement("canvas");
    staticLayer.width = canvas.width; staticLayer.height = canvas.height;
    var c = staticLayer.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.lineWidth = 1; c.strokeStyle = colors.line;
    for (var i = 0; i < lines.length; i++) strokeLine(c, lines[i], 1);
    drawAirfoil(c);
  }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

  function indexAt(times, tau) {
    var lo = 0, hi = times.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (times[m] < tau) lo = m + 1; else hi = m; }
    return lo;
  }
  var zone = null; // the text block: no red particles over it
  function readZone() {
    var copy = document.querySelector(".hero-copy");
    if (!copy) { zone = null; return; }
    var a = canvas.getBoundingClientRect(), b = copy.getBoundingClientRect();
    zone = { x0: b.left - a.left - 24, x1: b.right - a.left + 24, y0: b.top - a.top - 24, y1: b.bottom - a.top + 24 };
  }
  function inZone(x, y) { return zone && x > zone.x0 && x < zone.x1 && y > zone.y0 && y < zone.y1; }
  function drawParticles(time) {
    ctx.lineCap = "round";
    ctx.strokeStyle = colors.accent; ctx.fillStyle = colors.accent;
    for (var i = 0; i < lines.length; i += 2) {
      var L = lines[i], T = L.t[L.t.length - 1];
      if (T <= 0) continue;
      var tau = (time * 1.1 + L.phase * T) % T;
      var i1 = indexAt(L.t, tau), i0 = indexAt(L.t, Math.max(0, tau - 0.45));
      if (i1 - i0 < 1) continue;
      if (inZone(L.p[2 * i1], L.p[2 * i1 + 1]) || inZone(L.p[2 * i0], L.p[2 * i0 + 1])) continue;
      ctx.globalAlpha = 0.75; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(L.p[2 * i0], L.p[2 * i0 + 1]);
      for (var k = i0 + 1; k <= i1; k++) ctx.lineTo(L.p[2 * k], L.p[2 * k + 1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(L.p[2 * i1], L.p[2 * i1 + 1], 1.7, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var INTRO = 1600;
  function frame(now) {
    if (!running) return;
    var el = now - start;
    if (el < INTRO) {
      renderStatic(el / INTRO);
    } else {
      if (!staticLayer) cacheStatic();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawParticles((el - INTRO) / 1000);
    }
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (running || reduceMotion || !visible || document.hidden) return;
    running = true; raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; cancelAnimationFrame(raf); }

  function rebuild(withIntro) {
    pause();
    readColors(); layout(); readZone(); solveKutta(); buildLines();
    staticLayer = null;
    if (reduceMotion) { renderStatic(1); return; }
    start = performance.now() - (withIntro ? 0 : INTRO);
    renderStatic(withIntro ? 0 : 1);
    play();
  }

  /* angle-of-attack control in the caption */
  var buttons = document.querySelectorAll("[data-alpha]");
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener("click", function () {
      alpha = parseFloat(b.getAttribute("data-alpha")) * Math.PI / 180;
      Array.prototype.forEach.call(buttons, function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      var out = document.getElementById("gamma-out");
      rebuild(true);
      if (out) out.textContent = gamma.toFixed(2);
    });
  });

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { rebuild(false); }, 150);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () { rebuild(false); };
    if (mq.addEventListener) mq.addEventListener("change", onScheme); else if (mq.addListener) mq.addListener(onScheme);
  }
  new MutationObserver(function () { rebuild(false); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); else play(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) play(); else pause();
    }).observe(canvas);
  }
  window.addEventListener("portfolio:view", function (e) {
    if (e.detail === "welcome") rebuild(false); else pause();
  });

  rebuild(true);
  var g = document.getElementById("gamma-out");
  if (g) g.textContent = gamma.toFixed(2);
})();
