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
  const timing = {flight:1000,emblem:850,reveal:600};
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
    if (ready) status.textContent = 'Твоё пространство';
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
    complete();
  }
  function resize() {
    if (!ctx) return;
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, width < 700 ? 1.5 : 1.75);
    canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    if (started && !completed && !reduced.matches) draw(performance.now()-startTime);
  }
  // A shallow curve slows into the exact center of the emblem.
  function pointAt(t) {
    const inverse = 1-t;
    return {
      x:inverse*inverse*(-width*.12)+2*inverse*t*width*.31+t*t*width*.5,
      y:inverse*inverse*height*.07+2*inverse*t*height*.12+t*t*height*.47
    };
  }
  function draw(elapsed) {
    if (!ctx) return;
    ctx.clearRect(0,0,width,height);
    const progress = Math.min(1, Math.max(0,elapsed / timing.flight));
    const travel = progress*progress*(3-2*progress);
    const impact = Math.max(0,elapsed-timing.flight);
    const endX = width*.5, endY = height*.47;
    const {x,y} = pointAt(travel);
    const opacity = Math.min(1,progress*6)*Math.max(0,1-impact/240);
    if (opacity > 0) {
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      ctx.lineCap='round';
      // Segments taper along the same curve; no trail history or resize jumps.
      const tail = Math.min(travel,.32);
      for (let i=0;i<32;i++) {
        const fraction=(i+1)/32;
        const a=pointAt(travel-tail+tail*i/32);
        const b=pointAt(travel-tail+tail*fraction);
        ctx.strokeStyle=`rgba(94,150,238,${opacity*fraction*fraction*.09})`;
        ctx.lineWidth=2+fraction*7;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        ctx.strokeStyle=`rgba(207,229,255,${opacity*fraction*fraction*.8})`;
        ctx.lineWidth=.4+fraction*1.4;
        ctx.stroke();
      }
      const halo=ctx.createRadialGradient(x,y,0,x,y,23);
      halo.addColorStop(0,`rgba(237,247,255,${opacity*.9})`);
      halo.addColorStop(.14,`rgba(169,205,255,${opacity*.5})`);
      halo.addColorStop(1,'rgba(58,119,225,0)');
      ctx.fillStyle=halo;ctx.fillRect(x-23,y-23,46,46);
      ctx.fillStyle=`rgba(242,249,255,${opacity})`;
      ctx.beginPath();ctx.moveTo(x,y-7);ctx.quadraticCurveTo(x+1,y-1,x+5,y);ctx.quadraticCurveTo(x+1,y+1,x,y+7);ctx.quadraticCurveTo(x-1,y+1,x-5,y);ctx.quadraticCurveTo(x-1,y-1,x,y-7);ctx.fill();
      for (let i=1;i<=18;i++) {
        const along=i/19, p=pointAt(Math.max(0,travel-tail*along));
        const scatter=Math.sin(i*8.37+elapsed*.002)*along*7;
        ctx.globalAlpha=opacity*(1-along)*.38;
        ctx.beginPath();ctx.arc(p.x-scatter,p.y+scatter,.4+(1-along)*.4,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    if (impact > 0 && impact < timing.emblem) {
      const progress = impact/timing.emblem;
      ctx.save();ctx.fillStyle='#b9d3f4';
      for (let i=0;i<20;i++) {
        const angle=i*2.39996, radius=(12+(1-Math.pow(1-progress,3))*125)*(.6+(i%3)*.2);
        ctx.globalAlpha=Math.sin(Math.PI*progress)*.36;
        ctx.beginPath();ctx.arc(endX+Math.cos(angle)*radius,endY+Math.sin(angle)*radius,.45+(i%3)*.2,0,Math.PI*2);ctx.fill();
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
    later(reveal, timing.flight+timing.emblem+450);
  }
  reduced.addEventListener('change',onMotionChange);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('husky:revealed',cleanup);
  window.addEventListener('pagehide',complete);
  skip.addEventListener('click',onSkip);
  resize();
  const logoReady=decode(logo);
  const assets=[logoReady,document.fonts?.ready ?? Promise.resolve()];
  let loaded=0;
  Promise.allSettled(assets.map(asset => Promise.resolve(asset).finally(() => {
    if (completed) return;
    loader.style.setProperty('--loaded',`${++loaded/assets.length*100}%`);
  }))).then(() => {
    ready=true;
    if (!completed) {
      if (loader.dataset.phase === 'glow') status.textContent='Твоё пространство';
      maybeReveal();
    }
  });
  logoReady.then(start,start);
  later(start,350);
  if (document.hidden) complete();
})();
