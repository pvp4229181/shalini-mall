/* Shalini Mall — contact form validation (UI only in Phase 1; no message is sent yet). */
(function () {
  const SM = window.SM;
  const form = SM.$('#contactForm');
  if (!form) return;
  const status = SM.$('#contactStatus');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const invalid = [...form.elements].filter(el => el.willValidate && (!el.value.trim() || !el.validity.valid));
    [...form.elements].forEach(el => el.willValidate && el.toggleAttribute('aria-invalid', invalid.includes(el)));
    if (invalid.length) {
      status.classList.add('is-error');
      status.textContent = invalid[0].type === 'email' && invalid[0].value ? 'Please enter a valid email address.' : `Please fill in your ${invalid[0].labels[0].textContent.toLowerCase()}.`;
      invalid[0].focus();
      return;
    }
    status.classList.remove('is-error');
    status.textContent = 'Thank you. Your note is ready for the studio team.';
    form.reset();
  });
})();
