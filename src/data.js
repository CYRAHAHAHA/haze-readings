export const FIRST_DAY = '2026-08-01';
export const REGIONS = ['north', 'south', 'central', 'east', 'west'];
export const METRICS = {
  psi: { endpoint: 'psi', key: 'psi_twenty_four_hourly', label: '24-hour PSI', unit: 'PSI', bands: [
    { max: 50, label: 'Good', color: '#4e9b70' }, { max: 100, label: 'Moderate', color: '#e3b94c' },
    { max: 200, label: 'Unhealthy', color: '#dc8758' }, { max: 300, label: 'Very unhealthy', color: '#c85b5b' },
    { max: Infinity, label: 'Hazardous', color: '#7d5b85' },
  ] },
  pm25: { endpoint: 'pm25', key: 'pm25_one_hourly', label: '1-hour PM₂.₅', unit: 'µg/m³', bands: [
    { max: 55, label: 'Normal', color: '#4e9b70' }, { max: 150, label: 'Elevated', color: '#e3b94c' },
    { max: 250, label: 'High', color: '#dc8758' }, { max: Infinity, label: 'Very high', color: '#c85b5b' },
  ] },
};
export function bandFor(metric, value) { return METRICS[metric].bands.find((band) => value <= band.max); }
export function todaySgt() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function addDays(day, amount) { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
export function datesBetween(start, end) { const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d); return days; }
const memory = new Map();
let nextRequestAt = 0;
function pause(ms, signal) { return new Promise((resolve, reject) => { const done = () => { signal.removeEventListener('abort', abort); resolve(); }; const timer = setTimeout(done, ms); function abort() { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason || new Error('Cancelled')); } signal.addEventListener('abort', abort, { once: true }); }); }
async function pace(signal) { const wait = Math.max(0, nextRequestAt - Date.now()); nextRequestAt = Math.max(Date.now(), nextRequestAt) + 2100; if (wait) await pause(wait, signal); }
async function fetchPage(metric, day, token, signal) {
  const url = new URL(`https://api-open.data.gov.sg/v2/real-time/api/${METRICS[metric].endpoint}`);
  url.searchParams.set('date', day);
  if (token) url.searchParams.set('paginationToken', token);
  for (let attempt = 0; attempt < 5; attempt++) {
    await pace(signal);
    const response = await fetch(url, { signal });
    let body;
    try { body = await response.json(); } catch { body = null; }
    if (response.status === 429 || body?.code === 24) { await pause(11_000 * (attempt + 1), signal); continue; }
    if (!response.ok) throw new Error(`NEA data request failed (${response.status})`);
    if (body?.code !== 0 || !body.data) throw new Error(body?.errorMsg || 'NEA returned an unexpected response');
    return body.data;
  }
  throw new Error('NEA rate limit continued after retries');
}
export async function fetchDay(metric, day, signal) {
  const key = `${metric}:${day}`;
  if (memory.has(key)) return memory.get(key);
  try { const saved = JSON.parse(localStorage.getItem(`haze:${key}`)); if (saved && Date.now() - saved.savedAt < (day === todaySgt() ? 15 * 60_000 : 30 * 24 * 60 * 60_000)) { memory.set(key, saved.items); return saved.items; } } catch { /* storage unavailable */ }
  let token; const items = [];
  do {
    const data = await fetchPage(metric, day, token, signal);
    items.push(...(data.items || []));
    token = data.paginationToken || undefined;
  } while (token);
  memory.set(key, items);
  try { localStorage.setItem(`haze:${key}`, JSON.stringify({ savedAt: Date.now(), items })); } catch { /* storage unavailable */ }
  return items;
}
export async function fetchRange(metric, start, end, signal, onProgress) {
  const days = datesBetween(start, end);
  const results = new Array(days.length);
  const failures = [];
  let cursor = 0; let complete = 0;
  async function worker() {
    while (cursor < days.length) {
      const index = cursor++;
      try { results[index] = await fetchDay(metric, days[index], signal); }
      catch (error) { if (signal.aborted) throw error; failures.push(days[index]); results[index] = []; }
      onProgress?.(++complete, days.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, days.length) }, worker));
  return { items: results.flat(), failures };
}
export function readingsFor(items, metric, region) {
  const unique = new Map();
  for (const item of items) {
    const value = item.readings?.[METRICS[metric].key]?.[region];
    const stamp = Date.parse(item.timestamp);
    if (Number.isFinite(value) && Number.isFinite(stamp)) unique.set(stamp, { t: stamp, value });
  }
  return [...unique.values()].sort((a, b) => a.t - b.t);
}
