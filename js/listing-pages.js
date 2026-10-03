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
      products: SM.catalog.originals(),
      facets: ['collection', 'availability', 'price', 'dimensions', 'orientation', 'medium'],
      priceBuckets: SM.priceBuckets([500, 700]),
      showPrintLink: true
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
        products: uniqueWorks(collection),
        facets: [],
        resultsHeading: `${collection.title} artworks`
      });
    }
  };

  function uniqueWorks(collection) {
    const seen = new Set();
    return SM.catalog.inCollection(collection.id).filter(p => !seen.has(p.title) && seen.add(p.title));
  }

  function renderCollectionIndex() {
    $('#collectionDetail').hidden = true;
    const collections = SM.catalog.collections();
    const featured = collections.find(c => c.id === 'earth-song') || collections[0];
    const themes = collections.filter(c => c.id !== featured.id);
    $('#collectionDirectoryCount').textContent = `${collections.length} collections · Originals & prints`;
    $('#collectionJump').innerHTML = collections.map(c => `<a href="#collection-${esc(c.id)}">${esc(c.title)}</a>`).join('');
    const works = uniqueWorks(featured);
    $('#collectionIndex').innerHTML = `<article class="collections-featured" id="collection-${esc(featured.id)}">
      <a class="collections-featured__art" href="${SM.url.collection(featured.id)}" aria-label="Explore ${esc(featured.title)}">${SM.art(featured.image, featured.title)}<span>From the studio</span></a>
      <div class="collections-featured__copy"><p class="eyebrow">Featured collection / 01</p><h2>${esc(featured.title)}</h2><p class="collections-featured__line">${esc(featured.heading)}</p><p>${esc(featured.story)}</p><p class="collection-tile__meta">${works.length} paintings · Originals & prints</p><a class="text-link" href="${SM.url.collection(featured.id)}">Explore Earth Song ${icon('arrow')}</a></div>
    </article><div class="collections-grid">${themes.map((c,i) => {
      const paintings = uniqueWorks(c);
      return `<article class="collection-tile" id="collection-${esc(c.id)}">
        <a class="collection-tile__art" href="${SM.url.collection(c.id)}" aria-label="Explore ${esc(c.title)}"><span class="collection-tile__number">${String(i+2).padStart(2,'0')}</span>${paintings.slice(0,2).map(p => SM.art(p.images[0], p.title)).join('')}</a>
        <div class="collection-tile__heading"><h3><a href="${SM.url.collection(c.id)}">${esc(c.title)}</a></h3><a class="collection-tile__arrow" href="${SM.url.collection(c.id)}" aria-label="Explore ${esc(c.title)}">${icon('arrow')}</a></div>
      </article>`;
    }).join('')}</div>`;
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
    const paintings = uniqueWorks(c);
    $('#collectionHero').innerHTML = `<div class="collection-detail-hero__copy">
        <nav class="breadcrumb" aria-label="Breadcrumb"><ol><li><a href="index.html">Home</a></li><li><a href="collections.html">Collections</a></li><li aria-current="page">${esc(c.title)}</li></ol></nav>
        <p class="eyebrow">${esc(c.eyebrow)}</p><h1>${esc(c.title)}</h1><p>${esc(c.intro)}</p>
        <p class="collection-tile__meta">${paintings.length} paintings · ${works.filter(p => p.type === 'original').length} originals · ${works.filter(p => p.type === 'print').length} prints</p>
        <a class="button dark" href="#works">Explore the artwork ${icon('arrow')}</a><a class="text-link" href="collections.html">Back to all collections</a>
      </div><div class="collection-detail-hero__art">${paintings.slice(0,2).map(p => SM.art(p.images[0], p.title, { lazy: false, priority: true })).join('')}</div>`;
    $('#collectionStory').innerHTML = `<div><p class="eyebrow">The story</p><h2>${esc(c.heading)}</h2></div>
      <div class="collection-story__body"><p>${esc(c.story)}</p></div>`;
  }

  if (mount && PAGES[mount.dataset.listing]) PAGES[mount.dataset.listing]();
})();
