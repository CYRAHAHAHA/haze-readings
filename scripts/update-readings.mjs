import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const file = resolve('src/readings.json');
const firstDay = '2026-08-01';
const kinds = ['pm25', 'psi'];
const keys = { pm25: 'pm25_one_hourly', psi: 'psi_twenty_four_hourly' };
const regions = ['north', 'south', 'central', 'east', 'west'];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const endDay = process.env.HAZE_END_DATE || today;
const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextDay = (day) => new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
let archive;
try { archive = JSON.parse(await readFile(file, 'utf8')); }
catch { archive = { schema: 1, firstDay, regions, days: {} }; }
archive.days ||= {};

async function request(kind, day, token) {
  const url = new URL(`https://api-open.data.gov.sg/v2/real-time/api/${kind}`);
  url.searchParams.set('date', day);
  if (token) url.searchParams.set('paginationToken', token);
  for (let attempt = 0; attempt < 7; attempt++) {
    let response;
    try { response = await fetch(url, { headers: { accept: 'application/json' } }); }
    catch (error) {
      if (attempt === 6) throw new Error(`${kind} ${day}: ${error.message}`);
      await sleep(11000 * (attempt + 1));
      continue;
    }
    const body = await response.json().catch(() => null);
    if (response.status === 429 || response.status >= 500 || body?.code === 24) {
      await sleep(11000 * (attempt + 1));
      continue;
    }
    if (!response.ok || body?.code !== 0 || !body.data) throw new Error(`${kind} ${day}: HTTP ${response.status}, ${body?.errorMsg || 'unexpected response'}`);
    return body.data;
  }
  throw new Error(`${kind} ${day}: requests failed after retries`);
}

async function fetchDay(kind, day) {
  const rows = [];
  let token;
  do {
    const data = await request(kind, day, token);
    for (const item of data.items || []) {
      const values = item.readings?.[keys[kind]];
      if (item.timestamp && values) rows.push([item.timestamp, ...regions.map((region) => Number.isFinite(values[region]) ? values[region] : null)]);
    }
    token = data.paginationToken || undefined;
    if (token) await sleep(2100);
  } while (token);
  return [...new Map(rows.map((row) => [row[0], row])).values()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function save() {
  archive.updatedAt = new Date().toISOString();
  const sorted = Object.fromEntries(Object.entries(archive.days).sort(([a], [b]) => a.localeCompare(b)));
  const temp = `${file}.tmp`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(temp, JSON.stringify({ ...archive, days: sorted }));
  await rename(temp, file);
}

let fetched = 0;
let changed = 0;
for (let day = firstDay; day <= endDay; day = nextDay(day)) {
  archive.days[day] ||= {};
  for (const kind of kinds) {
    const existing = archive.days[day][kind];
    if (Array.isArray(existing) && existing.length && day < yesterday) continue;
    await sleep(2100);
    const rows = await fetchDay(kind, day);
    fetched++;
    if (JSON.stringify(existing) !== JSON.stringify(rows)) {
      archive.days[day][kind] = rows;
      changed++;
    }
    console.log(`${day} ${kind}: ${rows.length} readings`);
  }
  if (changed) await save();
}
console.log(`Checked ${fetched} daily series; updated ${changed} in ${file}`);
