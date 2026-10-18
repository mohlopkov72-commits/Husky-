(() => {
  'use strict';
  const canvas = document.querySelector('#night-sky');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 700px)');
  let w = 0, h = 0, dpr = 1, stars = [], haze, grain, grainPattern;
  let time = 0, last = 0, frame = 0, nextComet = 3.8, comet = null;
  let musicEnergy = 0;
  let paused = reduce.matches, covered = document.documentElement.classList.contains('is-loading');
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let seed = 74823;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function noiseTexture() {
    grain = document.createElement('canvas'); grain.width = grain.height = 192;
    const g = grain.getContext('2d');
    const data = g.createImageData(192,192);
    for (let i=0;i<data.data.length;i+=4) {
      const v = random() * 255;
      data.data[i]=data.data[i+1]=data.data[i+2]=v;
      data.data[i+3]=6;
    }
    g.putImageData(data,0,0);
    grainPattern=ctx.createPattern(grain,'repeat');
  }
  function resize() {
    w = window.innerWidth; h = window.innerHeight;
    dpr = Math.min(devicePixelRatio || 1,small.matches ? 1.5 : 1.75);
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count = small.matches
      ? Math.min(1900,Math.max(1400,Math.floor(w*h/235)))
      : Math.min(5200,Math.max(2600,Math.floor(w*h/255)));
    seed = 74823;
    stars = Array.from({length:count},() => {
      const z = .2 + random()*.8;
      const band = random() < .36;
      const y = random();
      const spread = (random()+random()+random()+random()-2)*.14;
      const x = band ? (.24+(1-y)*.46+spread+1)%1 : random();
      const bright = !band && random() < .035;
      return {x,y,z,r:bright ? .85+random()*.4 : (.24+random()*.68)*z+.16,a:band ? .28+random()*.44 : .35+random()*.62,phase:random()*Math.PI*2,speed:.28+random()*.65};
    });
    haze=ctx.createLinearGradient(0,0,w*.15,h);
    haze.addColorStop(0,'#060606');
    haze.addColorStop(.38,'#0d0d0d');
    haze.addColorStop(.70,'#181818');
    haze.addColorStop(1,'#2d2d2d');
    noiseTexture();
    draw();
  }
  function draw() {
    ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
    // Slowly breathing atmospheric glow. Stars are individually animated, not a photograph.
    const glow = ctx.createRadialGradient(w*(.5+Math.sin(time*.018)*.04),h*.85,0,w*.5,h*.9,Math.max(w*.64,h*.8));
    glow.addColorStop(0,`rgba(155,155,155,${.075 + musicEnergy * .17})`);glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    // Wide, slow ribbons react to the actual low/mid frequencies without flashing.
    if (musicEnergy > .006) {
      ctx.save();
      for (let band = 0; band < 3; band++) {
        ctx.beginPath();
        for (let x = 0; x <= w + 12; x += 12) {
          const envelope = Math.sin(Math.min(1, x / w) * Math.PI);
          const y = h * (.66 + band * .045) + Math.sin(x / w * 8 + time * .42 + band * 1.3) * (10 + musicEnergy * 28) * envelope;
          if (!x) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = `rgba(230,230,230,${musicEnergy * (.13 - band * .025)})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = '#ffffff35';ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const s of stars) {
      const driftX=time*(.8+s.z*1.6);
      const driftY=time*(.11+s.z*.2);
      const x=((s.x*w+driftX+pointer.x*s.z+w+30)%(w+30))-15;
      const y=((s.y*h+driftY+pointer.y*s.z+h+30)%(h+30))-15;
      const twinkle=.65+Math.sin(time*s.speed+s.phase)*.24+Math.sin(time*s.speed*.4+s.phase)*.11;
      const fade=y>h*.80?Math.max(.08,1-(y/h-.80)*4):1;
      ctx.globalAlpha=Math.min(1,Math.max(.05,s.a*(twinkle + musicEnergy * s.z * .32)*fade));
      ctx.fillStyle='#efefef';ctx.beginPath();ctx.arc(x,y,s.r*(1+musicEnergy*.22),0,Math.PI*2);ctx.fill();
      if(s.r>.88) {
        ctx.globalAlpha=s.a*twinkle*.09;
        ctx.beginPath();ctx.arc(x,y,s.r*3,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=grainPattern;ctx.fillRect(0,0,w,h);
    if(comet) drawComet();
  }
  function drawComet() {
    const p=(time-comet.start)/comet.duration;
    if(p>=1){comet=null;return;}
    const fade=Math.min(p*5,1)*Math.min((1-p)*4,1);
    const travel=Math.min(w*(small.matches?.78:.36),520);
    const tail=Math.min(travel*.43,180)*Math.min(p*5,1);
    const dx=Math.cos(comet.angle)*comet.direction;
    const dy=Math.sin(comet.angle);
    const x=comet.x*w+p*travel*dx;
    const y=comet.y*h+p*travel*dy;
    const tx=x-tail*dx,ty=y-tail*dy;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    // A soft dust plume surrounds the narrow bright trail and its luminous head.
    const plume=ctx.createLinearGradient(tx,ty,x,y);
    plume.addColorStop(0,'rgba(255,255,255,0)');
    plume.addColorStop(.45,`rgba(255,255,255,${fade*.055})`);
    plume.addColorStop(1,`rgba(255,255,255,${fade*.24})`);
    ctx.fillStyle=plume;
    const wide=small.matches?4:6;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx-dy*wide,ty+dx*wide);ctx.lineTo(tx+dy*wide,ty-dx*wide);ctx.closePath();ctx.fill();
    const core=ctx.createLinearGradient(tx,ty,x,y);
    core.addColorStop(0,'rgba(255,255,255,0)');
    core.addColorStop(.55,`rgba(255,255,255,${fade*.3})`);
    core.addColorStop(1,`rgba(255,255,255,${fade*.95})`);
    ctx.strokeStyle=core;ctx.lineWidth=1.25;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
    const halo=ctx.createRadialGradient(x,y,0,x,y,11);
    halo.addColorStop(0,`rgba(255,255,255,${fade*.6})`);
    halo.addColorStop(.22,`rgba(255,255,255,${fade*.13})`);
    halo.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(255,255,255,${fade})`;ctx.beginPath();ctx.arc(x,y,1.25,0,Math.PI*2);ctx.fill();
    for(let i=1;i<=12;i++) {
      const along=i/13;
      const scatter=Math.sin(i*7.13+comet.start)*along*5;
      ctx.globalAlpha=fade*(1-along)*.33;
      ctx.fillStyle='#fff';ctx.beginPath();
      ctx.arc(x-tail*along*dx-dy*scatter,y-tail*along*dy+dx*scatter,.25+(1-along)*.4,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function loop(now) {
    frame=0;
    if(paused||covered||document.hidden){last=0;return;}
    if(!last)last=now;
    const delta=Math.min((now-last)/1000,.06);
    // A 30 fps cap on small screens reduces battery usage without changing the motion.
    if(small.matches && delta < .030) {frame=requestAnimationFrame(loop);return;}
    last=now;time+=delta;
    const target = reduce.matches ? 0 : (window.huskyMusic?.sample() || 0);
    musicEnergy += (target - musicEnergy) * Math.min(1, delta * (target > musicEnergy ? 3 : 5));
    pointer.x+=(pointer.tx-pointer.x)*Math.min(1,delta*2.2);
    pointer.y+=(pointer.ty-pointer.y)*Math.min(1,delta*2.2);
    document.documentElement.style.setProperty('--pointer-x',pointer.x.toFixed(2)+'px');
    document.documentElement.style.setProperty('--pointer-y',pointer.y.toFixed(2)+'px');
    if(time>nextComet){
      const direction=random()<.75?1:-1;
      comet={x:direction===1?.08+random()*.35:.68+random()*.2,y:.12+random()*.22,start:time,duration:2.1+random()*.7,angle:.34+random()*.22,direction};
      nextComet=time+11+random()*10;
    }
    draw();frame=requestAnimationFrame(loop);
  }
  function schedule(){if(!frame&&!paused&&!covered&&!document.hidden){last=0;frame=requestAnimationFrame(loop);}}
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;}
  addEventListener('pointermove',e=>{if(e.pointerType==='touch'||paused)return;pointer.tx=(e.clientX/w-.5)*34;pointer.ty=(e.clientY/h-.5)*22;},{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.tx=pointer.ty=0;});
  // Touch gently shifts the sky without preventing scrolling or button clicks.
  addEventListener('touchmove',e=>{if(paused||!e.touches[0])return;pointer.tx=(e.touches[0].clientX/w-.5)*24;pointer.ty=(e.touches[0].clientY/h-.5)*16;},{passive:true});
  addEventListener('touchend',()=>{pointer.tx=pointer.ty=0;},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
  let resizeFrame=0;
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);},{passive:true});
  window.huskySky={
    setPaused(value){paused=value;if(paused){stop();musicEnergy=0;draw();}else schedule();},
    setCovered(value){covered=value;if(covered)stop();else schedule();},
    getState(){return {paused,covered,time,musicEnergy,stars:stars.length,comet:comet?{progress:(time-comet.start)/comet.duration}:null,width:w,height:h,pointer:{x:pointer.x,y:pointer.y}};}
  };
  resize();schedule();
})();
