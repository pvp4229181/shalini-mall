/* Shalini Mall — homepage sections rendered from the catalogue. */
(function () {
  const SM = window.SM;
  const { $, esc, money } = SM;
  const originals = SM.catalog.originals();
  const prints = SM.catalog.prints();
  const minPrice = list => Math.min(...list.map(p => p.price));

  // Shop by art type: live counts and starting prices.
  const set = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };
  set('[data-count-originals]', `${originals.length} paintings · from ${money(minPrice(originals))}`);
  set('[data-count-prints]', `${prints.length} prints · from ${money(minPrice(prints))}`);
  set('[data-count-collections]', SM.catalog.collections().map(c => c.title).join(' · '));
  set('[data-price-originals]', `From ${money(minPrice(originals))}`);
  set('[data-price-prints]', `From ${money(minPrice(prints))}`);

  const grid = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
  grid('#featuredOriginals', SM.cards.list(originals.slice(0, 4)));
  grid('#featuredPrints', SM.cards.list(prints.slice(0, 4)));

  // Collection exhibition: a strip of works from Earth Song, one per artwork title.
  const collection = SM.catalog.collection('earth-song');
  if (collection) {
    const works = SM.catalog.inCollection(collection.id);
    const seen = new Set();
    const strip = works.filter(p => p.type === 'original' && !seen.has(p.title) && seen.add(p.title)).slice(0, 4);
    grid('#exhibitionWorks', strip.map(p => `<a href="${SM.url.product(p.id)}" aria-label="${esc(p.title)}, original">${SM.art(p.images[0], '')}</a>`).join(''));
    set('[data-exhibition-meta]', `${works.length} works · ${works.filter(p => p.type === 'original').length} originals · ${works.filter(p => p.type === 'print').length} prints`);
  }

  // Art in interiors: true-scale drawings of three works at different sizes.
  const vignettes = [
    { id: 'earth-song', scene: 'sofa' },
    { id: 'monsoon-memory-print', size: '24 × 30 in', scene: 'console' },
    { id: 'small-hours', size: '16 × 20 in', scene: 'chair' }
  ];
  grid('#interiors', vignettes.map(({ id, size, scene }) => {
    const p = SM.catalog.get(id);
    if (!p) return '';
    const v = size ? p.variants.find(x => x.options.Size === size) : SM.catalog.defaultVariant(p);
    return `<a href="${SM.url.product(p.id, p.type === 'print' ? v.id : null)}" aria-label="${esc(p.title)}, ${esc(p.typeLabel.toLowerCase())}${size ? ` in ${size}` : ''}">${SM.wall.render(p, v, { scene })}</a>`;
  }).join(''));
})();
