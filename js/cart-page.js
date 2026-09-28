/* Shalini Mall — cart page (cart.html). Line items share SM.lineItem with the drawer. */
(function () {
  const SM = window.SM;
  const { $, money } = SM;
  const host = $('#pageCart');
  if (!host) return;

  function render(initial) {
    const { lines, count, subtotal } = SM.cart.summary();
    const empty = !lines.length;
    const hadFocus = host.contains(document.activeElement);
    $('#cartLayout').hidden = empty;
    $('#cartEmpty').hidden = !empty;
    $('#cartHeading').textContent = empty ? 'Cart' : `Cart (${count})`;
    SM.renderKeepingFocus(host, lines.map(SM.lineItem).join(''));
    // The last item was just removed from this page: move focus to the empty state's link.
    if (empty && hadFocus && !initial) $('#cartEmpty a').focus();

    const hasPrints = lines.some(l => l.type === 'print');
    const hasOriginals = lines.some(l => l.type === 'original');
    $('#sumSubtotal').textContent = money(subtotal);
    $('#sumShipping').textContent = hasPrints ? (hasOriginals ? 'Originals complimentary in India · prints at checkout' : 'Calculated at checkout') : 'Complimentary within India';
    $('#sumTotal').textContent = money(subtotal);
    $('#sumNote').textContent = hasPrints ? 'Taxes and print shipping are calculated at checkout.' : 'Taxes are calculated at checkout.';
  }

  SM.on('cart:change', () => render(false));
  render(true);

  const recent = SM.recent.items([], 4);
  if (recent.length) {
    $('#cartRecent').hidden = false;
    $('#cartRecentGrid').innerHTML = SM.cards.list(recent);
  }
})();
