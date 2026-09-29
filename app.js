"use strict";

// Default location: Florida Atlantic University, Boca Raton, FL
const DEFAULT_PLACE = {
  name: "Boca Raton, FL",
  sub: "Florida Atlantic University",
  latitude: 26.3705,
  longitude: -80.1024,
};

const USER_NAME = "Autumn";
const REFRESH_MS = 10 * 60 * 1000;

// WMO weather codes -> [description, day icon, night icon]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️", "🌙"],
  1: ["Mainly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Depositing rime fog", "🌫️", "🌫️"],
  51: ["Light drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy drizzle", "🌧️", "🌧️"],
  56: ["Light freezing drizzle", "🌧️", "🌧️"],
  57: ["Freezing drizzle", "🌧️", "🌧️"],
  61: ["Light rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy rain", "🌧️", "🌧️"],
  66: ["Light freezing rain", "🌧️", "🌧️"],
  67: ["Freezing rain", "🌧️", "🌧️"],
  71: ["Light snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy snow", "❄️", "❄️"],
  77: ["Snow grains", "🌨️", "🌨️"],
  80: ["Light showers", "🌦️", "🌧️"],
  81: ["Showers", "🌧️", "🌧️"],
  82: ["Violent showers", "⛈️", "⛈️"],
  85: ["Snow showers", "🌨️", "🌨️"],
  86: ["Heavy snow showers", "❄️", "❄️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️", "⛈️"],
  99: ["Severe thunderstorm with hail", "⛈️", "⛈️"],
};

const $ = (id) => document.getElementById(id);

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};

const state = {
  place: loadPlace(),
  unit: storage.get("unit") === "celsius" ? "celsius" : "fahrenheit",
  data: null,
  refreshTimer: null,
  lastLoad: 0,
};

function loadPlace() {
  try {
    const p = JSON.parse(storage.get("place"));
    if (p && typeof p.latitude === "number" && typeof p.longitude === "number") return p;
  } catch { /* ignore */ }
  return DEFAULT_PLACE;
}

function describe(code, isDay = true) {
  const entry = WEATHER_CODES[code] || ["Unknown", "🌡️", "🌡️"];
  return { text: entry[0], icon: isDay ? entry[1] : entry[2] };
}

/* ---------- Theme ---------- */

function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme;
  storage.set("theme", choice);
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.themeChoice === choice));
  });
}

function initTheme() {
  const saved = storage.get("theme");
  applyTheme(saved === "light" || saved === "dark" ? saved : "system");
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => applyTheme(btn.dataset.themeChoice));
  });
}

/* ---------- Units ---------- */

function initUnits() {
  const sync = () => document.querySelectorAll("[data-unit]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.unit === state.unit));
  });
  sync();
  document.querySelectorAll("[data-unit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.unit === btn.dataset.unit) return;
      state.unit = btn.dataset.unit;
      storage.set("unit", state.unit);
      sync();
      loadWeather();
    });
  });
}

/* ---------- Greeting ---------- */

function renderGreeting() {
  const h = new Date().getHours();
  const part = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  $("greeting").textContent = `${part}, ${USER_NAME}! 👋`;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("greeting-sub").textContent = `Welcome to your weather app. It's ${date}. Go Owls! 🦉`;
}

/* ---------- Status ---------- */

function setStatus(msg, isError = false) {
  const el = $("status");
  el.textContent = msg || "";
  el.classList.toggle("error", isError);
}

/* ---------- Weather ---------- */

async function loadWeather() {
  const { latitude, longitude } = state.place;
  const imperial = state.unit === "fahrenheit";
  const params = new URLSearchParams({
    latitude, longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    temperature_unit: state.unit,
    wind_speed_unit: imperial ? "mph" : "kmh",
    precipitation_unit: imperial ? "inch" : "mm",
    timezone: "auto",
    forecast_days: "7",
  });

  setStatus("Loading live weather…");
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.reason || "Open-Meteo error");
    state.data = data;
    state.lastLoad = Date.now();
    render(data);
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus(`Couldn't load weather: ${err.message}. Retrying soon.`, true);
  }
  scheduleRefresh();
}

function scheduleRefresh() {
  clearTimeout(state.refreshTimer);
  state.refreshTimer = setTimeout(loadWeather, REFRESH_MS);
}

// Open-Meteo returns local times without an offset (timezone=auto). Parse them as
// wall-clock values and format in UTC so they display in the location's local time.
function parseLocal(iso) {
  const [d, t = "00:00"] = iso.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, day, hh, mm));
}
const fmtTime = (iso) => parseLocal(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const fmtHour = (iso) => parseLocal(iso).toLocaleTimeString(undefined, { hour: "numeric", timeZone: "UTC" });
const fmtDay = (iso) => parseLocal(iso).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv == null) return "--";
  const n = Math.round(uv);
  const label = n < 3 ? "Low" : n < 6 ? "Moderate" : n < 8 ? "High" : n < 11 ? "Very high" : "Extreme";
  return `${n} · ${label}`;
}

