/* Shalini Mall theme — scroll reveals, hero slideshow and the testimonials carousel.
   Re-initialises sections re-rendered in the Shopify theme editor. */
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
  initReviews();

  document.addEventListener('shopify:section:load', e => {
    SM.reveal(e.target);
    SM.$$('[data-reveal],[data-reveal-stagger],[data-reveal-image]', e.target).forEach(el => el.classList.add('is-visible'));
    initHero(e.target);
    initReviews(e.target);
  });

  /* Hero slideshow + parallax, modelled on the Shopify Impulse theme hero.
     Auto-advances every data-speed ms; pauses on hover, focus, or the pause button. */
  function initHero(root = document) {
    const hero = SM.$('[data-slideshow]', root);
    if (!hero || hero.dataset.ready) return;
    hero.dataset.ready = 'true';
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

  /* Collector testimonials: centred carousel; the middle card is full size. */
  function initReviews(root = document) {
    const section = SM.$('[data-testimonials]', root);
    if (!section || section.dataset.ready) return;
    section.dataset.ready = 'true';
    const track = SM.$('.review-track', section), dots = SM.$('.review-dots', section);
    const cards = [...track.children];
    if (!cards.length) return;
    dots.innerHTML = cards.map((c, i) => `<button type="button" class="review-dot" aria-label="Show review ${i + 1}"></button>`).join('');
    const dotEls = [...dots.children];
    let cur = -1, timer = null, hold = false;
    const centre = i => track.scrollTo({ left: cards[i].offsetLeft - (track.clientWidth - cards[i].offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
    function select() {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      if (best === cur) return;
      cur = best;
      cards.forEach((c, i) => c.classList.toggle('is-selected', i === cur));
      dotEls.forEach((d, i) => d.toggleAttribute('aria-current', i === cur));
    }
    let ticking = false;
    track.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; select(); }); } }, { passive: true });
    dotEls.forEach((d, i) => d.addEventListener('click', () => { centre(i); schedule(); }));
    cards.forEach((c, i) => c.addEventListener('click', e => { if (i !== cur && !e.target.closest('a')) { centre(i); schedule(); } }));
    track.scrollLeft = 0; select();
    if (cards.length > 2) { track.scrollLeft = cards[1].offsetLeft - (track.clientWidth - cards[1].offsetWidth) / 2; select(); }
    addEventListener('resize', () => centre(cur));
    function schedule() { clearTimeout(timer); if (!reduced && !hold) timer = setTimeout(() => { centre((cur + 1) % cards.length); schedule(); }, 6000); }
    const setHold = v => { hold = v; v ? clearTimeout(timer) : schedule(); };
    section.addEventListener('mouseenter', () => setHold(true));
    section.addEventListener('mouseleave', () => setHold(section.contains(document.activeElement)));
    section.addEventListener('focusin', () => setHold(true));
    section.addEventListener('focusout', e => setHold(section.contains(e.relatedTarget)));
    schedule();
  }
})();
