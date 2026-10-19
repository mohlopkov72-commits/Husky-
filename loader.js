(() => {
  'use strict';
  const loader = document.querySelector('#preloader');
  if (!loader || !document.documentElement.classList.contains('is-loading')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const logo = loader.querySelector('.intro-logo');
  const status = loader.querySelector('.intro-status');
  const skip = loader.querySelector('.intro-skip');
  const canvas = loader.querySelector('#intro-meteor');
  const ctx = canvas?.getContext('2d');
  const timers = new Set();
  const timing = {flight:850,emblem:650,reveal:500};
  loader.style.setProperty('--intro-reveal-duration', `${timing.reveal}ms`);
  let completed = false, started = false, ready = false, settled = false, revealing = false;
  let frame = 0, startTime = 0, width = 0, height = 0;
  const later = (fn, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!completed) fn(); }, delay);
    timers.add(timer);
  };
  const decode = image => image?.decode ? image.decode() : Promise.resolve();
  document.querySelectorAll('.site-header, main, .site-footer, #about-dialog, .interface-toggle').forEach(element => {
    element.inert = true;
    element.setAttribute('data-loader-inert', '');
  });
  function stopDrawing() { cancelAnimationFrame(frame); frame = 0; }
  function cleanup() {
    completed = true;
    timers.forEach(clearTimeout);
    timers.clear();
    stopDrawing();
    reduced.removeEventListener('change', onMotionChange);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    window.removeEventListener('husky:revealed', cleanup);
    window.removeEventListener('pagehide', complete);
    skip.removeEventListener('click', onSkip);
  }
  function complete() {
    if (completed) return;
    cleanup();
    loader.dataset.phase = 'done';
    window.huskyReveal?.();
  }
  function reveal() {
    if (completed || revealing) return;
    revealing = true;
    loader.dataset.phase = 'reveal';
    document.documentElement.classList.remove('is-loading');
    later(complete, timing.reveal + 30);
  }
  function maybeReveal() { if (ready && settled) reveal(); }
  function showEmblem() {
    loader.classList.toggle('intro-without-logo', !logo.naturalWidth);
    loader.dataset.phase = 'glow';
    status.textContent = 'Твоё пространство';
  }
  function staticIntro() {
    timers.forEach(clearTimeout);
    timers.clear();
    stopDrawing();
    if (ctx) ctx.clearRect(0,0,width,height);
    loader.dataset.motion = 'reduced';
    showEmblem();
    later(complete, 220);
  }
  function onMotionChange() { if (reduced.matches) staticIntro(); }
  function onVisibility() { if (document.hidden) complete(); }
  function onSkip() {
    const returnFocus = document.activeElement === skip;
    complete();
    if (returnFocus) document.querySelector('.actions .button')?.focus({preventScroll:true});
  }
  function resize() {
    if (!ctx) return;
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, width < 700 ? 1.5 : 1.75);
    canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    if (started && !completed && !reduced.matches) draw(performance.now()-startTime);
  }
  function draw(elapsed) {
    if (!ctx) return;
    ctx.clearRect(0,0,width,height);
    const progress = Math.min(1, Math.max(0,elapsed / timing.flight));
    const travel = 1-Math.pow(1-progress,1.6);
    const impact = Math.max(0,elapsed-timing.flight);
    const startX = -60, startY = height*.09;
    const endX = width*.5, endY = height*.47;
    const dx = endX-startX, dy = endY-startY;
    const distance = Math.hypot(dx,dy), ux = dx/distance, uy = dy/distance;
    const x = startX+dx*travel, y = startY+dy*travel;
    const length = Math.min(340,width*.46,distance*travel*.85);
    const tailX = x-ux*length, tailY = y-uy*length;
    const opacity = Math.min(1,progress*7)*Math.max(0,1-impact/320);
    if (opacity > 0) {
      ctx.save();ctx.globalCompositeOperation='lighter';
      const plume=ctx.createLinearGradient(tailX,tailY,x,y);
      plume.addColorStop(0,'rgba(113,153,220,0)');plume.addColorStop(.6,`rgba(139,182,244,${opacity*.07})`);plume.addColorStop(1,`rgba(217,236,255,${opacity*.3})`);
      ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tailX-uy*5,tailY+ux*5);ctx.lineTo(tailX+uy*5,tailY-ux*5);ctx.closePath();ctx.fill();
      const streak=ctx.createLinearGradient(tailX,tailY,x,y);
      streak.addColorStop(0,'rgba(135,173,231,0)');streak.addColorStop(.55,`rgba(184,214,255,${opacity*.45})`);streak.addColorStop(1,`rgba(248,252,255,${opacity})`);
      ctx.strokeStyle=streak;ctx.lineWidth=1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(tailX,tailY);ctx.lineTo(x,y);ctx.stroke();
      const halo=ctx.createRadialGradient(x,y,0,x,y,15);
      halo.addColorStop(0,`rgba(245,250,255,${opacity*.85})`);halo.addColorStop(.15,`rgba(189,216,255,${opacity*.4})`);halo.addColorStop(1,'rgba(101,159,255,0)');
      ctx.fillStyle=halo;ctx.fillRect(x-15,y-15,30,30);
      ctx.fillStyle=`rgba(255,255,255,${opacity})`;ctx.beginPath();ctx.arc(x,y,1.65,0,Math.PI*2);ctx.fill();
      for (let i=1;i<=14;i++) {
        const along=i/15, scatter=Math.sin(i*8.37)*along*5;
        ctx.globalAlpha=opacity*(1-along)*.35;ctx.fillStyle='#d9e8ff';
        ctx.beginPath();ctx.arc(x-ux*length*along-uy*scatter,y-uy*length*along+ux*scatter,.35+(1-along)*.35,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    if (impact > 0 && impact < 600) {
      const progress = impact/600;
      ctx.save();ctx.fillStyle='#b9d3f4';
      for (let i=0;i<12;i++) {
        const angle=i*2.39996, radius=(14+progress*45)*(.5+(i%3)*.2);
        ctx.globalAlpha=(1-progress)*.25;
        ctx.beginPath();ctx.arc(endX+Math.cos(angle)*radius,endY+Math.sin(angle)*radius,.65,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
  }
  function tick(now) {
    frame = 0;
    if (completed) return;
    if (reduced.matches) { staticIntro(); return; }
    const elapsed = now-startTime;
    draw(elapsed);
    if (elapsed < timing.flight+timing.emblem) frame=requestAnimationFrame(tick);
  }
  function start() {
    if (started || completed) return;
    started = true;
    if (reduced.matches) { staticIntro(); return; }
    loader.dataset.phase = 'flight';
    startTime=performance.now();
    frame=requestAnimationFrame(tick);
    later(() => {
      showEmblem();
      later(() => { settled=true;maybeReveal(); }, timing.emblem);
    }, timing.flight);
    // Slow or broken resources never prolong the scene beyond a few seconds.
    later(reveal, timing.flight+timing.emblem+700);
  }
  reduced.addEventListener('change',onMotionChange);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('husky:revealed',cleanup);
  window.addEventListener('pagehide',complete);
  skip.addEventListener('click',onSkip);
  resize();
  const logoReady=decode(logo);
  const assets=[logoReady,document.fonts?.ready ?? Promise.resolve(),decode(document.querySelector('.foreground img'))];
  let loaded=0;
  Promise.allSettled(assets.map(asset => Promise.resolve(asset).finally(() => {
    if (completed) return;
    loader.style.setProperty('--loaded',`${++loaded/assets.length*100}%`);
  }))).then(() => { ready=true;if (!completed) maybeReveal(); });
  logoReady.then(start,start);
  later(start,350);
  if (document.hidden) complete();
})();
