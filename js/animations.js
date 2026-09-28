/* Shalini Mall — scroll reveals and the hero slideshow. Loaded last so it can
   observe content the page scripts have rendered. */
(function () {
  const SM = window.SM;
  const reduced = SM.reducedMotion();
  const SELECTOR = '[data-reveal],[data-reveal-stagger],[data-reveal-image]';

  const io = reduced || !('IntersectionObserver' in window) ? null : new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

  SM.reveal = (root = document) => {
    SM.$$(SELECTOR, root).forEach(el => (io ? io.observe(el) : el.classList.add('is-visible')));
  };
  SM.reveal();
  initHero();

  /* Hero slideshow + parallax, modelled on the Shopify Impulse theme hero.
     Auto-advances every data-speed ms; pauses on hover, focus, or the pause button. */
  function initHero() {
    const hero = SM.$('[data-slideshow]');
    if (!hero) return;
    const slides = [...hero.querySelectorAll('.hero-slide')];
    const outTimers = [];
    const speed = +hero.dataset.speed || 7000;
    let cur = 0, timer = null, hover = false, focus = false, userPaused = reduced;

    const controls = document.createElement('div');
    controls.className = 'hero-controls';
    controls.innerHTML = slides.map((s, i) => `<button type="button" class="hero-dot" aria-label="Show slide ${i + 1} of ${slides.length}" aria-current="${i === 0}"></button>`).join('') +
      (slides.length > 1 ? `<button type="button" class="icon-btn hero-pause" aria-label="${userPaused ? 'Play slideshow' : 'Pause slideshow'}">${SM.icon(userPaused ? 'play' : 'pause')}</button>` : '');
    if (slides.length > 1) {
      hero.append(controls);
      [['prev', -1, 'Previous slide'], ['next', 1, 'Next slide']].forEach(([dir, step, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `icon-btn hero-arrow hero-arrow--${dir}`;
        b.setAttribute('aria-label', label);
        b.innerHTML = SM.icon(dir);
        b.addEventListener('click', () => { go((cur + step + slides.length) % slides.length); schedule(); });
        hero.append(b);
      });
    }
    const dots = [...controls.querySelectorAll('.hero-dot')];
    const pauseBtn = controls.querySelector('.hero-pause');

    function go(i) {
      if (i === cur) return;
      const prev = slides[cur], next = slides[i];
      prev.classList.remove('is-selected');
      prev.classList.add('animate-out');
      prev.setAttribute('aria-hidden', 'true');
      prev.inert = true;
      clearTimeout(outTimers[cur]);
      outTimers[cur] = setTimeout(() => prev.classList.remove('animate-out'), 600);
      clearTimeout(outTimers[i]);
      next.classList.remove('animate-out');
      next.classList.add('is-selected');
      next.removeAttribute('aria-hidden');
      next.inert = false;
      dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
      cur = i;
    }
    slides.forEach((s, i) => { if (i) { s.setAttribute('aria-hidden', 'true'); s.inert = true; } });

    const running = () => !userPaused && !hover && !focus && slides.length > 1;
    function schedule() {
      clearTimeout(timer);
      if (running()) timer = setTimeout(() => { go((cur + 1) % slides.length); schedule(); }, speed);
    }
    dots.forEach((d, i) => d.addEventListener('click', () => { go(i); schedule(); }));
    pauseBtn?.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
      pauseBtn.innerHTML = SM.icon(userPaused ? 'play' : 'pause');
      schedule();
    });
    hero.addEventListener('mouseenter', () => { hover = true; schedule(); });
    hero.addEventListener('mouseleave', () => { hover = false; schedule(); });
    hero.addEventListener('focusin', () => { focus = true; schedule(); });
    hero.addEventListener('focusout', e => { if (!hero.contains(e.relatedTarget)) { focus = false; schedule(); } });
    schedule();

    if (reduced) return;
    // Parallax: the image drifts up by 15% of the hero's height as it scrolls through the viewport.
    const layers = hero.querySelectorAll('[data-parallax]');
    let ticking = false;
    function parallax() {
      ticking = false;
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const progress = Math.min(Math.max(-r.top / r.height, 0), 1);
      const y = progress * r.height * .15;
      layers.forEach(el => { el.style.transform = `translate3d(0,${-y}px,0)`; });
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } }, { passive: true });
    addEventListener('resize', parallax);
    parallax();
  }
})();
