/* Shalini Mall theme — variant selection (SM.variants) and quantity stepper (SM.qty).
   Radio pills from snippets/variant-picker.liquid resolve to a Shopify variant by
   matching every option value — the same variants Printify creates for prints. */
(function () {
  const SM = window.SM;

  SM.productData = root => {
    const el = root.querySelector('[data-product-json]');
    try { return el ? JSON.parse(el.textContent) : null; } catch { return null; }
  };

  const selected = root => {
    const values = [];
    root.querySelectorAll('[data-option-index]:checked').forEach(r => { values[Number(r.dataset.optionIndex)] = r.value; });
    return values;
  };

  SM.variants = {
    find: (product, values) => product.variants.find(v => v.options.every((o, i) => values[i] === undefined || o === values[i])) || null,

    /* Disable option values that have no available variant with the other current choices. */
    refresh(root, product) {
      const current = selected(root);
      root.querySelectorAll('input[data-option-index]').forEach(input => {
        const i = Number(input.dataset.optionIndex);
        const trial = current.slice();
        trial[i] = input.value;
        const match = product.variants.some(v => v.available && v.options.every((o, n) => trial[n] === undefined || o === trial[n]));
        input.disabled = !match && !input.checked;
      });
      root.querySelectorAll('[data-option-value]').forEach(el => { el.textContent = current[Number(el.dataset.optionValue)] || ''; });
    },

    /* Calls onChange(variant) whenever the selection resolves to a variant. */
    bind(root, product, onChange) {
      if (!root || !product) return;
      this.refresh(root, product);
      root.addEventListener('change', e => {
        if (!e.target.matches('[data-option-index]')) return;
        this.refresh(root, product);
        const variant = this.find(product, selected(root));
        if (variant) onChange(variant);
      });
    }
  };

  SM.qty = {
    bind(root) {
      if (!root) return () => 1;
      const input = root.querySelector('input');
      const [minus, plus] = root.querySelectorAll('[data-step]');
      const max = Number(input.max) || 10;
      const sync = () => {
        const n = Math.max(1, Math.min(max, Math.floor(+input.value) || 1));
        input.value = n;
        minus.disabled = n <= 1;
        plus.disabled = n >= max;
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
