(() => {
  'use strict';
  const canvas = document.querySelector('#night-sky');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 700px)');
  let w = 0, h = 0, dpr = 1, stars = [], clouds = [], drops = [], flakes = [], grain, grainPattern;
  let time = 0, last = 0, frame = 0, nextComet = 3.8, comet = null;
  let musicEnergy = 0;
  let paused = reduce.matches, covered = document.documentElement.classList.contains('is-loading');
  let weather = window.huskyWeather?.getState() || {isDay:new Date().getHours() >= 6 && new Date().getHours() < 20,condition:'clear'};
  const palettes = {
    day:{clear:['#030915','#0b1b31','#1b3248'],clouds:['#060b17','#152034','#27374b'],rain:['#040d17','#0e2330','#1d3645'],snow:['#080b1d','#18243b','#2e3c55'],fog:['#090f18','#192633','#2d3c49'],storm:['#020711','#0a1624','#162837']},
    night:{clear:['#020409','#080e19','#162333'],clouds:['#04060d','#0b121d','#18232e'],rain:['#030710','#0a1723','#152a35'],snow:['#060817','#101a30','#22314b'],fog:['#070b12','#141f2a','#25333e'],storm:['#010409','#070f1a','#11202e']}
  };
  function rgb(hex) { return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)); }
  function sceneTarget() {
    const condition = weather.condition in palettes.day ? weather.condition : 'clear';
    return {colors:palettes[weather.isDay ? 'day' : 'night'][condition].map(rgb),day:weather.isDay ? 1 : 0,cloud:condition === 'clear' ? .12 : condition === 'snow' ? .65 : .95,rain:condition === 'rain' || condition === 'storm' ? 1 : 0,snow:condition === 'snow' ? 1 : 0,fog:condition === 'fog' ? 1 : 0};
  }
  let target = sceneTarget();
  let scene = {...target,colors:target.colors.map(color => [...color])};
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let seed = 74823;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function cloudTexture(color) {
    const texture = document.createElement('canvas');
    texture.width = 768; texture.height = 480;
    const brush = texture.getContext('2d');
    const puffs = [[150,183,138],[280,147,154],[412,127,166],[551,166,155],[638,197,110],[359,204,166]];
    puffs.forEach(([x,originalY,radius]) => {
      const y = originalY + 64;
      const gradient = brush.createRadialGradient(x,y,0,x,y,radius);
      gradient.addColorStop(0,`rgba(${color},.46)`);
      gradient.addColorStop(.45,`rgba(${color},.3)`);
      gradient.addColorStop(1,`rgba(${color},0)`);
      brush.fillStyle = gradient; brush.fillRect(x-radius,y-radius,radius*2,radius*2);
    });
    return texture;
  }
  const dayCloud = cloudTexture('65,83,108');
  const nightCloud = cloudTexture('50,65,85');
  function updateWeather(event) {
    weather = event.detail;
    target = sceneTarget();
    if (paused || covered || document.hidden) scene = {...target,colors:target.colors.map(color => [...color])};
    if (weather.condition !== 'clear') comet = null;
    if (w) draw();
    schedule();
  }
  window.addEventListener('husky:weather',updateWeather);
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
    clouds = Array.from({length:8},() => ({x:random(),y:.05+random()*.49,scale:.65+random()*.8,speed:3+random()*6,alpha:.5+random()*.45}));
    drops = Array.from({length:small.matches ? 110 : 230},() => ({x:random(),y:random(),z:.4+random()*.6,speed:440+random()*350}));
    flakes = Array.from({length:small.matches ? 65 : 140},() => ({x:random(),y:random(),z:.3+random()*.7,speed:18+random()*40,phase:random()*Math.PI*2}));
    noiseTexture();
    draw();
  }
  function draw() {
    const haze=ctx.createLinearGradient(0,0,w*.15,h);
    scene.colors.forEach((color,i) => haze.addColorStop(i / 2,`rgb(${color.map(Math.round).join(',')})`));
    ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
    // Slowly breathing atmospheric glow. Stars are individually animated, not a photograph.
    const glow = ctx.createRadialGradient(w*(.5+Math.sin(time*.018)*.04),h*.85,0,w*.5,h*.9,Math.max(w*.64,h*.8));
    glow.addColorStop(0,`rgba(185,211,231,${.045 + musicEnergy * .1})`);glow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    drawClouds();
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
    // Keep the star field visible in every shade and weather condition.
    const starlight = (.95-scene.day*.12) * (1-scene.cloud*.18);
    if (starlight > .005) for (const s of stars) {
      const driftX=time*(.8+s.z*1.6);
      const driftY=time*(.11+s.z*.2);
      const x=((s.x*w+driftX+pointer.x*s.z+w+30)%(w+30))-15;
      const y=((s.y*h+driftY+pointer.y*s.z+h+30)%(h+30))-15;
      const twinkle=.65+Math.sin(time*s.speed+s.phase)*.24+Math.sin(time*s.speed*.4+s.phase)*.11;
      const fade=y>h*.80?Math.max(.08,1-(y/h-.80)*4):1;
      ctx.globalAlpha=Math.min(1,Math.max(.05,s.a*(twinkle + musicEnergy * s.z * .32)*fade))*starlight;
      ctx.fillStyle='#efefef';ctx.beginPath();ctx.arc(x,y,s.r*(1+musicEnergy*.22),0,Math.PI*2);ctx.fill();
      if(s.r>.88) {
        ctx.globalAlpha=s.a*twinkle*.09*starlight;
        ctx.beginPath();ctx.arc(x,y,s.r*3,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    drawPrecipitation();
    ctx.globalAlpha=1-scene.day*.65;
    ctx.fillStyle=grainPattern;ctx.fillRect(0,0,w,h);
    ctx.globalAlpha=1;
    if(comet && starlight > .5) drawComet();
  }
  function drawClouds() {
    const cloudWidth = Math.min(760,Math.max(360,w*.47));
    ctx.save();
    clouds.forEach((cloud,index) => {
      const width=cloudWidth*cloud.scale, height=width*480/768;
      const x=((cloud.x*(w+width)+time*cloud.speed+pointer.x*.2)%(w+width))-width;
      const y=cloud.y*h+Math.sin(time*.025+index)*8;
      const opacity = cloud.alpha * scene.cloud * .45;
      ctx.globalAlpha=opacity*scene.day;
      if (ctx.globalAlpha > .005) ctx.drawImage(dayCloud,x,y,width,height);
      ctx.globalAlpha=opacity*(1-scene.day)*.6;
      if (ctx.globalAlpha > .005) ctx.drawImage(nightCloud,x,y,width,height);
    });
    if (scene.fog > .005) {
      const mist=ctx.createLinearGradient(0,h*.36,0,h);
      mist.addColorStop(0,'#bdd4e000');mist.addColorStop(.6,'#bdd4e055');mist.addColorStop(1,'#bdd4e033');
      ctx.globalAlpha=scene.fog*(.08+scene.day*.05);ctx.fillStyle=mist;ctx.fillRect(0,0,w,h);
    }
    ctx.restore();
  }
  function drawPrecipitation() {
    ctx.save();ctx.lineCap='round';
    if (scene.rain > .005) for (const drop of drops) {
      const x=((drop.x*w-time*90*drop.z)%(w+40)+w+40)%(w+40)-20;
      const y=(drop.y*(h+80)+time*drop.speed)%(h+80)-40;
      ctx.globalAlpha=scene.rain*(.12+drop.z*.27);
      ctx.strokeStyle='#d5e7f5';ctx.lineWidth=.65+drop.z*.6;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3*drop.z,y+11+drop.z*14);ctx.stroke();
    }
    if (scene.snow > .005) for (const flake of flakes) {
      const x=((flake.x*w+Math.sin(time*.45+flake.phase)*20+time*8*flake.z+w+30)%(w+30))-15;
      const y=(flake.y*(h+30)+time*flake.speed)%(h+30)-15;
      ctx.globalAlpha=scene.snow*(.35+flake.z*.6);ctx.fillStyle='#edf6ff';
      ctx.beginPath();ctx.arc(x,y,.5+flake.z*2.1,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
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
    const blend = 1-Math.exp(-delta*2.5);
    ['day','cloud','rain','snow','fog'].forEach(key => { scene[key] += (target[key]-scene[key])*blend; });
    scene.colors.forEach((color,i) => color.forEach((value,j) => { color[j] += (target.colors[i][j]-value)*blend; }));
    const musicTarget = reduce.matches ? 0 : (window.huskyMusic?.sample() || 0);
    musicEnergy += (musicTarget - musicEnergy) * Math.min(1, delta * (musicTarget > musicEnergy ? 3 : 5));
    pointer.x+=(pointer.tx-pointer.x)*Math.min(1,delta*2.2);
    pointer.y+=(pointer.ty-pointer.y)*Math.min(1,delta*2.2);
    document.documentElement.style.setProperty('--pointer-x',pointer.x.toFixed(2)+'px');
    document.documentElement.style.setProperty('--pointer-y',pointer.y.toFixed(2)+'px');
    if(time>nextComet && weather.condition === 'clear'){
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
    setPaused(value){paused=value;if(paused){stop();musicEnergy=0;scene={...target,colors:target.colors.map(color=>[...color])};draw();}else schedule();},
    setCovered(value){covered=value;if(covered)stop();else schedule();},
    getState(){return {paused,covered,time,musicEnergy,stars:stars.length,condition:weather.condition,isDay:weather.isDay,daylight:scene.day,rain:scene.rain,snow:scene.snow,comet:comet?{progress:(time-comet.start)/comet.duration}:null,width:w,height:h,pointer:{x:pointer.x,y:pointer.y}};}
  };
  resize();schedule();
})();
