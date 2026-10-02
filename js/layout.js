/* Shalini Mall — shared page shell (announcement, header, mega menu, drawers,
   search overlay, dialogs, newsletter, footer). Each block maps to a Shopify
   section in Phase 2: announcement-bar, header, cart-drawer, footer. */
(function () {
  const SM = window.SM;
  const { icon, esc } = SM;

  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  SM.page = page;
  const current = name => (name === page ? ' aria-current="page"' : '');

  const originals = SM.catalog.originals();
  const prints = SM.catalog.prints();
  const collections = SM.catalog.collections();
  const featured = SM.catalog.get('earth-song');

  /* Shop menu content, shared by the desktop mega menu and the mobile drawer. */
  const SHOP_GROUPS = [
    { title: 'Original art', links: [
      ['originals.html', 'All originals', originals.length],
      ['originals.html?dimensions=large', 'Large-scale works'],
      ['originals.html?dimensions=small', 'Intimate works'],
      ['about.html#original-or-print', 'Why collect an original']
    ] },
    { title: 'Fine art prints', links: [
      ['prints.html', 'All prints', prints.length],
      ['prints.html?size=8%20%C3%97%2010%20in,10%20%C3%97%208%20in,16%20%C3%97%2020%20in,20%20%C3%97%2016%20in', 'Smaller canvases · portrait & horizontal'],
      ['prints.html?size=24%20%C3%97%2030%20in,30%20%C3%97%2024%20in,30%20%C3%97%2040%20in,40%20%C3%97%2030%20in', 'Larger canvases · portrait & horizontal'],
      ['about.html#print-sizes', 'Print size guide']
    ] },
    { title: 'Collections', links: [
      ...collections.map(c => [SM.url.collection(c.id), c.title, SM.catalog.inCollection(c.id).length]),
      ['collections.html', 'All collections'],
      ['artist.html', 'The artist']
    ] }
  ];
  const groupLinks = links => links.map(([href, label, count]) =>
    `<li><a href="${href}">${esc(label)}${count ? `<small>(${count})</small>` : ''}</a></li>`).join('');

  const mega = `<div class="mega" id="megaShop" role="region" aria-label="Shop menu">
    <div class="mega-inner">
      ${SHOP_GROUPS.map(g => `<div class="mega-col"><h2>${g.title}</h2><ul>${groupLinks(g.links)}</ul></div>`).join('')}
      <a class="mega-feature" href="${SM.url.product(featured.id)}">
        ${SM.art(featured.images[0], SM.altText(featured))}
        <div>
          <p class="eyebrow">Featured original</p>
          <h3>${esc(featured.title)}</h3>
          <p class="muted">${esc(featured.dimensionsLabel)} · ${esc(featured.status)}</p>
          <span class="text-link">Explore ${icon('arrow')}</span>
        </div>
      </a>
    </div>
    <div class="mega-foot"><a class="text-link" href="shop.html">Shop all artwork ${icon('arrow')}</a></div>
  </div>`;

  const header = `<a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement" role="region" aria-label="Announcement">
    <ul>
      <li><a href="originals.html">Every original signed, with a certificate of authenticity</a></li>
      <li><a href="prints.html">Signed fine art prints from ${SM.money(Math.min(...prints.map(p => p.price)))}</a></li>
      <li><a href="#newsletter">Join our newsletter</a></li>
    </ul>
  </div>
  <header class="site-header">
    <div class="header-inner">
      <div class="header-start">
        <button type="button" class="icon-btn menu-btn" data-open="menuPanel" aria-controls="menuPanel" aria-expanded="false" aria-label="Open menu">${icon('menu')}</button>
      </div>
      <a class="brand" href="index.html" aria-label="Shalini Mall, home"><span>Shalini Mall</span></a>
      <nav class="desktop-nav" aria-label="Primary">
        <ul>
          <li><a class="nav-link" href="index.html"${current('index')}>Home</a></li>
          <li><a class="nav-link" id="shopToggle" href="shop.html" aria-haspopup="true" aria-expanded="false" aria-controls="megaShop"${['shop'].includes(page) ? ' aria-current="page"' : ''}>Shop ${icon('chevron')}</a>${mega}</li>
          <li><a class="nav-link" href="originals.html"${current('originals')}>Originals</a></li>
          <li><a class="nav-link" href="prints.html"${current('prints')}>Prints</a></li>
          <li><a class="nav-link" href="collections.html"${current('collections')}>Collections</a></li>
          <li><a class="nav-link" href="artist.html"${current('artist')}>The Artist</a></li>
          <li><a class="nav-link" href="about.html"${current('about')}>About</a></li>
        </ul>
      </nav>
      <div class="header-actions">
        <button type="button" class="icon-btn" data-open="searchPanel" aria-controls="searchPanel" aria-expanded="false" aria-label="Search">${icon('search')}</button>
        <a class="icon-btn" href="wishlist.html" data-hide-xs data-wishlist-link aria-label="Wishlist">${icon('heart')}<span class="count-badge" data-wishlist-count></span></a>
        <!-- Account slot: reserved for Shopify customer accounts in Phase 2. -->
        <button type="button" class="icon-btn" data-open="cartPanel" aria-controls="cartPanel" aria-expanded="false" data-cart-link aria-label="Cart">${icon('bag')}<span class="count-badge" data-cart-count></span></button>
      </div>
    </div>
  </header>`;

  const menuPanel = `<aside class="panel panel--left" id="menuPanel" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden="true" inert>
    <div class="panel-head">
      <a class="brand" href="index.html"><span>Shalini Mall</span></a>
      <button type="button" class="icon-btn" data-close aria-label="Close menu">${icon('close')}</button>
    </div>
    <form class="menu-search" role="search" action="search.html">
      <label class="sr-only" for="menuSearch">Search artworks</label>
      ${icon('search')}
      <input id="menuSearch" name="q" type="search" placeholder="Search artworks…" autocomplete="off">
    </form>
    <nav class="menu-nav" aria-label="Mobile">
      <ul class="menu-list">
        <li><a href="index.html"${current('index')}>Home</a></li>
        <li>
          <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="menuShop" data-menu-toggle>Shop ${icon('chevron')}</button>
          <div class="menu-sub" id="menuShop" hidden>
            <a class="menu-sub__all" href="shop.html"${current('shop')}>Shop all artwork</a>
            ${SHOP_GROUPS.map(g => `<div class="menu-group"><h3>${g.title}</h3><ul>${groupLinks(g.links)}</ul></div>`).join('')}
          </div>
        </li>
        <li><a href="originals.html"${current('originals')}>Originals</a></li>
        <li><a href="prints.html"${current('prints')}>Prints</a></li>
        <li><a href="collections.html"${current('collections')}>Collections</a></li>
        <li><a href="artist.html"${current('artist')}>The Artist</a></li>
        <li><a href="about.html"${current('about')}>About</a></li>
        <li><a href="contact.html"${current('contact')}>Contact</a></li>
      </ul>
    </nav>
    <div class="panel-foot menu-utility">
      <a href="wishlist.html">${icon('heart')} Wishlist <span data-wishlist-count-text></span></a>
      <a href="cart.html">${icon('bag')} Cart <span data-cart-count-text></span></a>
    </div>
  </aside>`;

  const cartPanel = `<aside class="panel panel--right" id="cartPanel" role="dialog" aria-modal="true" aria-labelledby="cartTitle" aria-hidden="true" inert>
    <div class="panel-head">
      <h2 id="cartTitle">Your cart <span data-cart-count-text></span></h2>
      <button type="button" class="icon-btn" data-close aria-label="Close cart">${icon('close')}</button>
    </div>
    <div class="panel-body"><div class="cart-items" id="cartItems"></div></div>
    <div class="panel-foot" id="cartFoot">
      <div class="cart-summary-row"><span>Subtotal</span><strong id="cartSubtotal">${SM.money(0)}</strong></div>
      <p class="cart-note">Originals ship complimentary across India. Taxes and print shipping are calculated at checkout.</p>
      <div class="cart-buttons">
        <a class="button outline full" href="cart.html">View cart</a>
        <button type="button" class="button dark full" data-checkout>Checkout</button>
      </div>
    </div>
  </aside>`;

  const searchPanel = `<section class="search-overlay" id="searchPanel" role="dialog" aria-modal="true" aria-label="Search artworks" aria-hidden="true" inert>
    <div class="search-inner">
      <div class="search-bar">
        <form class="search-field" role="search" action="search.html" data-search-form>
          ${icon('search')}
          <label class="sr-only" for="searchInput">Search artworks and collections</label>
          <input id="searchInput" name="q" type="search" placeholder="Search artworks, collections…" autocomplete="off" spellcheck="false"
            role="combobox" aria-expanded="false" aria-controls="searchResults" aria-autocomplete="list" aria-describedby="searchStatus" data-autofocus>
          <button type="button" class="search-clear" data-search-clear hidden>Clear</button>
        </form>
        <button type="button" class="icon-btn" data-close aria-label="Close search">${icon('close')}</button>
      </div>
      <p class="search-status" id="searchStatus" aria-live="polite"></p>
      <ul class="search-results" id="searchResults" role="listbox" aria-label="Matching artworks"></ul>
      <div id="searchExtra"></div>
    </div>
  </section>`;

  const dialogs = `<dialog class="dialog" id="quickView" aria-labelledby="qvTitle"></dialog>
  <dialog class="dialog dialog--narrow" id="checkoutDialog" aria-labelledby="checkoutTitle">
    <button type="button" class="icon-btn dialog-close" data-dialog-close aria-label="Close">${icon('close')}</button>
    <div class="dialog-body">
      <p class="eyebrow">Checkout</p>
      <h2 id="checkoutTitle">Online checkout is on its way.</h2>
      <p>Secure checkout opens with the next release of the studio shop. Your selection stays saved in this browser until then.</p>
      <p>Ready to collect a work now? Send the studio a note with the pieces you have chosen.</p>
      <div class="dialog-actions">
        <a class="button dark" href="contact.html">Contact the studio</a>
        <button type="button" class="button outline" data-dialog-close>Keep browsing</button>
      </div>
    </div>
  </dialog>`;

  const footer = `<section class="newsletter" id="newsletter" aria-labelledby="newsletterTitle">
    <p class="eyebrow">Notes from the studio</p>
    <h2 id="newsletterTitle">Art, process, and new work—occasionally.</h2>
    <form id="newsletterForm" novalidate>
      <label class="sr-only" for="newsletterEmail">Email address</label>
      <input class="input" id="newsletterEmail" type="email" name="email" placeholder="Email address" autocomplete="email" required>
      <button class="button dark" type="submit">Subscribe ${icon('arrow')}</button>
      <p class="form-message" aria-live="polite"></p>
    </form>
  </section>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="index.html"><span>Shalini Mall</span></a>
          <p>Art for slow, considered spaces. Original paintings and signed fine art prints.</p>
        </div>
        <div class="footer-col"><h2>Shop</h2><ul>
          <li><a href="originals.html">Originals</a></li>
          <li><a href="prints.html">Prints</a></li>
          <li><a href="collections.html">Collections</a></li>
          <li><a href="shop.html">All artwork</a></li>
        </ul></div>
        <div class="footer-col"><h2>Studio</h2><ul>
          <li><a href="artist.html">The artist</a></li>
          <li><a href="about.html">About the studio</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul></div>
        <div class="footer-col"><h2>Help</h2><ul>
          <li><a href="about.html#shipping">Shipping &amp; care</a></li>
          <li><a href="about.html#print-sizes">Print sizes</a></li>
          <li><a href="contact.html#faq">FAQ</a></li>
          <li><a href="wishlist.html">Wishlist</a></li>
        </ul></div>
        <div class="footer-col"><h2>Follow</h2><ul>
          <li><a href="https://www.instagram.com/" rel="noopener">Instagram</a></li>
          <li><a href="https://www.pinterest.com/" rel="noopener">Pinterest</a></li>
          <li><a href="https://www.facebook.com/" rel="noopener">Facebook</a></li>
        </ul></div>
      </div>
      <div class="legal"><span>© 2026 Shalini Mall Studio</span><span>Prices shown in US dollars (USD)</span></div>
    </div>
  </footer>
  <div class="toast" role="status" aria-live="polite"></div>`;

  document.body.insertAdjacentHTML('afterbegin', header + '<div class="scrim" data-close></div>' + menuPanel + cartPanel + searchPanel);
  document.body.insertAdjacentHTML('beforeend', dialogs + footer);
})();
