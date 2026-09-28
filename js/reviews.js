/* Shalini Mall — collector testimonials.

   Only reviews marked `verified: true` are published. The six entries below are
   the original site's SAMPLE placeholders, kept for layout testing; they are not
   shown to visitors. Replace them with genuine collector reviews (with their
   permission) and set `verified: true` to make the section appear.
   `product` must match a product id in js/products.js. */
window.REVIEWS = [
  { verified: false, name: 'Ananya R.', place: 'Bengaluru', rating: 5, product: 'quiet-orbit', text: 'The work changes with the light. It feels both grounding and alive, like the room finally found its centre.' },
  { verified: false, name: 'Rohan & Meera K.', place: 'Mumbai', rating: 5, product: 'monsoon-memory', text: 'The blues are even deeper in person. It arrived beautifully packed with a signed certificate, and our living room finally feels finished.' },
  { verified: false, name: 'Sofia L.', place: 'London', rating: 5, product: 'between-seasons', text: 'I have bought prints from many artists, and the paper and colour here are on another level. I framed it the day it arrived.' },
  { verified: false, name: 'Kabir S.', place: 'New Delhi', rating: 5, product: 'earth-song', text: 'I stood in front of this painting for a long time before deciding. Living with it is even better; there is something new in it every morning.' },
  { verified: false, name: 'Neha P.', place: 'Pune', rating: 5, product: 'wild-grace', text: 'A small print with so much presence. It came quickly, perfectly protected, and looks lovely above my reading chair.' },
  { verified: false, name: 'Arjun T.', place: 'Chennai', rating: 5, product: 'small-hours', text: 'I bought it as a gift for my mother and she has not stopped talking about it. Beautifully printed and signed.' }
];

/* Centred carousel: the middle card is full size, its neighbours scaled down. */
(function () {
  const SM = window.SM;
  const section = SM.$('[data-testimonials]');
  if (!section) return;
  const reviews = window.REVIEWS.filter(r => r.verified);
  if (!reviews.length) { section.hidden = true; return; }
  section.hidden = false;

  const track = SM.$('#reviewTrack'), dots = SM.$('#reviewDots');
  const reduced = SM.reducedMotion();
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  track.innerHTML = reviews.map((r, i) => {
    const p = SM.catalog.get(r.product);
    return `<figure class="review-card" aria-roledescription="slide" aria-label="${i + 1} of ${reviews.length}">
      <div class="review-body">
        <span class="review-stars" role="img" aria-label="${r.rating} out of 5 stars">${stars(r.rating)}</span>
        <blockquote>${SM.esc(r.text)}</blockquote>
        ${p ? `<a class="review-thumb" href="${SM.url.product(p.id)}" tabindex="-1" aria-hidden="true">${SM.art(p.images[0], '', { cls: 'review-thumb-art' })}</a>` : ''}
        <figcaption><cite>${SM.esc(r.name)}</cite><span>${SM.esc(r.place)}</span>${p ? `<a class="review-piece" href="${SM.url.product(p.id)}">Collected: ${SM.esc(p.title)}</a>` : ''}</figcaption>
      </div>
    </figure>`;
  }).join('');
  dots.innerHTML = reviews.map((r, i) => `<button type="button" class="review-dot" aria-label="Show review ${i + 1}"></button>`).join('');

  const cards = [...track.children], dotEls = [...dots.children];
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
  track.addEventListener('touchstart', () => setHold(true), { passive: true });
  track.addEventListener('touchend', () => setTimeout(() => setHold(false), 4000), { passive: true });
  schedule();
})();