function render(data) {
  const c = data.current;
  const u = data.current_units;
  const d = data.daily;
  const isDay = c.is_day === 1;
  const info = describe(c.weather_code, isDay);
  const deg = "°";
  const round = (n) => Math.round(n);

  $("place-name").textContent = state.place.name;
  $("place-sub").textContent = state.place.sub || "";
  $("current-icon").textContent = info.icon;
  $("current-temp").textContent = `${round(c.temperature_2m)}${deg}`;
  $("current-desc").textContent = info.text;
  $("current-hilo").textContent = `H: ${round(d.temperature_2m_max[0])}${deg}  ·  L: ${round(d.temperature_2m_min[0])}${deg}`;

  $("stat-feels").textContent = `${round(c.apparent_temperature)}${deg}`;
  $("stat-humidity").textContent = `${c.relative_humidity_2m}%`;
  $("stat-wind").textContent = `${round(c.wind_speed_10m)} ${state.unit === "fahrenheit" ? "mph" : "km/h"} ${compass(c.wind_direction_10m)}`;
  $("stat-precip").textContent = `${c.precipitation} ${u.precipitation}`;
  $("stat-uv").textContent = uvLabel(d.uv_index_max[0]);
  $("stat-pressure").textContent = state.unit === "fahrenheit"
    ? `${(c.surface_pressure * 0.02953).toFixed(2)} inHg`
    : `${round(c.surface_pressure)} hPa`;
  $("stat-sunrise").textContent = fmtTime(d.sunrise[0]);
  $("stat-sunset").textContent = fmtTime(d.sunset[0]);
  $("updated").textContent = `Updated ${fmtTime(c.time)} local time · ${data.timezone_abbreviation || data.timezone}`;

  document.title = `${round(c.temperature_2m)}${deg} ${info.text} · ${state.place.name}`;

  renderHourly(data);
  renderDaily(data);
}

function renderHourly(data) {
  const h = data.hourly;
  // Find the current hour in the location's local time.
  const nowKey = data.current.time.slice(0, 13);
  let start = h.time.findIndex((t) => t.slice(0, 13) === nowKey);
  if (start < 0) start = 0;

  const frag = document.createDocumentFragment();
  for (let i = start; i < Math.min(start + 24, h.time.length); i++) {
    const info = describe(h.weather_code[i], h.is_day[i] === 1);
    const el = document.createElement("div");
    el.className = "hour";
    const pop = h.precipitation_probability[i];
    el.innerHTML = `
      <span class="muted small">${i === start ? "Now" : fmtHour(h.time[i])}</span>
      <span class="icon" title="${info.text}">${info.icon}</span>
      <span class="t">${Math.round(h.temperature_2m[i])}°</span>
      <span class="p">${pop ? `💧${pop}%` : ""}</span>`;
    frag.appendChild(el);
  }
  $("hourly").replaceChildren(frag);
}

function renderDaily(data) {
  const d = data.daily;
  const min = Math.min(...d.temperature_2m_min);
  const max = Math.max(...d.temperature_2m_max);
  const span = Math.max(max - min, 1);

  const frag = document.createDocumentFragment();
  d.time.forEach((t, i) => {
    const info = describe(d.weather_code[i], true);
    const lo = d.temperature_2m_min[i];
    const hi = d.temperature_2m_max[i];
    const left = ((lo - min) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    const pop = d.precipitation_probability_max[i];
    const li = document.createElement("li");
    li.className = "day";
    li.innerHTML = `
      <span class="name">${i === 0 ? "Today" : fmtDay(t)}${pop ? `<br><span class="rain">💧${pop}%</span>` : ""}</span>
      <span class="icon" title="${info.text}">${info.icon}</span>
      <span class="lo">${Math.round(lo)}°</span>
      <span class="range" aria-hidden="true"><span style="left:${left}%;width:${Math.max(width, 3)}%"></span></span>
      <span class="hi">${Math.round(hi)}°</span>`;
    frag.appendChild(li);
  });
  $("daily").replaceChildren(frag);
}

/* ---------- Location ---------- */

function setPlace(place) {
  state.place = place;
  storage.set("place", JSON.stringify(place));
  loadWeather();
}

function initSearch() {
  const form = $("search-form");
  const input = $("search-input");
  const list = $("search-results");

  const hide = () => { list.hidden = true; list.replaceChildren(); };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    setStatus(`Searching for “${q}”…`);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: q, count: "6", language: "en", format: "json" })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding returned ${res.status}`);
      const { results = [] } = await res.json();
      if (!results.length) { setStatus(`No places found for “${q}”.`, true); hide(); return; }
      setStatus("");
      list.replaceChildren(...results.map((r) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        const region = [r.admin1, r.country].filter(Boolean).join(", ");
        btn.textContent = `${r.name}${region ? " — " + region : ""}`;
        btn.addEventListener("click", () => {
          hide();
          input.value = "";
          setPlace({
            name: r.admin1 && r.country_code === "US" ? `${r.name}, ${stateAbbr(r.admin1)}` : r.name,
            sub: region,
            latitude: r.latitude,
            longitude: r.longitude,
          });
        });
        li.appendChild(btn);
        return li;
      }));
      list.hidden = false;
      list.querySelector("button")?.focus();
    } catch (err) {
      setStatus(`Search failed: ${err.message}`, true);
    }
  });

  document.addEventListener("click", (e) => { if (!form.contains(e.target)) hide(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });

  $("home-btn").addEventListener("click", () => setPlace(DEFAULT_PLACE));

  $("locate-btn").addEventListener("click", () => {
    if (!navigator.geolocation) { setStatus("Geolocation isn't supported in this browser.", true); return; }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace({
        name: "My location",
        sub: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      (err) => setStatus(`Couldn't get your location: ${err.message}`, true),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  });
}

const US_STATES = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC",
};
const stateAbbr = (name) => US_STATES[name] || name;

/* ---------- Boot ---------- */

initTheme();
initUnits();
renderGreeting();
initSearch();
loadWeather();

// Refresh when the tab becomes visible again after being in the background.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    renderGreeting();
    if (Date.now() - state.lastLoad > 60000) loadWeather();
  }
});
