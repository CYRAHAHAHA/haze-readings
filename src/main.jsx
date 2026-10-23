import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
import SingaporeMap from './Map';
import Chart from './Chart';
import { addDays, bandFor, dayRows, FIRST_DAY, latestTimestamp, METRICS, rangeRows, readingsFor, REGIONS } from './data';
import './style.css';
const latestTime = latestTimestamp();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(latestTime);
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
  const [viewTime, setViewTime] = useState(null);
  const time = viewTime ?? latestTime;
  const day = sgtDay(time);
  const bounds = useMemo(() => {
    if (range === 'month') return { start: `${month}-01` < FIRST_DAY ? FIRST_DAY : `${month}-01`, end: month === today.slice(0, 7) ? today : addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10), -1) };
    if (range === 'custom') return { start: customStart, end: customEnd };
    return { start: [FIRST_DAY, addDays(day, 1 - Number(range))].sort().at(-1), end: day };
  }, [range, month, customStart, customEnd, day]);
  const valid = bounds.start >= FIRST_DAY && bounds.start <= bounds.end && bounds.end <= today;
  const values = useMemo(() => {
    const next = emptyValues();
    for (const kind of ['pm25', 'psi']) for (const region of REGIONS) {
      const entries = readingsFor(dayRows(kind, day), kind, region);
      const current = entries.filter((entry) => entry.t <= time).at(-1);
      if (current && time - current.t < hourMs) next[kind][region] = current;
    }
    return next;
  }, [day, time]);
  const points = useMemo(() => selected && valid ? readingsFor(rangeRows(metric, bounds.start, bounds.end), metric, selected) : [], [selected, valid, metric, bounds.start, bounds.end]);
  function handleSlider(event) { setViewTime(startHour + Number(event.target.value) * hourMs); }
  const maxHours = Math.max(0, Math.floor((latestTime - startHour) / hourMs));
  const hourIndex = Math.min(maxHours, Math.max(0, Math.round((time - startHour) / hourMs)));
  return <main className={`page ${selected ? 'has-selection' : ''}`}>
    <header className="site-header"><h1 className="brand"><span className="brand-symbol"><i/><i/><i/></span>Singapore haze</h1><a href="https://guide.data.gov.sg/developer-guide/real-time-apis" target="_blank" rel="noreferrer" className="source-link">NEA data</a></header>
    <div className="workspace">
      <section className="map-panel" aria-label="Singapore air quality map">
        <div className="map-toolbar"><div className="metric-switch" role="group" aria-label="Map color scale"><button className={metric === 'pm25' ? 'active' : ''} onClick={() => setMetric('pm25')}>1h PM₂.₅</button><button className={metric === 'psi' ? 'active' : ''} onClick={() => setMetric('psi')}>24h PSI</button></div></div>
        <SingaporeMap selected={selected} onSelect={setSelected} metric={metric} values={values}/>
        <div className="time-control"><div className="time-heading"><time dateTime={new Date(time).toISOString()}>{fmtDate(time)} SGT</time><button onClick={() => setViewTime(null)} disabled={viewTime === null} className="latest-button">Latest</button></div><input className="time-slider" type="range" min="0" max={maxHours} step="1" value={hourIndex} onChange={handleSlider} aria-label="Map reading time"/><div className="time-ends"><span>1 Aug 2026</span><span>{new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' }).format(latestTime)}</span></div></div>
      </section>
      {selected && <section className="detail-panel" aria-label={`${selected} region readings`}>
        <div className="detail-heading"><h2>{selected[0].toUpperCase() + selected.slice(1)}</h2><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close region details"><X size={19}/></button></div>
        <div className="current-readings">{['pm25','psi'].map((kind) => { const reading = values[kind][selected]; const band = Number.isFinite(reading?.value) ? bandFor(kind, reading.value) : null; return <div key={kind} className="current-reading"><span>{METRICS[kind].label}</span><strong>{Number.isFinite(reading?.value) ? reading.value : '—'}<small>{kind === 'pm25' ? ' µg/m³' : ''}</small></strong><em style={{ color: band?.color }}>{band?.label || 'No reading'}</em></div>; })}</div>
        <div className="detail-controls"><div className="range-buttons" role="group" aria-label="History date range">{[['7','7 days'],['15','15 days'],['30','30 days'],['month','Month'],['custom','Custom']].map(([key, label]) => <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{label}</button>)}</div>{range === 'month' && <label className="date-field">Month <input type="month" min="2026-08" max={today.slice(0,7)} value={month} onChange={(event) => setMonth(event.target.value)}/></label>}{range === 'custom' && <div className="custom-fields"><label className="date-field">From <input type="date" min={FIRST_DAY} max={today} value={customStart} onChange={(event) => setCustomStart(event.target.value)}/></label><label className="date-field">To <input type="date" min={FIRST_DAY} max={today} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)}/></label></div>}</div>
        <div className="chart-heading"><strong>{METRICS[metric].label}</strong></div>
        <div className="chart-area">{!valid ? <p className="notice">Choose dates from 1 Aug 2026 through today, with the start before the end.</p> : points.length ? <Chart points={points} metric={metric} start={bounds.start} end={bounds.end}/> : <p className="notice">No readings for this range.</p>}</div>
        <div className="chart-bottom"><span>{bounds.start} – {bounds.end}</span><span>{`${points.length.toLocaleString()} readings`}</span></div>
        <div className="band-legend" aria-label={`${METRICS[metric].label} bands`}>{METRICS[metric].bands.map((band, i) => <div key={band.label}><i style={{background:band.color}}/><span>{band.label}</span><small>{Number.isFinite(band.max) ? `${i === 0 ? 0 : METRICS[metric].bands[i - 1].max + 1}–${band.max}` : `≥${METRICS[metric].bands[i - 1].max + 1}`}</small></div>)}</div>
      </section>}
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
