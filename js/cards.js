/* Shalini Mall — product card system (SM.cards).
   Originals read like catalogue entries; prints carry quick-add controls.
   Delegated handlers in app.js pick up [data-wishlist-toggle], [data-quick-view]
   and [data-quick-add] wherever these cards are rendered. */
(function () {
  const SM = window.SM;
  const { esc, money, icon } = SM;

  SM.altText = p => `${p.title}, ${p.type === 'original' ? 'original painting' : 'fine art print'} by ${p.artist}`;

  const wishButton = p => {
    const saved = SM.wishlist.has(p.id);
    return `<button type="button" class="card__wish" data-wishlist-toggle="${p.id}" aria-pressed="${saved}" aria-label="Save ${esc(p.title)} (${p.typeLabel.toLowerCase()}) to wishlist">${icon('heart')}</button>`;
  };

  // Primary image plus a closer detail crop that fades in on hover.
  const media = (p, lazy) => {
    const img = p.images[0];
    const loading = lazy ? ' loading="lazy"' : '';
    return `<a class="card__image art" href="${SM.url.product(p.id)}" tabindex="-1" aria-hidden="true" style="--crop:${img.crop}">
      <img src="${img.src}" alt="${esc(SM.altText(p))}"${loading} decoding="async">
      <img class="card__alt" src="${img.src}" alt=""${loading} decoding="async">
    </a>`;
  };

  function original(p, opts = {}) {
    const url = SM.url.product(p.id);
    const specs = [p.medium, p.dimensionsLabel, p.year].filter(Boolean).join(' · ');
    const H = opts.headingLevel || 'h3';
    return `<article class="card card--original" data-product="${p.id}">
      <div class="card__media">
        ${media(p, opts.lazy !== false)}
        <span class="badge card__badge">${p.available ? 'Original' : 'Sold'}</span>
        ${wishButton(p)}
        <button type="button" class="button small card__quick" data-quick-view="${p.id}" aria-label="Quick view ${esc(p.title)}, original">Quick view</button>
      </div>
      <div class="card__body">
        ${opts.index ? `<p class="card__index">Nº ${String(opts.index).padStart(2, '0')}</p>` : ''}
        <${H} class="card__title"><a href="${url}">${esc(p.title)}</a></${H}>
        ${specs ? `<p class="card__meta">${esc(specs)}</p>` : ''}
        <p class="card__price">${money(p.price)}</p>
        ${opts.wishlist ? `<div class="card__actions">${wishlistActions(p)}</div>` : ''}
      </div>
    </article>`;
  }

  function print(p, opts = {}) {
    const url = SM.url.product(p.id);
    const sizes = p.options.find(o => o.name === 'Size')?.values || [];
    const H = opts.headingLevel || 'h3';
    const quickAdd = `data-quick-add="${p.id}" aria-label="Quick add ${esc(p.title)}, fine art print"`;
    return `<article class="card card--print" data-product="${p.id}">
      <div class="card__media">
        ${media(p, opts.lazy !== false)}
        <span class="badge card__badge">Print</span>
        ${wishButton(p)}
        <button type="button" class="button small card__quick" ${quickAdd}>Quick add</button>
      </div>
      <div class="card__body">
        <${H} class="card__title"><a href="${url}">${esc(p.title)}</a></${H}>
        ${sizes.length ? `<p class="card__meta">${esc(sizes.join(' · '))}${p.edition ? ` · Edition of ${p.edition}` : ''}</p>` : ''}
        <p class="card__price">${SM.catalog.priceLabel(p)}</p>
        ${opts.wishlist ? `<div class="card__actions">${wishlistActions(p)}</div>` : `<button type="button" class="text-link card__touch-add" ${quickAdd}>Quick add</button>`}
      </div>
    </article>`;
  }

  const wishlistActions = p => `<button type="button" class="button small dark" data-move-to-cart="${p.id}">Move to cart</button>
    <button type="button" class="text-link" data-wishlist-remove="${p.id}">Remove</button>`;

  SM.cards = {
    original,
    print,
    render: (p, opts) => (p.type === 'original' ? original(p, opts) : print(p, opts)),
    list: (products, opts = {}) => products.map((p, i) => SM.cards.render(p, { ...opts, index: opts.numbered ? i + 1 : 0 })).join('')
  };
})();
