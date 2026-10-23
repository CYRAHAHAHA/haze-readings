import archive from './readings.json';

export const FIRST_DAY = '2026-08-01';
export const REGIONS = ['north', 'south', 'central', 'east', 'west'];
export const METRICS = {
  psi: { label: '24-hour PSI', unit: 'PSI', bands: [
    { max: 50, label: 'Good', color: '#4e9b70' }, { max: 100, label: 'Moderate', color: '#e3b94c' },
    { max: 200, label: 'Unhealthy', color: '#dc8758' }, { max: 300, label: 'Very unhealthy', color: '#c85b5b' },
    { max: Infinity, label: 'Hazardous', color: '#7d5b85' },
  ] },
  pm25: { label: '1-hour PM₂.₅', unit: 'µg/m³', bands: [
    { max: 55, label: 'Normal', color: '#4e9b70' }, { max: 150, label: 'Elevated', color: '#e3b94c' },
    { max: 250, label: 'High', color: '#dc8758' }, { max: Infinity, label: 'Very high', color: '#c85b5b' },
  ] },
};
export function bandFor(metric, value) { return METRICS[metric].bands.find((band) => value <= band.max); }
export function addDays(day, amount) { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + amount); return date.toISOString().slice(0, 10); }
export function datesBetween(start, end) { const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d); return days; }
export function latestTimestamp() {
  let latest = Date.parse(`${FIRST_DAY}T00:00:00+08:00`);
  for (const day of Object.values(archive.days)) for (const kind of ['pm25', 'psi']) for (const row of day[kind] || []) latest = Math.max(latest, Date.parse(row[0]));
  return latest;
}
export function dayRows(metric, day) { return archive.days[day]?.[metric] || []; }
export function rangeRows(metric, start, end) { return datesBetween(start, end).flatMap((day) => dayRows(metric, day)); }
export function readingsFor(rows, metric, region) {
  const index = REGIONS.indexOf(region) + 1;
  return rows.map((row) => ({ t: Date.parse(row[0]), value: row[index] }))
    .filter(({ t, value }) => Number.isFinite(t) && Number.isFinite(value));
}
