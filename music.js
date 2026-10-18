(() => {
  'use strict';
  const tracks = [
    { title: 'Иисус', artist: 'NIGHTMARE`13', file: 'iisus', cover: 'iisus-cover.jpg' },
    { title: 'XXX', artist: 'reStyle, Плага', file: 'xxx', cover: 'xxx-cover.jpg' },
    { title: 'Адидас, мескалин', artist: 'GSPD', file: 'adidas-meskalin' },
    { title: 'Всего лишь друг', artist: 'DEAD BLONDE', file: 'vsego-lish-drug' },
    { title: 'Переходный возраст', artist: 'GSPD', file: 'perehodnyy-vozrast' },
    { title: 'Лобовое', artist: 'ФИРС', file: 'lobovoe' },
    { title: 'Режим облавы', artist: 'DEAD BLONDE', file: 'rezhim-oblavy' },
    { title: 'ствол', artist: 'полматери · ИИ-кавер', file: 'stvol' },
    { title: 'я люблю тебя давно, это грустно и смешно', artist: 'emoslut666 · speed up', file: 'ya-lyublyu-tebya' },
    { title: 'Тебе сегодня можно взрослой быть', artist: 'GSPD, Little_emptiness · Slowed', file: 'tebe-segodnya-mozhno' }
  ];
  const player = document.querySelector('.music-player');
  const audio = document.querySelector('#music-audio');
  if (!player || !audio) return;
  const find = selector => player.querySelector(selector);
  const play = find('.music-play'), seek = find('#music-seek'), time = find('#music-time');
  const status = find('#music-status'), cover = find('#music-cover'), volume = find('#music-volume');
  const list = find('#music-playlist'), listToggle = find('.music-list-toggle');
  let selected = 0, request = 0, loadingTimer = 0, wantsPlayback = false, failed = false;
  let context, analyser, source, frequencies;
  const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const number = value => String(value).padStart(2, '0');

  // One audio element and one audio graph for the whole playlist. Created only by a play gesture.
  function prepareAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!context) {
        context = new AudioContext();
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = .82;
        frequencies = new Uint8Array(analyser.frequencyBinCount);
        source = context.createMediaElementSource(audio);
        source.connect(context.destination);
        source.connect(analyser);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Native playback remains available if Web Audio is unsupported. */ }
  }
  window.huskyMusic = {
    sample() {
      if (!analyser || !context || context.state !== 'running' || audio.paused || audio.ended || !wantsPlayback) return 0;
      analyser.getByteFrequencyData(frequencies);
      let sum = 0;
      for (let i = 2; i < 40; i++) sum += frequencies[i];
      return Math.min(1, sum / (38 * 210)) * audio.volume;
    }
  };
  function setState(state) {
    player.dataset.state = state;
    const active = state === 'playing' || state === 'loading';
    play.setAttribute('aria-pressed', String(active));
    play.setAttribute('aria-label', `${active ? 'Приостановить' : 'Воспроизвести'} «${tracks[selected].title}»`);
    play.title = play.getAttribute('aria-label');
  }
  function updateTime() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = audio.currentTime || 0;
    seek.disabled = !duration;
    seek.value = duration ? current / duration * 100 : 0;
    seek.style.setProperty('--progress', `${seek.value}%`);
    seek.setAttribute('aria-valuetext', `${format(current)} из ${format(duration)}`);
    time.textContent = duration ? `${format(current)} / ${format(duration)}` : '0:00';
  }
  function fail() {
    clearTimeout(loadingTimer);
    wantsPlayback = false;
    failed = true;
    request++;
    audio.pause();
    setState('error');
    status.textContent = 'Не загрузилось · нажми ▶ ещё раз';
  }
  function waiting() {
    if (!wantsPlayback) return;
    setState('loading');
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(fail, 15000);
  }
  async function start() {
    prepareAudio();
    if (failed) { audio.load(); failed = false; }
    wantsPlayback = true;
    const token = ++request;
    status.textContent = 'Загружаем трек…';
    waiting();
    try {
      if (audio.ended) audio.currentTime = 0;
      await audio.play();
      if (token === request && !wantsPlayback) audio.pause();
    } catch (error) {
      if (token === request && error.name !== 'AbortError') fail();
    }
  }
  function pause() {
    wantsPlayback = false;
    request++;
    clearTimeout(loadingTimer);
    audio.pause();
    setState('paused');
    status.textContent = 'Husky / Плейлист';
  }
  function select(index, continuePlaying = wantsPlayback) {
    request++;
    wantsPlayback = false;
    clearTimeout(loadingTimer);
    audio.pause();
    selected = (index + tracks.length) % tracks.length;
    const track = tracks[selected];
    failed = false;
    find('#music-title').textContent = track.title;
    find('#music-title').title = track.title;
    find('#music-artist').textContent = track.artist;
    find('#music-artist').title = track.artist;
    find('.music-number').textContent = `${number(selected + 1)} / ${number(tracks.length)}`;
    find('.music-number').setAttribute('aria-label', `Трек ${selected + 1} из ${tracks.length}`);
    cover.hidden = !track.cover;
    if (track.cover) { cover.src = `assets/${track.cover}`; cover.alt = `Обложка трека «${track.title}»`; }
    else { cover.removeAttribute('src'); cover.alt = ''; }
    find('.music-artwork-fallback span').textContent = track.artist[0].toUpperCase();
    audio.src = `assets/audio/${track.file}.mp3`;
    // preload=none avoids downloading tracks that the visitor only browses through.
    setState('paused');
    seek.disabled = true;
    seek.value = 0;
    seek.style.setProperty('--progress', '0%');
    time.textContent = '0:00';
    status.textContent = 'Husky / Плейлист';
    [...list.querySelectorAll('button')].forEach((button, i) => {
      button.setAttribute('aria-current', String(i === selected));
    });
    try { sessionStorage.setItem('husky.music.last', String(selected)); } catch { /* optional */ }
    if (continuePlaying) start();
  }
  tracks.forEach((track, i) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const index = document.createElement('span');
    index.className = 'playlist-index';
    index.textContent = number(i + 1);
    const description = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = track.title;
    const artist = document.createElement('small');
    artist.textContent = track.artist;
    description.append(title, artist);
    button.append(index, description);
    button.addEventListener('click', () => select(i));
    li.append(button);
    list.append(li);
  });
  listToggle.addEventListener('click', () => {
    list.hidden = !list.hidden;
    listToggle.setAttribute('aria-expanded', String(!list.hidden));
    listToggle.setAttribute('aria-label', list.hidden ? 'Открыть плейлист' : 'Скрыть плейлист');
    if (!list.hidden) list.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  });
  play.addEventListener('click', () => wantsPlayback ? pause() : start());
  find('.music-prev').addEventListener('click', () => select(selected - 1));
  find('.music-next').addEventListener('click', () => select(selected + 1));
  cover.addEventListener('error', () => { cover.hidden = true; });
  audio.volume = .65;
  volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
  audio.addEventListener('playing', () => {
    if (!wantsPlayback) { audio.pause(); return; }
    clearTimeout(loadingTimer);
    setState('playing');
    status.textContent = 'Сейчас играет';
  });
  audio.addEventListener('waiting', waiting);
  audio.addEventListener('pause', () => {
    // Old pause events from src changes must not cancel a new play request.
    if (!audio.paused || wantsPlayback && audio.readyState === 0) return;
    if (audio.ended) return;
    if (wantsPlayback && player.dataset.state === 'playing') pause();
  });
  audio.addEventListener('ended', () => select(selected + 1, true));
  audio.addEventListener('error', () => { if (audio.error) fail(); });
  ['loadedmetadata', 'durationchange', 'timeupdate'].forEach(event => audio.addEventListener(event, updateTime));
  seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration;
    updateTime();
  });
  window.addEventListener('pagehide', pause);
  try {
    const previous = sessionStorage.getItem('husky.music.last');
    if (previous !== null && Number.isInteger(Number(previous))) selected = (Number(previous) + 1 + tracks.length) % tracks.length;
  } catch { selected = Math.floor(Math.random() * tracks.length); }
  select(selected, false);
  player.hidden = false;
})();
