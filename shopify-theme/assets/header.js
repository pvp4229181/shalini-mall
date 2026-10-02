/* Shalini Mall theme — general UI: sticky header, mega menu, mobile menu,
   drawers, product-form submits, delegated card actions. */
(function () {
  const SM = window.SM;
  const { $, $$ } = SM;

  /* The mobile menu is rendered inside the header section; move it to <body>
     so it layers above the sticky header (the header wrapper is a stacking context). */
  function mountMenu() {
    const menu = $('#menuPanel');
    if (menu && menu.parentElement !== document.body) document.body.append(menu);
  }

  function initHeader() {
    mountMenu();
    const header = $('.site-header');
    if (!header) return;
    const stick = header.closest('.shopify-section') || header;
    const onScroll = () => header.classList.toggle('scrolled', scrollY > 10);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Mega menu: hover (with intent delay) or keyboard; clicking the trigger follows its link. */
    const toggle = $('#shopToggle');
    const mega = $('#megaShop');
    if (toggle && mega) {
      let timer;
      mega.inert = true;
      const set = open => { clearTimeout(timer); mega.classList.toggle('open', open); mega.inert = !open; toggle.setAttribute('aria-expanded', String(open)); };
      const later = (open, ms) => { clearTimeout(timer); timer = setTimeout(() => set(open), ms); };
      toggle.addEventListener('mouseenter', () => later(true, 120));
      mega.addEventListener('mouseenter', () => clearTimeout(timer));
      stick.addEventListener('mouseleave', () => later(false, 200));
      $$('.desktop-nav .nav-link:not(#shopToggle)').forEach(a => a.addEventListener('mouseenter', () => later(false, 120)));
      toggle.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); set(true); SM.focusables(mega)[0]?.focus(); } });
      stick.addEventListener('keydown', e => { if (e.key === 'Escape' && mega.classList.contains('open')) { set(false); toggle.focus(); } });
      stick.addEventListener('focusout', e => { if (!stick.contains(e.relatedTarget)) set(false); });
      document.addEventListener('click', e => { if (!stick.contains(e.target)) set(false); });
    }

    /* Mobile menu: inline Shop accordion. */
    const menuToggle = $('[data-menu-toggle]');
    const menuSub = $('#menuShop');
    menuToggle?.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(open));
      menuSub.hidden = !open;
    });
  }

  initHeader();
  matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches && SM.overlay.isOpen('menuPanel')) SM.overlay.close({ restore: false }); });

  // Theme editor: the header section re-renders in place.
  document.addEventListener('shopify:section:load', e => {
    if (e.target.querySelector('.site-header')) { $$('body > #menuPanel').forEach(m => m.remove()); initHeader(); }
  });

  /* Product forms (product page, quick view): add through the AJAX cart and open the drawer. */
  document.addEventListener('submit', e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.action.includes('/cart/add')) return;
    e.preventDefault();
    const id = form.querySelector('[name="id"]').value;
    const qty = form.querySelector('[name="quantity"]')?.value || 1;
    SM.addToCart(id, qty, e.submitter || form.querySelector('[type="submit"]'));
  });

  /* Delegated actions. */
  document.addEventListener('click', e => {
    const t = e.target;
    const open = t.closest('[data-open]');
    if (open) { e.preventDefault(); SM.overlay.open(open.dataset.open, open); return; }
    if (t.closest('[data-close]')) { SM.overlay.close(); return; }

    const quickView = t.closest('[data-quick-view]');
    if (quickView) { SM.quickView?.open(quickView.dataset.quickView, quickView); return; }

    const quickAdd = t.closest('[data-quick-add]');
    if (quickAdd) {
      const card = quickAdd.closest('[data-product]');
      if (card && card.dataset.variantCount === '1') SM.addToCart(card.dataset.variantId, 1, quickAdd);
      else SM.quickView?.open(quickAdd.dataset.quickAdd, quickAdd);
    }
  });
})();
