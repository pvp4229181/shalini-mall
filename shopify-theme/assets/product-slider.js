/* Shared carousel; native scrolling also supports touch and trackpads. */
class ProductSlider extends HTMLElement {
  connectedCallback() {
    const track = this.querySelector('.product-slider__track');
    if (!track || this.controls) return;
    const cards = [...track.children].filter(card => !card.classList.contains('compare-divider'));
    const mobile = matchMedia('(max-width: 768px)');
    const desktopPerView = Number(this.dataset.perView) || 2;
    const perView = () => mobile.matches ? Math.min(desktopPerView, 2) : desktopPerView;
    const enabled = () => mobile.matches || desktopPerView === 4;
    const itemLabel = desktopPerView === 1 ? 'slide' : 'artworks';
    if (cards.length <= Math.min(desktopPerView, 2)) return;

    this.events = new AbortController();
    const options = { signal: this.events.signal };
    const controls = this.controls = document.createElement('div');
    controls.className = 'product-slider__controls';
    controls.innerHTML = `<button type="button" class="icon-btn" aria-label="Previous ${itemLabel}" aria-controls="${track.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
      <span class="product-slider__status" aria-live="polite" aria-atomic="true"></span>
      <button type="button" class="icon-btn" aria-label="Next ${itemLabel}" aria-controls="${track.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`;
    this.append(controls);
    const [prev, next] = controls.querySelectorAll('button');
    const status = controls.querySelector('span');
    const update = () => {
      track.tabIndex = enabled() ? 0 : -1;
      if (!enabled()) {
        track.removeAttribute('aria-roledescription');
        track.scrollLeft = 0;
        return;
      }
      track.setAttribute('aria-roledescription', 'carousel');
      const gap = parseFloat(getComputedStyle(track).columnGap);
      const first = Math.round(track.scrollLeft / (cards[0].getBoundingClientRect().width + gap)) + 1;
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
      status.textContent = perView() === 1 ? `${first} / ${cards.length}` : `${first}\u2013${Math.min(first + perView() - 1, cards.length)} / ${cards.length}`;
    };
    const move = direction => track.scrollBy({
      left: direction * (track.clientWidth + parseFloat(getComputedStyle(track).columnGap)),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
    prev.addEventListener('click', () => move(-1), options);
    next.addEventListener('click', () => move(1), options);
    track.addEventListener('scroll', update, { ...options, passive: true });
    track.addEventListener('keydown', event => {
      if (!enabled() || event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }, options);
    mobile.addEventListener('change', update, options);
    this.resizeObserver = new ResizeObserver(update);
    this.resizeObserver.observe(track);
    update();
  }

  disconnectedCallback() {
    this.events?.abort();
    this.resizeObserver?.disconnect();
    this.controls?.remove();
    this.controls = null;
  }
}

customElements.define('product-slider', ProductSlider);
