(() => {
  'use strict';
  const dialog = document.querySelector('#about-dialog');
  const open = document.querySelector('#about-open');
  const close = document.querySelector('.close-button');
  const toggle = document.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.actions .button').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || reduced.matches) return;
      const bounds = button.getBoundingClientRect();
      button.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      button.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    }, { passive: true });
    button.addEventListener('pointerleave', () => {
      button.style.setProperty('--mx', '50%');
      button.style.setProperty('--my', '50%');
    });
  });
  let paused = reduced.matches;
  let manualChoice = false;
  function updateMotion() {
    document.body.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Включить движение фона' : 'Приостановить движение фона';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    window.huskySky?.setPaused(paused);
  }
  toggle.addEventListener('click', () => { manualChoice = true; paused = !paused; updateMotion(); });
  reduced.addEventListener('change', () => { if (!manualChoice) { paused = reduced.matches; updateMotion(); } });
  open.addEventListener('click', () => {
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('dialog-open');
    window.huskySky?.setCovered(true);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    window.huskySky?.setCovered(false);
    open.focus({ preventScroll: true });
  });
  updateMotion();
})();
