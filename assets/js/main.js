/* =========================================================
   CONFIG — the only part you need to edit to update links.
   Leave a value empty ("") and the matching button is disabled.
   ========================================================= */
var CONFIG = {
  // YouTube ID of the unlisted pitch video (the part after watch?v=)
  youtubeId: "",
  // CV files in assets/docs/
  cvEN: "assets/docs/CV_Lucas_Da_Dalt_EN.pdf",
  cvFR: "assets/docs/CV_Lucas_Da_Dalt_FR.pdf",
  // LinkedIn: the same profile shown in each language
  linkedinEN: "https://www.linkedin.com/in/lucas-da-dalt-3b6b20447/?locale=en_US",
  linkedinFR: "https://www.linkedin.com/in/lucas-da-dalt-3b6b20447/?locale=fr_FR",
  // Contact e-mail shown in the footer (leave empty to hide it)
  email: "lucasddlt689@gmail.com"
};

(function () {
  "use strict";
  var root = document.documentElement;
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* ---------- links from CONFIG (FR links used when the page is in French) ---------- */
  function applyLinks() {
    var fr = root.getAttribute("data-lang") === "fr";
    document.querySelectorAll("[data-link]").forEach(function (a) {
      var key = fr && a.hasAttribute("data-link-fr") ? a.getAttribute("data-link-fr") : a.getAttribute("data-link");
      var url = CONFIG[key];
      if (url) {
        a.setAttribute("href", url); a.removeAttribute("aria-disabled");
        a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
      } else { a.setAttribute("aria-disabled", "true"); a.removeAttribute("href"); }
    });
  }
  if (CONFIG.email) document.querySelectorAll("[data-email]").forEach(function (el) {
    el.textContent = CONFIG.email; el.closest("[data-email-row]").hidden = false;
  });

  /* ---------- language ---------- */
  function setLang(lang) {
    root.setAttribute("data-lang", lang); root.setAttribute("lang", lang);
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
    });
    store("lang", lang); applyLinks();
  }
  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-set-lang")); });
  });
  setLang(root.getAttribute("data-lang") === "fr" ? "fr" : "en");

  /* ---------- light / dark ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function isDark() { var t = root.getAttribute("data-theme"); return t ? t === "dark" : !!(mq && mq.matches); }
  document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next); store("theme", next);
    });
  });

  /* ---------- pitch video: nothing loads from YouTube before the click ---------- */
  document.querySelectorAll("[data-video]").forEach(function (box) {
    var ready = box.querySelector("[data-video-ready]"), pending = box.querySelector("[data-video-pending]");
    if (!CONFIG.youtubeId) { ready.hidden = true; pending.hidden = false; return; }
    ready.hidden = false; pending.hidden = true;
    var link = box.parentNode.querySelector("[data-video-link]");
    if (link) { link.href = "https://www.youtube.com/watch?v=" + CONFIG.youtubeId; link.hidden = false; }
    ready.querySelector("button").addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(CONFIG.youtubeId) + "?autoplay=1&rel=0";
      f.title = "Video pitch, Lucas Da Dalt";
      f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true;
      box.appendChild(f);
    });
  });

  /* ---------- project sub-tabs ---------- */
  document.querySelectorAll("[data-seg]").forEach(function (group) {
    var buttons = group.querySelectorAll("[role=tab]");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) {
          var on = b === btn; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
          var p = document.getElementById(b.getAttribute("aria-controls")); if (p) p.hidden = !on;
        });
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        var list = Array.prototype.slice.call(buttons), i = list.indexOf(btn);
        var next = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length];
        next.focus(); next.click();
      });
    });
  });

  /* ---------- reveal on scroll (elements start visible, just lighter) ---------- */
  if ("IntersectionObserver" in window && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.remove("pre"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    var vh = window.innerHeight;
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.9) { el.classList.add("pre"); io.observe(el); }
    });
  }

  /* ---------- current section in the bar + reading progress ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main > .section"));
  var tabs = document.querySelectorAll(".tab"), strip = document.querySelector(".tabs");
  var bar = document.querySelector(".progress span"), current = "", ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")";
    var line = window.innerHeight * 0.35, id = sections.length ? sections[0].id : "";
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) id = s.id; });
    if (y + window.innerHeight >= document.documentElement.scrollHeight - 4 && sections.length) id = sections[sections.length - 1].id;
    if (id === current) return;
    current = id;
    tabs.forEach(function (t) {
      if (t.getAttribute("href") === "#" + id) {
        t.setAttribute("aria-current", "true");
        if (strip && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.clientWidth) / 2, behavior: "smooth" });
      } else t.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  var yr = document.getElementById("year"); if (yr) yr.textContent = String(new Date().getFullYear());
})();
