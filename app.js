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
  let closeTimer;
  function finishClose() {
    clearTimeout(closeTimer);
    if (dialog.open) dialog.close();
    dialog.classList.remove('is-closing');
  }
  function closeAbout() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;
    if (reduced.matches) { finishClose(); return; }
    dialog.classList.add('is-closing');
    closeTimer = setTimeout(finishClose, 280);
  }
  open.addEventListener('click', () => {
    if (dialog.open) return;
    clearTimeout(closeTimer);
    dialog.classList.remove('is-closing');
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('dialog-open');
    window.huskySky?.setCovered(true);
  });
  close.addEventListener('click', closeAbout);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeAbout();
  });
  dialog.addEventListener('animationend', event => {
    if (event.target === dialog && event.animationName === 'about-out') finishClose();
  });
  let backdropPress = false;
  function outsideDialog(event) {
    if (event.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
  }
  dialog.addEventListener('pointerdown', event => { backdropPress = outsideDialog(event); });
  dialog.addEventListener('click', e => {
    if (backdropPress && outsideDialog(e)) closeAbout();
    backdropPress = false;
  });
  dialog.addEventListener('close', () => {
    clearTimeout(closeTimer);
    dialog.classList.remove('is-closing');
    document.body.classList.remove('dialog-open');
    window.huskySky?.setCovered(false);
    open.focus({ preventScroll: true });
  });
  updateMotion();
})();
