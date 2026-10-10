(() => {
  'use strict';
  const tracks = [
    {
      title: 'Иисус', artist: 'NIGHTMARE`13',
      cover: 'assets/iisus-cover.jpg',
      src: 'assets/audio/iisus.mp3'
    },
    {
      title: 'XXX', artist: 'reStyle, Плага',
      cover: 'assets/xxx-cover.jpg',
      src: 'assets/audio/xxx.mp3'
    }
  ];
  const player = document.querySelector('.music-player');
  const audio = document.querySelector('#music-audio');
  if (!player || !audio) return;
  const play = player.querySelector('.music-play');
  const seek = player.querySelector('#music-seek');
  const time = player.querySelector('#music-time');
  const status = player.querySelector('#music-status');
  const cover = player.querySelector('#music-cover');
  const volume = player.querySelector('#music-volume');
  let selected = 0;
  // Each reload selects the other track, independently in each tab.
  try {
    const previous = sessionStorage.getItem('husky.music.last');
    if (previous !== null && Number.isInteger(Number(previous))) selected = (Number(previous) + 1) % tracks.length;
    if (selected < 0) selected = 0;
    sessionStorage.setItem('husky.music.last', String(selected));
  } catch { selected = Math.floor(Math.random() * tracks.length); }

  const track = tracks[selected];
  player.querySelector('#music-title').textContent = track.title;
  player.querySelector('#music-artist').textContent = track.artist;
  const number = player.querySelector('.music-number');
  number.textContent = `0${selected + 1} / 02`;
  number.setAttribute('aria-label', `Трек ${selected + 1} из 2`);
  cover.addEventListener('error', () => { cover.hidden = true; });
  cover.alt = `Обложка трека «${track.title}»`;
  cover.src = track.cover;
  audio.volume = .65;
  volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
  player.hidden = false;
  audio.src = track.src;

  let loadingTimer = 0, request = 0, wantsPlayback = false, failed = false;
  const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function setState(state) {
    player.dataset.state = state;
    const active = state === 'playing' || state === 'loading';
    play.setAttribute('aria-pressed', String(active));
    play.setAttribute('aria-label', active ? `Приостановить «${track.title}»` : `Воспроизвести «${track.title}»`);
    play.title = play.getAttribute('aria-label');
  }
  function updateTime() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = audio.currentTime || 0;
    seek.disabled = !duration;
    seek.value = duration ? current / duration * 100 : 0;
    seek.style.setProperty('--progress', `${seek.value}%`);
    seek.setAttribute('aria-valuetext', `${format(current)} из ${format(duration)}`);
    time.textContent = duration ? `${format(current)} / ${format(Math.round(duration))}` : '0:00';
  }
  function fail() {
    clearTimeout(loadingTimer);
    wantsPlayback = false;
    failed = true;
    request++;
    audio.pause();
    setState('error');
    status.textContent = 'Не удалось загрузить трек';
  }
  function waitForAudio() {
    if (!wantsPlayback) return;
    setState('loading');
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(fail, 12000);
  }
  play.addEventListener('click', async () => {
    if (wantsPlayback) {
      wantsPlayback = false;
      request++;
      clearTimeout(loadingTimer);
      audio.pause();
      setState('paused');
      return;
    }
    if (failed) { audio.load(); failed = false; }
    wantsPlayback = true;
    status.textContent = 'Husky / Плейлист';
    const thisRequest = ++request;
    waitForAudio();
    try {
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
      if (thisRequest === request && !wantsPlayback) audio.pause();
    } catch (error) {
      if (thisRequest === request && error.name !== 'AbortError') fail();
    }
  });
  audio.addEventListener('playing', () => {
    if (!wantsPlayback) { audio.pause(); return; }
    clearTimeout(loadingTimer);
    status.textContent = 'Husky / Плейлист';
    setState('playing');
  });
  audio.addEventListener('waiting', waitForAudio);
  audio.addEventListener('pause', () => {
    wantsPlayback = false;
    clearTimeout(loadingTimer);
    if (!failed) setState('paused');
  });
  audio.addEventListener('ended', () => {
    wantsPlayback = false;
    clearTimeout(loadingTimer);
    setState('paused');
    status.textContent = 'Слушать ещё раз';
  });
  audio.addEventListener('error', fail);
  audio.addEventListener('loadedmetadata', updateTime);
  audio.addEventListener('durationchange', updateTime);
  audio.addEventListener('timeupdate', updateTime);
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration;
    updateTime();
  });
  window.addEventListener('pagehide', () => {
    wantsPlayback = false;
    request++;
    clearTimeout(loadingTimer);
    audio.pause();
  });
  setState('paused');
})();
