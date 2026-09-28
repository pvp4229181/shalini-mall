/* Shalini Mall — product page (product.html?id=…[&variant=…]).
   Originals and prints share this template but render different purchase
   panels: originals are one-of-one; prints resolve a variant from options. */
(function () {
  const SM = window.SM;
  const { $, $$, esc, icon, money } = SM;
  const root = $('#product');
  if (!root) return;

  const p = SM.catalog.get(SM.param('id'));
  if (!p) { renderNotFound(); return; }

  const isOriginal = p.type === 'original';
  const collection = SM.catalog.collection(p.collection);
  const counterpart = SM.catalog.counterpart(p);
  let variant = SM.catalog.variant(p, SM.param('variant')) || SM.catalog.defaultVariant(p);
  const image = p.images[0];

  /* SEO: title, description, canonical, Open Graph, structured data from real product data only. */
  const pageUrl = `https://shalini-mall.vercel.app/${SM.url.product(p.id)}`;
  const description = `${p.title} — ${isOriginal ? `original painting, ${p.dimensionsLabel}` : `fine art print, ${p.options[0].values.join(', ')}`}, by ${p.artist}. ${p.description}`;
  document.title = `${p.title} — ${isOriginal ? 'Original Painting' : 'Fine Art Print'} — Shalini Mall`;
  const meta = (sel, attr, value) => { const el = $(sel); if (el) el.setAttribute(attr, value); };
  meta('meta[name="description"]', 'content', description);
  meta('link[rel="canonical"]', 'href', pageUrl);
  meta('meta[property="og:title"]', 'content', `${p.title} — Shalini Mall`);
  meta('meta[property="og:description"]', 'content', p.description);
  meta('meta[property="og:url"]', 'content', pageUrl);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: `${p.title} (${p.typeLabel})`, description: p.description,
    image: `https://shalini-mall.vercel.app/${image.src}`, brand: { '@type': 'Brand', name: 'Shalini Mall' },
    offers: p.variants.map(v => ({ '@type': 'Offer', price: v.price, priceCurrency: 'USD', availability: `https://schema.org/${v.available ? 'InStock' : 'SoldOut'}`, url: `https://shalini-mall.vercel.app/${SM.url.product(p.id, isOriginal ? null : v.id)}` }))
  });
  document.head.append(ld);

  const crumbs = `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>
    <li><a href="index.html">Home</a></li>
    <li><a href="${isOriginal ? 'originals.html' : 'prints.html'}">${isOriginal ? 'Originals' : 'Prints'}</a></li>
    <li aria-current="page">${esc(p.title)}</li>
  </ol></nav>`;

  /* Gallery: artwork, a closer detail, and the work drawn to scale on a wall. */
  const views = [
    { id: 'art', label: 'Artwork', html: SM.art(image, SM.altText(p), { lazy: false, priority: true }) },
    { id: 'detail', label: 'Detail', html: SM.art(image, `Close detail of ${p.title}`, { cls: 'art--zoom', zoom: 2.2 }) },
    { id: 'wall', label: 'On the wall', html: SM.wall.render(p, variant, { caption: false }) }
  ];
  const gallery = `<div class="gallery">
    <div class="gallery__thumbs" role="tablist" aria-label="Artwork views" aria-orientation="vertical">
      ${views.map((v, i) => `<button type="button" role="tab" class="gallery__thumb" aria-selected="${!i}" aria-controls="view-${v.id}" tabindex="${i ? -1 : 0}" data-view="${v.id}" aria-label="${v.label}">
        <span class="gallery__thumb-img">${v.id === 'wall' ? `<span class="gallery__thumb-wall">${SM.art(image, '')}</span>` : SM.art(image, '', { cls: v.id === 'detail' ? 'art--zoom' : '', zoom: 2.2 })}</span>
      </button>`).join('')}
    </div>
    <div class="gallery__stage">
      ${views.map((v, i) => `<div class="gallery__slide gallery__slide--${v.id}${i ? '' : ' is-active'}" id="view-${v.id}" role="tabpanel" aria-label="${v.label}"${i ? ' hidden' : ''}>${v.html}</div>`).join('')}
      <button type="button" class="icon-btn gallery__zoom" data-lightbox aria-label="View artwork full screen">${icon('search')}</button>
    </div>
  </div>`;

  /* Original ↔ print card (relationship comes from relatedPrintId / relatedOriginalId). */
  const counterpartCard = counterpart ? `<a class="counterpart" href="${SM.url.product(counterpart.id)}">
    ${SM.art(counterpart.images[0], '', { cls: 'counterpart__art' })}
    <span class="counterpart__text">
      <strong>${isOriginal ? 'Available as fine art print' : 'The original painting'}</strong>
      <span>${isOriginal
        ? `Signed stretched-canvas print · ${esc(counterpart.options[0].values.join(' · '))} · ${SM.catalog.priceLabel(counterpart)}`
        : `One of one · ${esc(counterpart.dimensionsLabel)} · ${money(counterpart.price)}`}</span>
      <span class="text-link">${isOriginal ? 'View print options' : 'View original artwork'} ${icon('arrow')}</span>
    </span>
  </a>` : '';

  const spec = (label, value) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : '');
  const collectionLink = collection ? `<a href="${SM.url.collection(collection.id)}">${esc(collection.title)}</a>` : '';
  const specs = isOriginal
    ? spec('Medium', esc(p.medium)) + spec('Dimensions', esc(p.dimensionsLabel)) + spec('Year', esc(p.year)) + spec('Collection', collectionLink) + spec('Edition', 'One of one, signed')
    : spec('Material', esc(p.material)) + spec('Edition', p.edition ? `Edition of ${p.edition}, signed and numbered` : 'Signed and numbered') + spec('Collection', collectionLink);

  const wishRow = `<div class="product-buy__row">
      <button type="button" class="button outline" data-wishlist-toggle="${p.id}" aria-pressed="${SM.wishlist.has(p.id)}">${icon('heart')} <span data-wish-label></span></button>
      <button type="button" class="icon-btn product-share" data-share aria-label="Share this artwork">${icon('share')}</button>
    </div>`;
  const purchase = isOriginal
    ? `<div class="product-buy">
        <button type="button" class="button dark full" data-add${p.available ? '' : ' disabled'}>${p.available ? 'Buy original' : 'Sold'}</button>
        ${wishRow}
      </div>`
    : `<div data-options>${SM.variantUI.render(p, variant, 'pdp')}</div>
      <div class="product-buy">
        <p class="label">Quantity</p>
        ${SM.qty.render('pdpQty')}
        <button type="button" class="button dark full" data-add>Add to cart</button>
        ${wishRow}
      </div>`;

  root.innerHTML = `${gallery}
    <div class="product-info">
      ${crumbs}
      <p class="eyebrow">${isOriginal ? 'Original artwork · One of one' : `Fine art print${p.edition ? ` · Edition of ${p.edition}` : ''}`}</p>
      <h1>${esc(p.title)}</h1>
      <p class="product-artist">${esc(p.artist)}</p>
      <p class="price" data-price aria-live="polite">${money(variant.price)}</p>
      <p class="availability">Availability: <span class="status${p.available ? '' : ' status--sold'}" data-availability>${p.available ? (isOriginal ? 'Available' : 'In stock') : 'Sold'}</span></p>
      ${isOriginal ? `<dl class="specs">${specs}</dl>` : ''}
      ${purchase}
      <button type="button" class="text-link product-size-guide" data-size-guide>${icon('ruler')} View size guide</button>
      ${counterpartCard}
    </div>`;

  /* Details: full-width accordions below the gallery and purchase panel. */
  const dims = isOriginal
    ? `<p>${esc(p.dimensionsLabel)} (${SM.inches(p.dimensions)}).</p>`
    : `<ul class="dims-list">${p.variants.map(v => `<li><strong>${esc(v.title)}</strong> ${v.dimensions.w} × ${v.dimensions.h} cm (${SM.inches(v.dimensions)})</li>`).join('')}</ul>`;
  const section = (title, body, open) => `<details${open ? ' open' : ''}><summary>${title} ${icon('chevron')}</summary><div>${body}</div></details>`;
  $('#productMore').innerHTML = `<div class="accordion">
    ${section('Artwork story', `<p>${esc(p.description)}</p>${collection ? `<p>${esc(collection.story)} <a class="text-link" href="${SM.url.collection(collection.id)}">The ${esc(collection.title)} series</a></p>` : ''}`, true)}
    ${section(isOriginal ? 'Details &amp; materials' : 'Product details', isOriginal
      ? `<p>Original studio artwork, signed by the artist. A certificate of authenticity is included.</p>${p.medium ? `<p>${esc(p.medium)}</p>` : ''}`
      : `<dl class="specs">${specs}</dl><p>Matte canvas stretched over a 0.75 in pinewood frame, signed and numbered by the artist.</p>`)}
    ${section('Dimensions', `${dims}<button type="button" class="text-link" data-size-guide>See it to scale ${icon('arrow')}</button>`)}
    ${section('Shipping', `<p>${isOriginal
      ? 'Originals ship carefully wrapped and insured, with tracking. Shipping is complimentary across India.'
      : 'Canvas prints are corner-protected, securely boxed, and shipped ready to hang.'}</p>`)}
    ${isOriginal ? section('Authenticity', '<p>Every original arrives signed with a studio certificate of authenticity.</p>') : ''}
    ${section('Questions before collecting?', '<p>We are happy to share additional details, close-ups, scale images or installation guidance. <a class="text-link" href="contact.html">Contact the studio</a></p>')}
  </div>`;

  /* Share: native share sheet where available, otherwise copy the link. */
  $('[data-share]', root).addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: `${p.title} — Shalini Mall`, url: location.href });
      else { await navigator.clipboard.writeText(location.href); SM.toast('Link copied'); }
    } catch (err) { if (err?.name !== 'AbortError') SM.toast('Could not share this link'); }
  });

  /* Lightbox */
  const lightbox = $('#lightbox');
  lightbox.querySelector('[data-lightbox-art]').innerHTML = SM.art(image, SM.altText(p), { lazy: false });
  $('[data-lightbox]', root).addEventListener('click', e => SM.dialog.open(lightbox, e.currentTarget));
  $('.gallery__slide--art', root).addEventListener('click', e => SM.dialog.open(lightbox, $('[data-lightbox]', root)));

  /* Gallery tabs (arrow keys move between views) */
  const tabs = $$('.gallery__thumb', root);
  const showView = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('.gallery__slide', root).forEach(s => { const on = s.id === tab.getAttribute('aria-controls'); s.hidden = !on; s.classList.toggle('is-active', on); });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showView(t));
    t.addEventListener('keydown', e => {
      const d = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
      if (d) { e.preventDefault(); showView(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* Wishlist button label */
  const syncWish = () => $$('[data-wish-label]', root).forEach(el => { el.textContent = SM.wishlist.has(p.id) ? 'Saved to wishlist' : 'Add to wishlist'; });
  SM.on('wishlist:change', syncWish);
  syncWish();

  /* Variant changes: price, availability, URL, wall scale, sticky bar. */
  function setVariant(v) {
    variant = v;
    $('[data-price]', root).textContent = money(v.price);
    $('[data-availability]', root).textContent = v.available ? 'In stock' : 'Sold out';
    $('[data-add]', root).disabled = !v.available;
    const qs = new URLSearchParams(location.search);
    qs.set('variant', v.id);
    history.replaceState(null, '', `${location.pathname}?${qs}`);
    SM.wall.update($('#view-wall [data-wall-figure]', root), p, v);
    $$('#interiorScenes [data-wall-figure]').forEach(f => SM.wall.update(f, p, v));
    $$('[data-sticky-variant]').forEach(el => { el.textContent = `${v.title} · ${money(v.price)}`; });
  }
  if (!isOriginal) SM.variantUI.bind($('[data-options]', root), p, setVariant);

  /* Purchase */
  const getQty = isOriginal ? () => 1 : SM.qty.bind($('.qty', root));
  const add = () => SM.addToCart(p.id, variant.id, getQty());
  $('[data-add]', root).addEventListener('click', add);

  const openGuide = e => SM.sizeGuide.open(p, variant, e.currentTarget, v => {
    // Keep the page's size selection in step with the size guide.
    const radio = root.querySelector(`[data-option="Size"][value="${CSS.escape(v.options.Size)}"]`);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  $$('[data-size-guide]').forEach(b => b.addEventListener('click', openGuide));

  /* Sticky add-to-cart on small screens (prints), shown once the main button scrolls away. */
  const sticky = $('#stickyBuy');
  if (!isOriginal && sticky && 'IntersectionObserver' in window) {
    sticky.innerHTML = `<div class="sticky-buy__text"><strong>${esc(p.title)}</strong><span data-sticky-variant>${esc(variant.title)} · ${money(variant.price)}</span></div>
      <button type="button" class="button dark small" data-sticky-add>Add to cart</button>`;
    sticky.querySelector('[data-sticky-add]').addEventListener('click', add);
    new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sticky.classList.toggle('show', show);
      sticky.inert = !show;
    }).observe($('.product-buy', root));
    sticky.inert = true;
  }

  /* Art in interiors: the selected size across three rooms. */
  const scenes = $('#interiorScenes');
  if (scenes) {
    scenes.innerHTML = Object.keys(SM.wall.scenes).map(s => SM.wall.render(p, variant, { scene: s })).join('');
    $('#interiorTitle').textContent = `${p.title} in a room`;
  }

  /* Related works + recently viewed (current artwork and its counterpart excluded). */
  const related = SM.catalog.related(p, isOriginal ? 3 : 4);
  $('#relatedGrid').innerHTML = SM.cards.list(related);
  $('#relatedGrid').classList.toggle('product-grid--4', !isOriginal);
  $('#relatedTitle').textContent = isOriginal ? 'More original works' : 'More fine art prints';
  $('#relatedLink').href = isOriginal ? 'originals.html' : 'prints.html';

  const recent = SM.recent.items([p.id], 4);
  if (recent.length) {
    $('#recentSection').hidden = false;
    $('#recentGrid').innerHTML = SM.cards.list(recent);
  }
  SM.recent.track(p.id);

  function renderNotFound() {
    document.title = 'Artwork not found — Shalini Mall';
    root.classList.add('product--missing');
    root.innerHTML = `<div class="empty-state">
      <p class="eyebrow">Artwork not found</p>
      <h1>This work is no longer here.</h1>
      <p>It may have found a new home, or the link may be incomplete.</p>
      <a class="button dark" href="shop.html">Explore all works</a>
    </div>`;
    ['#interiorSection', '#relatedSection'].forEach(s => { const el = $(s); if (el) el.hidden = true; });
  }
})();
