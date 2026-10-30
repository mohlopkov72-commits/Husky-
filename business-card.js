(() => {
  'use strict';
  const scene = document.querySelector('.card-scene');
  const card = scene?.querySelector('.business-card');
  if (!card) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const current = { x: 0, y: 0, lx: 50, ly: 35 };
  let target = { ...current };
  let frame = 0;
  let previous = 0;
  const blocked = () => reduced.matches || !fine.matches || document.hidden ||
    ['motion-paused', 'dialog-open', 'interface-hidden', 'is-loading'].some(name => document.body.classList.contains(name));
  function paint() {
    card.style.setProperty('--card-rx', `${current.x.toFixed(3)}deg`);
    card.style.setProperty('--card-ry', `${current.y.toFixed(3)}deg`);
    card.style.setProperty('--card-light-x', `${current.lx.toFixed(2)}%`);
    card.style.setProperty('--card-light-y', `${current.ly.toFixed(2)}%`);
  }
  function tick(time) {
    const blend = 1 - Math.exp(-Math.min(time - (previous || time - 16), 64) / 85);
    previous = time;
    let moving = false;
    for (const key of Object.keys(current)) {
      current[key] += (target[key] - current[key]) * blend;
      if (Math.abs(target[key] - current[key]) > .015) moving = true;
      else current[key] = target[key];
    }
    paint();
    frame = moving ? requestAnimationFrame(tick) : 0;
    if (!moving) previous = 0;
  }
  function animate() { if (!frame) frame = requestAnimationFrame(tick); }
  function reset(immediate = false) {
    target = { x: 0, y: 0, lx: 50, ly: 35 };
    card.classList.remove('is-tracking');
    if (immediate) {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      Object.assign(current, target); paint();
    } else animate();
  }
  scene.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || blocked()) return;
    // Measure the stable scene, so the tilted card cannot feed back into its own angle.
    const bounds = scene.getBoundingClientRect();
    const clamp = value => Math.max(0, Math.min(1, value));
    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - (bounds.top + (bounds.height - card.offsetHeight) / 2)) / card.offsetHeight);
    target = { x: (0.5 - y) * 12, y: (x - 0.5) * 18, lx: x * 100, ly: y * 100 };
    card.classList.add('is-tracking'); animate();
  }, { passive: true });
  scene.addEventListener('pointerleave', () => reset(blocked()));
  scene.addEventListener('pointercancel', () => reset(true));
  window.addEventListener('blur', () => reset(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(true); });
  reduced.addEventListener('change', () => reset(true));
  fine.addEventListener('change', () => reset(true));
  new MutationObserver(() => { if (blocked()) reset(true); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
