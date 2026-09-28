/* Shalini Mall — variant selection UI (SM.variantUI) and quantity stepper.
   Options render as radio pills; the selected combination resolves to one
   variant through SM.catalog.findVariant — the same contract as Shopify's
   product.variants, so Phase 2 only swaps the data source. */
(function () {
  const SM = window.SM;
  const { esc, icon } = SM;

  // Is there an available variant with option `name` = `value`, keeping the other current selections?
  const valueAvailable = (product, selected, name, value) =>
    product.variants.some(v => v.available && v.options[name] === value &&
      Object.entries(selected).every(([k, val]) => k === name || v.options[k] === val));

  SM.variantUI = {
    render(product, variant, prefix) {
      return product.options.map(opt => {
        const chosen = variant.options[opt.name];
        const pills = opt.values.map(value => {
          const v = product.variants.find(x => x.options[opt.name] === value);
          const dims = opt.name === 'Size' && v?.dimensions ? `${v.dimensions.w} × ${v.dimensions.h} cm` : '';
          const id = `${prefix}-${opt.name}-${value}`.replace(/\W+/g, '-');
          const disabled = !valueAvailable(product, variant.options, opt.name, value);
          return `<label class="pill" for="${id}">
            <input type="radio" id="${id}" name="${prefix}-${opt.name}" value="${esc(value)}" data-option="${esc(opt.name)}"${value === chosen ? ' checked' : ''}${disabled ? ' disabled' : ''}>
            <span>${esc(value)}${dims ? `<small>${dims}</small>` : ''}</span>
          </label>`;
        }).join('');
        return `<fieldset class="option">
          <legend class="label"><span>${esc(opt.name)}</span><span data-option-value="${esc(opt.name)}">${esc(chosen)}</span></legend>
          <div class="pills">${pills}</div>
        </fieldset>`;
      }).join('');
    },

    /* Calls onChange(variant) whenever the selection resolves to a variant. */
    bind(root, product, onChange) {
      root.addEventListener('change', e => {
        if (!e.target.matches('[data-option]')) return;
        const selected = {};
        root.querySelectorAll('[data-option]:checked').forEach(r => { selected[r.dataset.option] = r.value; });
        root.querySelectorAll('[data-option-value]').forEach(el => { el.textContent = selected[el.dataset.optionValue] || ''; });
        const variant = SM.catalog.findVariant(product, selected);
        if (variant) onChange(variant);
      });
    }
  };

  SM.qty = {
    render: (id, label = 'Quantity') => `<div class="qty" role="group" aria-label="${esc(label)}">
      <button type="button" data-step="-1" aria-label="Decrease quantity" disabled>${icon('minus')}</button>
      <input id="${id}" type="number" inputmode="numeric" min="1" max="${SM.cart.MAX_QTY}" value="1" aria-label="${esc(label)}">
      <button type="button" data-step="1" aria-label="Increase quantity">${icon('plus')}</button>
    </div>`,
    bind(root) {
      const input = root.querySelector('input');
      const [minus, plus] = root.querySelectorAll('[data-step]');
      const sync = () => {
        const n = Math.max(1, Math.min(SM.cart.MAX_QTY, Math.floor(+input.value) || 1));
        input.value = n;
        minus.disabled = n <= 1;
        plus.disabled = n >= SM.cart.MAX_QTY;
      };
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        input.value = (+input.value || 1) + Number(b.dataset.step);
        sync();
      });
      input.addEventListener('change', sync);
      sync();
      return () => +input.value;
    }
  };
})();
