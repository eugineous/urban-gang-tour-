// ============================================================
// URBAN GANG TOUR — Shared UI Scripts
// Nav scroll, mobile menu, scroll reveal, progress bar, counters
// ============================================================

(function () {
  // ── Scroll progress bar ──────────────────────────────────
  const bar = document.getElementById('progress-bar');
  function updateProgress() {
    if (!bar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
  }

  // ── Nav scroll state ─────────────────────────────────────
  const nav = document.querySelector('.nav');
  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }

  window.addEventListener('scroll', () => {
    updateProgress();
    updateNav();
    revealOnScroll();
    animateCounters();
  }, { passive: true });

  updateNav();

  // ── Mobile nav ───────────────────────────────────────────
  const hamburger = document.querySelector('.nav-hamburger');
  const overlay   = document.querySelector('.nav-overlay');
  const closeBtn  = document.querySelector('.nav-overlay-close');

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => overlay.classList.add('open'));
  }
  if (closeBtn && overlay) {
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  }
  if (overlay) {
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => overlay.classList.remove('open'));
    });
  }

  // ── Scroll reveal ────────────────────────────────────────
  function revealOnScroll() {
    document.querySelectorAll('.reveal:not(.revealed)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 80) {
        el.classList.add('revealed');
      }
    });
  }
  revealOnScroll(); // run once on load

  // ── Animated counters ────────────────────────────────────
  let countersRun = false;
  function animateCounters() {
    if (countersRun) return;
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const first = counters[0];
    const rect = first.getBoundingClientRect();
    if (rect.top > window.innerHeight) return;

    countersRun = true;
    counters.forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1800;
      const start = performance.now();
      const isDecimal = target % 1 !== 0;

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ── Active nav link ──────────────────────────────────────
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a, .nav-overlay a').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    const norm = href.replace(/\/$/, '') || '/';
    if (norm === currentPath || (norm !== '/' && currentPath.startsWith(norm))) {
      a.classList.add('active');
    }
  });

  // ── Sticky book bar ──────────────────────────────────────
  const stickyBar = document.querySelector('.sticky-bar');
  if (stickyBar) {
    window.addEventListener('scroll', () => {
      stickyBar.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
  }

  // ── Countdown timer ──────────────────────────────────────
  const countdowns = document.querySelectorAll('[data-countdown]');
  countdowns.forEach(el => {
    const target = new Date(el.dataset.countdown).getTime();
    function update() {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { el.textContent = 'NOW'; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.innerHTML =
        `<span>${d}<small>d</small></span>` +
        `<span>${String(h).padStart(2,'0')}<small>h</small></span>` +
        `<span>${String(m).padStart(2,'0')}<small>m</small></span>` +
        `<span>${String(s).padStart(2,'0')}<small>s</small></span>`;
    }
    update();
    setInterval(update, 1000);
  });

})();
