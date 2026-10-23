import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RefreshCw, X } from 'lucide-react';
import SingaporeMap from './Map';
import Chart from './Chart';
import { addDays, bandFor, fetchDay, fetchRange, invalidateDay, FIRST_DAY, METRICS, readingsFor, REGIONS, todaySgt } from './data';
import './style.css';
const today = todaySgt();
const startHour = Date.parse(`${FIRST_DAY}T00:00:00+08:00`);
const hourMs = 60 * 60_000;
const initialStart = addDays(today, -6) < FIRST_DAY ? FIRST_DAY : addDays(today, -6);
const fmtDate = (time) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time);
const sgtDay = (time) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
const emptyValues = () => ({ pm25: {}, psi: {} });
function App() {
  const [metric, setMetric] = useState('pm25');
  const [range, setRange] = useState('7');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [customStart, setCustomStart] = useState(initialStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [latestTime, setLatestTime] = useState(Date.parse(`${today}T00:00:00+08:00`));
  const [viewTime, setViewTime] = useState(null);
  const [dayItems, setDayItems] = useState({ pm25: [], psi: [] });
  const [mapLoading, setMapLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [failures, setFailures] = useState([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const time = viewTime ?? latestTime;
  const day = sgtDay(time);
  const bounds = useMemo(() => {
    if (range === 'month') return { start: `${month}-01` < FIRST_DAY ? FIRST_DAY : `${month}-01`, end: month === today.slice(0, 7) ? today : addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10), -1) };
    if (range === 'custom') return { start: customStart, end: customEnd };
    return { start: [FIRST_DAY, addDays(day, 1 - Number(range))].sort().at(-1), end: day };
  }, [range, month, customStart, customEnd, day]);
  const valid = bounds.start >= FIRST_DAY && bounds.start <= bounds.end && bounds.end <= today;
  useEffect(() => {
    const controller = new AbortController();
    setMapLoading(true);
    Promise.all([fetchDay('pm25', day, controller.signal), fetchDay('psi', day, controller.signal)])
      .then(([pm25, psi]) => { if (controller.signal.aborted) return; setDayItems({ pm25, psi }); if (day === today) { const stamps = [...pm25, ...psi].map((item) => Date.parse(item.timestamp)).filter(Number.isFinite); if (stamps.length) setLatestTime(Math.max(...stamps)); } })
      .catch(() => { if (!controller.signal.aborted) setDayItems({ pm25: [], psi: [] }); })
      .finally(() => { if (!controller.signal.aborted) setMapLoading(false); });
    return () => controller.abort();
  }, [day, retry]);
  useEffect(() => {
    if (!selected || !valid) return;
    const controller = new AbortController();
    setProgress({ done: 0, total: 0 }); setError(''); setFailures([]); setItems([]);
    fetchRange(metric, bounds.start, bounds.end, controller.signal, (done, total) => setProgress({ done, total }))
      .then(({ items: rows, failures: failed }) => { if (controller.signal.aborted) return; setItems(rows); setFailures(failed); setProgress(null); if (failed.length === (Math.round((Date.parse(bounds.end) - Date.parse(bounds.start)) / 86400000) + 1)) setError('NEA data is unavailable for this range. Try again.'); })
      .catch((cause) => { if (!controller.signal.aborted) { setError(cause.message || 'Could not load readings.'); setProgress(null); } });
    return () => controller.abort();
  }, [selected, metric, bounds.start, bounds.end, valid, retry]);
  const values = useMemo(() => {
    const next = emptyValues();
    for (const kind of ['pm25', 'psi']) for (const region of REGIONS) {
      const entries = readingsFor(dayItems[kind], kind, region);
      const current = entries.filter((entry) => entry.t <= time).at(-1);
      if (current && time - current.t < hourMs) next[kind][region] = current;
    }
    return next;
  }, [dayItems, time]);
  const points = useMemo(() => selected ? readingsFor(items, metric, selected) : [], [items, metric, selected]);
  function handleSlider(event) { setViewTime(startHour + Number(event.target.value) * hourMs); }
  const maxHours = Math.max(0, Math.floor((latestTime - startHour) / hourMs));
  const hourIndex = Math.min(maxHours, Math.max(0, Math.round((time - startHour) / hourMs)));
  return <main className={`page ${selected ? 'has-selection' : ''}`}>
    <header className="site-header"><h1 className="brand"><span className="brand-symbol"><i/><i/><i/></span>Singapore haze</h1><a href="https://guide.data.gov.sg/developer-guide/real-time-apis" target="_blank" rel="noreferrer" className="source-link">NEA data</a></header>
    <div className="workspace">
      <section className="map-panel" aria-label="Singapore air quality map">
        <div className="map-toolbar"><div className="metric-switch" role="group" aria-label="Map color scale"><button className={metric === 'pm25' ? 'active' : ''} onClick={() => setMetric('pm25')}>1h PM₂.₅</button><button className={metric === 'psi' ? 'active' : ''} onClick={() => setMetric('psi')}>24h PSI</button></div></div>
        <SingaporeMap selected={selected} onSelect={setSelected} metric={metric} values={values}/>
        <div className="time-control"><div className="time-heading"><time dateTime={new Date(time).toISOString()}>{fmtDate(time)} SGT</time><button onClick={() => setViewTime(null)} disabled={viewTime === null} className="latest-button">Latest</button></div><input className="time-slider" type="range" min="0" max={maxHours} step="1" value={hourIndex} onChange={handleSlider} aria-label="Map reading time"/><div className="time-ends"><span>1 Aug 2026</span><span>{mapLoading ? 'Loading…' : new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' }).format(latestTime)}</span></div></div>
      </section>
      {selected && <section className="detail-panel" aria-label={`${selected} region readings`}>
        <div className="detail-heading"><h2>{selected[0].toUpperCase() + selected.slice(1)}</h2><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close region details"><X size={19}/></button></div>
        <div className="current-readings">{['pm25','psi'].map((kind) => { const reading = values[kind][selected]; const band = Number.isFinite(reading?.value) ? bandFor(kind, reading.value) : null; return <div key={kind} className="current-reading"><span>{METRICS[kind].label}</span><strong>{Number.isFinite(reading?.value) ? reading.value : '—'}<small>{kind === 'pm25' ? ' µg/m³' : ''}</small></strong><em style={{ color: band?.color }}>{band?.label || 'No reading'}</em></div>; })}</div>
        <div className="detail-controls"><div className="range-buttons" role="group" aria-label="History date range">{[['7','7 days'],['15','15 days'],['30','30 days'],['month','Month'],['custom','Custom']].map(([key, label]) => <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{label}</button>)}</div>{range === 'month' && <label className="date-field">Month <input type="month" min="2026-08" max={today.slice(0,7)} value={month} onChange={(event) => setMonth(event.target.value)}/></label>}{range === 'custom' && <div className="custom-fields"><label className="date-field">From <input type="date" min={FIRST_DAY} max={today} value={customStart} onChange={(event) => setCustomStart(event.target.value)}/></label><label className="date-field">To <input type="date" min={FIRST_DAY} max={today} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)}/></label></div>}</div>
        <div className="chart-heading"><strong>{METRICS[metric].label}</strong><button className="icon-button" onClick={() => { invalidateDay('pm25', today); invalidateDay('psi', today); setRetry((n) => n + 1); }} aria-label="Reload readings"><RefreshCw size={16}/></button></div>
        <div className="chart-area">{!valid ? <p className="notice">Choose dates from 1 Aug 2026 through today, with the start before the end.</p> : progress ? <div className="loading-state">Loading {progress.done}/{progress.total || '…'} days</div> : error ? <p className="notice">{error}</p> : points.length ? <Chart points={points} metric={metric} start={bounds.start} end={bounds.end}/> : <p className="notice">No readings for this range.</p>}</div>
        <div className="chart-bottom"><span>{bounds.start} – {bounds.end}</span><span>{progress ? '' : `${points.length.toLocaleString()} readings`}</span></div>
        {failures.length > 0 && <p className="load-warning">{failures.length} day{failures.length === 1 ? '' : 's'} missing. Refresh to retry.</p>}
        <div className="band-legend" aria-label={`${METRICS[metric].label} bands`}>{METRICS[metric].bands.map((band, i) => <div key={band.label}><i style={{background:band.color}}/><span>{band.label}</span><small>{Number.isFinite(band.max) ? `${i === 0 ? 0 : METRICS[metric].bands[i - 1].max + 1}–${band.max}` : `≥${METRICS[metric].bands[i - 1].max + 1}`}</small></div>)}</div>
      </section>}
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
