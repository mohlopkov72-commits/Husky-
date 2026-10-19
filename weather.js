(() => {
  'use strict';
  const cacheKey = 'husky-weather-v1';
  const refreshInterval = 15 * 60 * 1000;
  const cacheLifetime = 3 * 60 * 60 * 1000;
  const conditions = new Set(['clear','clouds','rain','snow','fog','storm']);
  let state = {isDay:isLocalDay(),condition:'clear',temperature:null,city:'',timeZone:'',updatedAt:0,source:'fallback'};
  let location = null, pending = false, lastAttempt = 0;

  function isLocalDay() { const hour = new Date().getHours(); return hour >= 6 && hour < 20; }
  function conditionFor(code) {
    if (code === 0) return 'clear';
    if (code <= 3) return 'clouds';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }
  function wttrCondition(code) {
    if (code === 113) return 'clear';
    if ([116,119,122].includes(code)) return 'clouds';
    if ([143,248,260].includes(code)) return 'fog';
    if ([200,386,389,392,395].includes(code)) return 'storm';
    if ([179,182,185,227,230,281,284,311,314,317,320,323,326,329,332,335,338,350,362,365,368,371,374,377].includes(code)) return 'snow';
    return 'rain';
  }
  function validLocation(value) {
    return value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
  }
  function publish() {
    if (state.source === 'live' && validLocation(location)) {
      try { localStorage.setItem(cacheKey,JSON.stringify({...state,location})); } catch {}
    }
    document.documentElement.dataset.sky = state.isDay ? 'day' : 'night';
    document.documentElement.dataset.weather = state.condition;
    window.dispatchEvent(new CustomEvent('husky:weather', {detail:{...state}}));
  }
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    const age = Date.now() - cached?.updatedAt;
    if (cached && age >= 0 && age < cacheLifetime && typeof cached.isDay === 'boolean' && conditions.has(cached.condition) && (cached.temperature === null || Number.isFinite(cached.temperature)) && validLocation(cached.location)) {
      state = {...state,...cached,source:'cache'};
      location = cached.location;
    }
  } catch {}

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(url, {signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error('Weather service unavailable');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }
  async function refresh() {
    if (pending) return;
    pending = true;
    lastAttempt = Date.now();
    try {
      if (!location) {
        const data = await fetchJSON('https://wttr.in/?format=j1');
        const area = data.nearest_area?.[0];
        const candidate = {latitude:Number(area?.latitude),longitude:Number(area?.longitude),city:typeof area?.areaName?.[0]?.value === 'string' ? area.areaName[0].value : '',timeZone:''};
        if (!validLocation(candidate)) throw new Error('Location unavailable');
        location = candidate;
        const current = data.current_condition?.[0];
        const code = Number(current?.weatherCode), temperature = Number(current?.temp_C);
        if (Number.isFinite(code) && Number.isFinite(temperature)) {
          state = {isDay:!current.weatherIconUrl?.[0]?.value?.includes('night'),condition:wttrCondition(code),temperature,city:location.city,timeZone:'',updatedAt:Date.now(),source:'live'};
          publish();
        }
      }
      const query = new URLSearchParams({latitude:location.latitude.toFixed(2),longitude:location.longitude.toFixed(2),current:'weather_code,is_day,temperature_2m',timezone:'auto'});
      const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${query}`);
      const current = data.current;
      if (!current || !Number.isInteger(current.weather_code) || current.weather_code < 0 || current.weather_code > 99 || ![0,1].includes(current.is_day) || !Number.isFinite(current.temperature_2m)) throw new Error('Invalid weather');
      state = {isDay:current.is_day === 1,condition:conditionFor(current.weather_code),temperature:current.temperature_2m,city:location.city,timeZone:data.timezone || location.timeZone,updatedAt:Date.now(),source:'live'};
      publish();
    } catch {
      if (state.source === 'fallback') { state.isDay = isLocalDay(); publish(); }
    } finally { pending = false; }
  }
  function refreshIfNeeded() {
    if (document.hidden) return;
    if (state.source === 'fallback') { state.isDay = isLocalDay(); publish(); }
    if (Date.now() - Math.max(lastAttempt,state.updatedAt) >= refreshInterval) refresh();
  }
  window.huskyWeather = {getState:() => ({...state})};
  publish();
  if (Date.now() - state.updatedAt >= refreshInterval) refresh();
  setInterval(refreshIfNeeded,60000);
  document.addEventListener('visibilitychange',refreshIfNeeded);
  window.addEventListener('online',() => { if (Date.now() - lastAttempt >= 30000) refresh(); });
})();
