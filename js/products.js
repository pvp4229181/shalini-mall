/* Shalini Mall — catalogue data + catalogue API (SM.catalog).

   Phase 1 keeps the catalogue in this file. The shape deliberately mirrors
   Shopify: product → options → variants, with artwork facts that will become
   metafields (medium, year, dimensions, story) and the original ↔ print link
   that will become custom.related_print / custom.related_original. */
(function () {
  const SM = (window.SM = window.SM || {});

  SM.ART_SRC = 'assets/images/collection-hero.webp';
  SM.ARTIST = 'Shalini Mall';

  // Each original and its signed print share the same master artwork image.
  const ARTWORK_IMAGES = {
    'quiet-orbit': 'assets/images/quiet-orbit.webp',
    'quiet-orbit-print': 'assets/images/quiet-orbit.webp',
    'monsoon-memory': 'assets/images/monsoon-memory.webp',
    'monsoon-memory-print': 'assets/images/monsoon-memory.webp',
    'between-seasons': 'assets/images/between-seasons.webp',
    'between-seasons-original': 'assets/images/between-seasons.webp',
    'wild-grace': 'assets/images/wild-grace.webp',
    'wild-grace-original': 'assets/images/wild-grace.webp',
    'earth-song': 'assets/images/earth-song.webp',
    'earth-song-print': 'assets/images/earth-song.webp',
    'small-hours': 'assets/images/small-hours.webp',
    'small-hours-original': 'assets/images/small-hours.webp'
  };

  /* Collections. Every current artwork image is a detail of the Earth Song
     collection image (see the homepage alt text), so all works are assigned to
     Earth Song. Add further collections here as they are released. */
  const COLLECTIONS = [
    {
      id: 'earth-song',
      title: 'Earth Song',
      eyebrow: 'The Earth Song series',
      heading: 'Colour as a kind of remembering.',
      intro: 'Original paintings and finely made prints shaped by land, memory, and the beauty of becoming.',
      story: 'Built slowly in layers of mineral pigment, charcoal, and translucent washes, these works hold the trace of weather, wild gardens, and remembered places.',
      image: { src: 'assets/images/earth-song.webp', crop: 'center' }
    }
  ];

  /* Source records, unchanged from the original site. `pair` links each
     original to its print edition. */
  const RECORDS = [
    { id: 'quiet-orbit', title: 'Quiet Orbit', category: 'Original', price: 709, size: '91 × 122 cm', status: 'One of one', crop: '58% center', pair: 'quiet-orbit-print', description: 'A layered meditation on stillness, movement, and the spaces we carry within us.' },
    { id: 'monsoon-memory', title: 'Monsoon Memory', category: 'Original', price: 542, size: '76 × 102 cm', status: 'One of one', crop: '78% center', pair: 'monsoon-memory-print', description: 'Earth pigments and translucent blue washes gather like rain over warm stone.' },
    { id: 'between-seasons', title: 'Between Seasons', category: 'Print', price: 44, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'Edition of 50', crop: '34% center', pair: 'between-seasons-original', description: 'A museum-grade canvas print made in a signed, numbered edition.' },
    { id: 'wild-grace', title: 'Wild Grace', category: 'Print', price: 33, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'In stock', crop: '92% center', pair: 'wild-grace-original', description: 'A quiet botanical study printed on stretched matte canvas.' },
    { id: 'earth-song', title: 'Earth Song', category: 'Original', price: 772, size: '102 × 137 cm', status: 'One of one', crop: '69% bottom', pair: 'earth-song-print', description: 'Charcoal marks and mineral colour build an imagined landscape of belonging.' },
    { id: 'small-hours', title: 'The Small Hours', category: 'Print', price: 29, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'In stock', crop: '12% bottom', pair: 'small-hours-original', description: 'A delicate stretched-canvas print for intimate corners and considered collections.' },
    { id: 'quiet-orbit-print', title: 'Quiet Orbit', category: 'Print', price: 40, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'Edition of 50', crop: '58% center', pair: 'quiet-orbit', description: 'A signed, numbered stretched-canvas print of Quiet Orbit.' },
    { id: 'monsoon-memory-print', title: 'Monsoon Memory', category: 'Print', price: 38, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'Edition of 50', crop: '78% center', pair: 'monsoon-memory', description: 'A signed, numbered stretched-canvas print of Monsoon Memory.' },
    { id: 'between-seasons-original', title: 'Between Seasons', category: 'Original', price: 605, size: '76 × 102 cm', status: 'One of one', crop: '34% center', pair: 'between-seasons', description: 'The original painting behind the Between Seasons edition, worked in layered washes.' },
    { id: 'wild-grace-original', title: 'Wild Grace', category: 'Original', price: 480, size: '61 × 76 cm', status: 'One of one', crop: '92% center', pair: 'wild-grace', description: 'The original botanical study, painted by hand in mineral pigments.' },
    { id: 'earth-song-print', title: 'Earth Song', category: 'Print', price: 44, size: '8 × 10 in · 10 × 8 in · 16 × 20 in · 20 × 16 in · 24 × 30 in · 30 × 24 in · 30 × 40 in · 40 × 30 in', status: 'Edition of 50', crop: '69% bottom', pair: 'earth-song', description: 'A signed, numbered stretched-canvas print of Earth Song.' },
    { id: 'small-hours-original', title: 'The Small Hours', category: 'Original', price: 396, size: '51 × 61 cm', status: 'One of one', crop: '12% bottom', pair: 'small-hours', description: 'The original painting behind The Small Hours, made for intimate spaces.' }
  ];

  /* Facts the studio has not published yet. Fill these in and they appear on
     cards, product pages and filters automatically; empty values stay hidden.
     medium: e.g. 'Oil and charcoal on canvas'   year: e.g. 2025 */
  const ARTWORK_FACTS = {
    // 'quiet-orbit': { medium: '', year: null },
  };

  /* Per-size print pricing. Only one price per print exists today, so every
     size uses it. Override a size here once the studio confirms its price:
     'quiet-orbit-print': { '24 × 30 in': 4800 } */
  const PRINT_SIZE_PRICES = {};

  // Printify stretched canvas sizes, converted from inches to centimetres.
  const CANVAS_SIZES = {
    '8 × 10 in': [20.32, 25.4],
    '10 × 8 in': [25.4, 20.32],
    '16 × 20 in': [40.64, 50.8],
    '20 × 16 in': [50.8, 40.64],
    '24 × 30 in': [60.96, 76.2],
    '30 × 24 in': [76.2, 60.96],
    '30 × 40 in': [76.2, 101.6],
    '40 × 30 in': [101.6, 76.2]
  };
  const PRINT_MATERIAL = 'Matte canvas, stretched over a 0.75 in pinewood frame';

  const parseCm = text => {
    const m = /([\d.]+)\s*×\s*([\d.]+)\s*cm/.exec(text || '');
    return m ? { w: +m[1], h: +m[2] } : null;
  };
  const orientationOf = d => (!d ? null : d.w === d.h ? 'Square' : d.w < d.h ? 'Portrait' : 'Landscape');
  const editionOf = status => { const m = /Edition of (\d+)/i.exec(status); return m ? +m[1] : null; };

  function normalise(r, index) {
    const type = r.category === 'Original' ? 'original' : 'print';
    const facts = ARTWORK_FACTS[r.id] || {};
    const base = {
      id: r.id,
      type,
      typeLabel: type === 'original' ? 'Original' : 'Fine art print',
      title: r.title,
      artist: SM.ARTIST,
      collection: r.collection || 'earth-song',
      description: r.description,
      status: r.status,
      available: true,
      medium: facts.medium || null,
      year: facts.year || null,
      images: [{ src: ARTWORK_IMAGES[r.id] || SM.ART_SRC, crop: 'center', fit: r.collection ? 'contain' : 'cover' }],
      position: index
    };
    if (type === 'original') {
      const dimensions = parseCm(r.size);
      const variant = { id: `${r.id}--original`, title: 'Original', options: {}, price: r.price, available: true, sku: null };
      return Object.assign(base, {
        price: r.price,
        dimensions,
        dimensionsLabel: r.size,
        orientation: orientationOf(dimensions),
        options: [],
        variants: [variant],
        relatedPrintId: r.pair || null
      });
    }
    const sizes = r.size.split('·').map(s => s.trim()).filter(Boolean);
    const overrides = PRINT_SIZE_PRICES[r.id] || {};
    const variants = sizes.map(size => ({
      id: `${r.id}--${size.toLowerCase()}`,
      title: size,
      options: { Size: size },
      price: overrides[size] ?? r.price,
      available: true,
      sku: null,
      dimensions: CANVAS_SIZES[size] ? { w: CANVAS_SIZES[size][0], h: CANVAS_SIZES[size][1] } : null
    }));
    return Object.assign(base, {
      price: Math.min(...variants.map(v => v.price)),
      edition: editionOf(r.status),
      material: PRINT_MATERIAL,
      options: [{ name: 'Size', values: sizes }],
      variants,
      relatedOriginalId: r.pair || null
    });
  }

  // Recreated high-resolution artwork; prices and sizes use existing samples.
  const THEME_ARTWORKS = [
  {
    "id": "abstract",
    "title": "Abstract",
    "description": "Bold emotions and expressive forms.",
    "works": [
      {
        "id": "mineral-rhythm",
        "title": "Mineral Rhythm"
      },
      {
        "id": "blue-reverie",
        "title": "Blue Reverie"
      }
    ]
  },
  {
    "id": "nature-landscapes",
    "title": "Nature & Landscapes",
    "description": "Serene views inspired by the earth.",
    "works": [
      {
        "id": "mountain-stillness",
        "title": "Mountain Stillness"
      },
      {
        "id": "forest-whisper",
        "title": "Forest Whisper"
      }
    ]
  },
  {
    "id": "floral-botanical",
    "title": "Floral & Botanical",
    "description": "Celebrating the beauty of nature.",
    "works": [
      {
        "id": "ivory-bloom",
        "title": "Ivory Bloom"
      },
      {
        "id": "jasmine-garden",
        "title": "Jasmine Garden"
      }
    ]
  },
  {
    "id": "figurative",
    "title": "Figurative",
    "description": "Human expressions, stories and emotions.",
    "works": [
      {
        "id": "quiet-reflection",
        "title": "Quiet Reflection"
      },
      {
        "id": "a-moment-within",
        "title": "A Moment Within"
      }
    ]
  },
  {
    "id": "modern-minimal",
    "title": "Modern Minimal",
    "description": "Clean, subtle and contemporary.",
    "works": [
      {
        "id": "golden-stillness",
        "title": "Golden Stillness"
      },
      {
        "id": "soft-geometry",
        "title": "Soft Geometry"
      }
    ]
  },
  {
    "id": "cultural-traditional",
    "title": "Cultural & Traditional",
    "description": "Heritage, culture and timeless art.",
    "works": [
      {
        "id": "lotus-heritage",
        "title": "Lotus Heritage"
      },
      {
        "id": "sacred-lotus",
        "title": "Sacred Lotus"
      }
    ]
  },
  {
    "id": "wildlife",
    "title": "Wildlife",
    "description": "The strength and beauty of the natural world.",
    "works": [
      {
        "id": "tiger-majesty",
        "title": "Tiger Majesty"
      },
      {
        "id": "gentle-giant",
        "title": "Gentle Giant"
      }
    ]
  },
  {
    "id": "cityscapes-architecture",
    "title": "Cityscapes & Architecture",
    "description": "Urban life, structures and perspectives.",
    "works": [
      {
        "id": "paris-in-the-rain",
        "title": "Paris in the Rain"
      },
      {
        "id": "venetian-light",
        "title": "Venetian Light"
      }
    ]
  }
];

  THEME_ARTWORKS.forEach(theme => {
    COLLECTIONS.push({
      id: theme.id, title: theme.title, eyebrow: 'Explore the theme',
      heading: theme.title, intro: theme.description, story: theme.description,
      image: { src: `assets/images/${theme.works[0].id}-hq.webp`, crop: 'center' }
    });
    theme.works.forEach(work => {
      const originalId = `${work.id}-original`, printId = `${work.id}-print`;
      const originalSample = RECORDS.find(r => r.category === 'Original');
      const printSample = RECORDS.find(r => r.category === 'Print');
      RECORDS.push(
        { id: originalId, title: work.title, category: 'Original', price: originalSample.price, size: originalSample.size, status: originalSample.status, pair: printId, collection: theme.id, description: `${theme.description} ${work.title}, from our ${theme.title.toLowerCase()} selection.` },
        { id: printId, title: work.title, category: 'Print', price: printSample.price, size: printSample.size, status: printSample.status, pair: originalId, collection: theme.id, description: `${work.title} as a canvas print. ${theme.description}` }
      );
      ARTWORK_IMAGES[originalId] = ARTWORK_IMAGES[printId] = `assets/images/${work.id}-hq.webp`;
    });
  });

  const PRODUCTS = RECORDS.map(normalise);
  // A print takes the orientation of its original painting.
  PRODUCTS.filter(p => p.type === 'print').forEach(p => {
    const original = PRODUCTS.find(o => o.id === p.relatedOriginalId);
    p.orientation = original ? original.orientation : null;
  });

  const byId = new Map(PRODUCTS.map(p => [p.id, p]));

  SM.catalog = {
    all: () => PRODUCTS.slice(),
    get: id => byId.get(id) || null,
    originals: () => PRODUCTS.filter(p => p.type === 'original'),
    prints: () => PRODUCTS.filter(p => p.type === 'print'),
    collections: () => COLLECTIONS.slice(),
    collection: id => COLLECTIONS.find(c => c.id === id) || null,
    inCollection: id => PRODUCTS.filter(p => p.collection === id),
    canvasSizes: CANVAS_SIZES,
    paperSizes: CANVAS_SIZES,

    /* Original ↔ print relationship, resolved by id (never by title). */
    counterpart(product) {
      if (!product) return null;
      return byId.get(product.type === 'original' ? product.relatedPrintId : product.relatedOriginalId) || null;
    },

    /* Works to suggest alongside a product: same collection first, excluding
       the product itself and its counterpart, one version per artwork. */
    related(product, limit = 3) {
      const skip = new Set([product.id, product.relatedPrintId, product.relatedOriginalId]);
      const seen = new Set();
      return PRODUCTS
        .filter(p => !skip.has(p.id) && p.type === product.type)
        .sort((a, b) => (b.collection === product.collection) - (a.collection === product.collection))
        .filter(p => (seen.has(p.title) ? false : seen.add(p.title)))
        .slice(0, limit);
    },

    /* Variant resolution — the same contract Shopify uses: selected options in,
       matching variant out. */
    findVariant(product, selected) {
      if (!product) return null;
      return product.variants.find(v => Object.entries(v.options).every(([k, val]) => selected[k] === val)) || null;
    },
    variant: (product, variantId) => product?.variants.find(v => v.id === variantId) || null,
    defaultVariant: product => product.variants.find(v => v.available) || product.variants[0],

    priceLabel(product) {
      const prices = product.variants.map(v => v.price);
      const min = Math.min(...prices);
      return prices.length > 1 ? `From ${SM.money(min)}` : SM.money(min);
    },
    // Human-readable size, e.g. '16 × 20 in · 40.64 × 50.8 cm'.
    sizeLabel(variant) {
      const d = variant?.dimensions;
      return d ? `${variant.title} · ${d.w} × ${d.h} cm` : variant?.title || '';
    }
  };

  // Back-compat for any older script still reading the flat list.
  window.ART_PRODUCTS = RECORDS;
})();
