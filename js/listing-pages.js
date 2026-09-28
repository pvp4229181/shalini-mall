/* Shalini Mall — listing page setup: shop, originals, prints, collections. */
(function () {
  const SM = window.SM;
  const { $, esc, icon, money } = SM;
  const mount = $('[data-listing]');
  const range = list => {
    const prices = list.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  };
  const fill = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };

  const PAGES = {
    shop: () => SM.listing(mount, {
      products: SM.catalog.all(),
      facets: ['type', 'collection', 'availability', 'price', 'dimensions', 'size', 'orientation', 'medium'],
      priceBuckets: SM.priceBuckets([50, 500])
    }),

    originals: () => {
      const list = SM.catalog.originals();
      const sizes = list.map(p => p.dimensions).sort((a, b) => a.w * a.h - b.w * b.h);
      fill('[data-fact-count]', String(list.length));
      fill('[data-fact-sizes]', `${sizes[0].w} × ${sizes[0].h} – ${sizes.at(-1).w} × ${sizes.at(-1).h} cm`);
      fill('[data-fact-price]', `From ${money(range(list).min)}`);
      return SM.listing(mount, {
        products: list,
        facets: ['collection', 'medium', 'dimensions', 'availability', 'price', 'orientation'],
        priceBuckets: SM.priceBuckets([520, 680]),
        numbered: true,
        resultsHeading: 'Available originals',
        noun: ['original', 'originals']
      });
    },

    prints: () => {
      const list = SM.catalog.prints();
      fill('[data-fact-price]', `From ${money(range(list).min)}`);
      return SM.listing(mount, {
        products: list,
        facets: ['size', 'orientation', 'frame', 'price', 'collection', 'availability'],
        priceBuckets: SM.priceBuckets([36]),
        gridClass: 'product-grid--4',
        noun: ['print', 'prints']
      });
    },

    collections: () => {
      const id = SM.param('id');
      const collection = id && SM.catalog.collection(id);
      if (!collection) return renderCollectionIndex();
      renderCollection(collection);
      return SM.listing(mount, {
        products: SM.catalog.inCollection(collection.id),
        facets: ['type'],
        tabs: 'type',
        resultsHeading: `${collection.title} artworks`
      });
    }
  };

  function renderCollectionIndex() {
    $('#collectionDetail').hidden = true;
    $('#collectionIndex').innerHTML = SM.catalog.collections().map(c => {
      const works = SM.catalog.inCollection(c.id);
      const seen = new Set();
      const strip = works.filter(p => !seen.has(p.title) && seen.add(p.title)).slice(0, 4);
      return `<article class="collection-feature">
        ${SM.art(c.image, `Detail from the ${c.title} collection`, { lazy: false })}
        <div class="collection-feature__copy">
          <p class="eyebrow">${esc(c.eyebrow)}</p>
          <h2><a href="${SM.url.collection(c.id)}">${esc(c.title)}</a></h2>
          <p>${esc(c.story)}</p>
          <div class="collection-feature__strip" aria-hidden="true">${strip.map(p => SM.art(p.images[0], '')).join('')}</div>
          <p class="collection-feature__meta">${works.length} works · ${works.filter(p => p.type === 'original').length} originals · ${works.filter(p => p.type === 'print').length} prints</p>
          <a class="button dark" href="${SM.url.collection(c.id)}">Explore the collection</a>
        </div>
      </article>`;
    }).join('');
  }

  function renderCollection(c) {
    $('#collectionIndexHead').hidden = true;
    $('#collectionIndex').hidden = true;
    $('#collectionDetail').hidden = false;
    const works = SM.catalog.inCollection(c.id);
    document.title = `${c.title} — Collection — Shalini Mall`;
    const url = `https://shalini-mall.vercel.app/${SM.url.collection(c.id)}`;
    $('link[rel="canonical"]').href = url;
    $('meta[name="description"]').content = `${c.title}: ${c.story}`;
    $('meta[property="og:title"]').content = `${c.title} — Shalini Mall`;
    $('meta[property="og:url"]').content = url;
    $('#collectionHero').innerHTML = `${SM.art(c.image, '', { lazy: false, priority: true })}
      <div class="page-banner__copy">
        <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="collections.html">Collections</a></li><li aria-current="page">${esc(c.title)}</li></ol></nav>
        <p class="eyebrow">${esc(c.eyebrow)}</p>
        <h1>${esc(c.title)}</h1>
        <p>${esc(c.intro)}</p>
        <p class="banner-facts"><span>${works.length} works</span><span>${works.filter(p => p.type === 'original').length} originals</span><span>${works.filter(p => p.type === 'print').length} prints</span></p>
        <a class="button light" href="#works">Explore the collection ${icon('arrow')}</a>
      </div>`;
    $('#collectionStory').innerHTML = `<div><p class="eyebrow">The story</p><h2>${esc(c.heading)}</h2></div>
      <div class="collection-story__body"><p>${esc(c.story)}</p></div>`;
  }

  if (mount && PAGES[mount.dataset.listing]) PAGES[mount.dataset.listing]();
})();
