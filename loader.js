(() => {
  'use strict';
  const loader = document.querySelector('#preloader');
  const canvas = document.querySelector('#loader-stars');
  const ctx = canvas?.getContext('2d');
  const skyCanvas = document.querySelector('#loader-sky');
  const skyCtx = skyCanvas?.getContext('2d');
  if (!loader || !ctx || !document.documentElement.classList.contains('is-loading')) {
    window.huskyReveal?.();
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const count = 9;
  const started = performance.now();
  let width = 340, height = 220, frame = 0, ready = false, ending = false;
  let alignAt = null, frozenAngle = 0, completionTimer = 0;
  let assetsLoaded = 0;
  let skyWidth = 0, skyHeight = 0, skyStars = [];
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - value, 3);

  document.querySelectorAll('.site-header, main, .site-footer, #about-dialog').forEach(element => {
    element.inert = true;
    element.setAttribute('data-loader-inert', '');
  });

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (skyCtx) {
      const skyBounds = skyCanvas.getBoundingClientRect();
      skyWidth = skyBounds.width;
      skyHeight = skyBounds.height;
      skyCanvas.width = Math.round(skyWidth * dpr);
      skyCanvas.height = Math.round(skyHeight * dpr);
      skyCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Normalized positions retain their arrangement through viewport changes.
      const total = Math.min(2300, Math.max(600, Math.round(skyWidth * skyHeight / 650)));
      while (skyStars.length < total) skyStars.push({
        x: Math.random(), y: Math.random(), radius: .3 + Math.random() ** 4 * 1.1,
        alpha: .16 + Math.random() ** 2 * .65, phase: Math.random() * Math.PI * 2,
        speed: .4 + Math.random() * .65
      });
      skyStars.length = total;
      renderSky(0);
    }
    if (reduced.matches) render(0, 1);
  }

  function renderSky(elapsed) {
    if (!skyCtx) return;
    skyCtx.clearRect(0, 0, skyWidth, skyHeight);
    const time = reduced.matches ? 0 : elapsed / 1000;
    for (const point of skyStars) {
      const x = (point.x * skyWidth + time * point.speed * .8) % skyWidth;
      const y = (point.y * skyHeight + time * point.speed * .25) % skyHeight;
      const twinkle = .72 + .28 * Math.sin(time * point.speed + point.phase);
      skyCtx.fillStyle = `rgba(245,245,245,${point.alpha * twinkle})`;
      skyCtx.beginPath();
      skyCtx.arc(x, y, point.radius, 0, Math.PI * 2);
      skyCtx.fill();
      if (point.radius > 1.1) {
        skyCtx.fillStyle = `rgba(255,255,255,${point.alpha * twinkle * .08})`;
        skyCtx.beginPath();
        skyCtx.arc(x, y, point.radius * 3, 0, Math.PI * 2);
        skyCtx.fill();
      }
    }
  }

  function star(x, y, radius, rotation, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = '#fafafa';
    ctx.shadowColor = '#ffffff90';
    ctx.shadowBlur = 11;
    ctx.beginPath();
    for (let vertex = 0; vertex < 8; vertex++) {
      const angle = vertex * Math.PI / 4 - Math.PI / 2;
      const distance = vertex % 2 ? radius * .25 : radius;
      if (vertex === 0) ctx.moveTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
      else ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function render(elapsed, staticRow = 0) {
    renderSky(elapsed);
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height / 2;
    const radius = Math.min(width * .32, 110);
    const spacing = Math.min(28, (width - 42) / (count - 1));
    const aligning = alignAt !== null;
    const alignElapsed = aligning ? elapsed - alignAt : 0;
    const overall = staticRow || (aligning ? clamp(alignElapsed / 1000) : 0);
    const ringOpacity = (1 - overall) * .18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-.35);
    for (let ring = 0; ring < 3; ring++) {
      ctx.strokeStyle = `rgba(255,255,255,${ringOpacity * (ring === 1 ? 1 : .4)})`;
      ctx.lineWidth = .7;
      ctx.setLineDash(ring === 2 ? [1, 8] : []);
      ctx.beginPath();
      ctx.ellipse(0,0,radius + ring * 15,(radius + ring * 15) * .64,0,0,Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 - Math.PI / 2 + (aligning ? frozenAngle : elapsed * .0014);
      const progress = staticRow || (aligning ? ease(clamp((alignElapsed - i * 35) / 720)) : 0);
      const ellipseX = Math.cos(angle) * radius;
      const ellipseY = Math.sin(angle) * radius * .64;
      const orbitX = ellipseX * Math.cos(-.35) - ellipseY * Math.sin(-.35);
      const orbitY = ellipseX * Math.sin(-.35) + ellipseY * Math.cos(-.35);
      const rowX = (i - (count - 1) / 2) * spacing;
      const x = cx + orbitX * (1 - progress) + rowX * progress;
      const y = cy + orbitY * (1 - progress);
      const shimmer = .78 + .22 * Math.sin(i * 1.3 + elapsed * .002);
      const opacity = staticRow ? .85 : Math.min(1, elapsed / 240) * (shimmer * (1 - progress) + .9 * progress);
      star(x, y, (i % 3 === 0 ? 6.5 : 4.8) * (1 - progress) + 5.2 * progress,
        (elapsed * .0015 + i * .4) * (1 - progress), opacity);
    }
  }

  function finish() {
    if (ending) return;
    ending = true;
    cancelAnimationFrame(frame);
    loader.dataset.phase = 'reveal';
    document.documentElement.classList.remove('is-loading');
    // The veil fades as the page becomes visible. Keep controls inert until it has cleared.
    completionTimer = setTimeout(() => {
      window.huskyReveal?.();
      cleanup();
    }, reduced.matches ? 0 : 580);
  }

  function tick(now) {
    if (ending) return;
    if (!document.documentElement.classList.contains('is-loading')) { cleanup(); return; }
    const elapsed = now - started;
    if (reduced.matches) {
      loader.dataset.phase = 'row';
      render(0, 1);
      if (ready || elapsed > 1200) finish();
      else frame = requestAnimationFrame(tick);
      return;
    }
    if (alignAt === null && elapsed >= 1250 && (ready || elapsed >= 3600)) {
      alignAt = elapsed;
      frozenAngle = elapsed * .0014;
      loader.dataset.phase = 'align';
      loader.querySelector('.loader-caption').textContent = 'Ваше пространство готово';
    }
    render(elapsed);
    if (alignAt !== null && elapsed - alignAt >= 1000) loader.dataset.phase = 'row';
    if (alignAt !== null && elapsed - alignAt >= 1200) finish();
    else frame = requestAnimationFrame(tick);
  }

  function cleanup() {
    cancelAnimationFrame(frame);
    clearTimeout(completionTimer);
    window.removeEventListener('resize', resize);
    reduced.removeEventListener('change', onMotionChange);
  }
  function onMotionChange() {
    if (reduced.matches && !ending) {
      loader.dataset.phase = 'row';
      render(0, 1);
      if (ready) finish();
    }
  }

  const imageReady = [...document.querySelectorAll('.foreground img, .brand-mark img')].map(image => image.decode?.() ?? Promise.resolve());
  const assets = [document.fonts?.ready ?? Promise.resolve(), ...imageReady];
  Promise.allSettled(assets.map(asset => Promise.resolve(asset).finally(() => {
    assetsLoaded++;
    loader.style.setProperty('--loaded', `${assetsLoaded / assets.length * 100}%`);
  }))).then(() => { ready = true; });
  window.addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', onMotionChange);
  resize();
  frame = requestAnimationFrame(tick);
})();
