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
const stepMs = 15 * 60_000;
const initialStart = addDays(today, -6) < FIRST_DAY ? FIRST_DAY : addDays(today, -6);
const fmtDate = (time) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(time);
const sgtDay = (time) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(time);
const emptyValues = () => ({ pm25: {}, psi: {} });
const shortRanges = [['3h','Past 3h',3],['12h','Past 12h',12],['1d','Past 1d',24],['3d','Past 3d',72]];
function App() {
  const [metric, setMetric] = useState('pm25');
  const [range, setRange] = useState('7');
  const [quickRange, setQuickRange] = useState('1d');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [customStart, setCustomStart] = useState(initialStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [selected, setSelected] = useState(null);
  const [viewTime, setViewTime] = useState(null);
  const time = viewTime ?? latestTime;
  const day = sgtDay(time);
  const bounds = useMemo(() => {
    const quickHours = shortRanges.find(([key]) => key === quickRange)?.[2];
    if (quickHours) {
      const startDay = sgtDay(time - quickHours * hourMs);
      return { start: startDay < FIRST_DAY ? FIRST_DAY : startDay, end: day };
    }
    if (range === 'month') return { start: `${month}-01` < FIRST_DAY ? FIRST_DAY : `${month}-01`, end: month === today.slice(0, 7) ? today : addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 10), -1) };
    if (range === 'custom') return { start: customStart, end: customEnd };
    return { start: [FIRST_DAY, addDays(day, 1 - Number(range))].sort().at(-1), end: day };
  }, [range, month, customStart, customEnd, day, quickRange, time]);
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
  const quickHours = shortRanges.find(([key]) => key === quickRange)?.[2];
  const quickStart = quickHours ? Math.max(startHour, time - quickHours * hourMs) : null;
  const points = useMemo(() => {
    if (!selected || !valid) return [];
    const rows = readingsFor(rangeRows(metric, bounds.start, bounds.end), metric, selected);
    return quickHours ? rows.filter((point) => point.t >= quickStart && point.t <= time) : rows;
  }, [selected, valid, metric, bounds.start, bounds.end, quickHours, quickStart, time]);
  function handleDateSlider(event) {
    const dateStart = startHour + Number(event.target.value) * 24 * hourMs;
    const currentMinute = Math.floor((time - (startHour + Math.floor((time - startHour) / (24 * hourMs)) * 24 * hourMs)) / stepMs) * stepMs;
    setViewTime(Math.min(latestTime, dateStart + currentMinute));
  }
  function handleTimeSlider(event) {
    const dayStart = startHour + Math.floor((time - startHour) / (24 * hourMs)) * 24 * hourMs;
    setViewTime(Math.min(latestTime, dayStart + Number(event.target.value) * stepMs));
  }
  const maxDays = Math.max(0, Math.floor((latestTime - startHour) / (24 * hourMs)));
  const dayIndex = Math.min(maxDays, Math.max(0, Math.floor((time - startHour) / (24 * hourMs))));
  const dayStart = startHour + dayIndex * 24 * hourMs;
  const maxQuarterHours = Math.min(95, Math.floor((latestTime - dayStart) / stepMs));
  const quarterHourIndex = Math.min(maxQuarterHours, Math.max(0, Math.floor((time - dayStart) / stepMs)));
  function chooseQuickRange(key) {
    setQuickRange(key);
  }
  return <main className={`page ${selected ? 'has-selection' : ''}`}>
    <header className="site-header"><h1 className="brand"><span className="brand-symbol"><i/><i/><i/></span>Singapore haze</h1><a href="https://guide.data.gov.sg/developer-guide/real-time-apis" target="_blank" rel="noreferrer" className="source-link">NEA data</a></header>
    <div className="workspace">
      <section className="map-panel" aria-label="Singapore air quality map">
        <div className="map-toolbar"><div className="metric-switch" role="group" aria-label="Map color scale"><button className={metric === 'pm25' ? 'active' : ''} onClick={() => setMetric('pm25')}>1h PM₂.₅</button><button className={metric === 'psi' ? 'active' : ''} onClick={() => setMetric('psi')}>24h PSI</button></div></div>
        <SingaporeMap selected={selected} onSelect={setSelected} metric={metric} values={values}/>
        <div className="time-control"><div className="time-heading"><time dateTime={new Date(time).toISOString()}>{fmtDate(time)} SGT</time><button onClick={() => setViewTime(null)} disabled={viewTime === null} className="latest-button">Latest</button></div><label className="slider-label" htmlFor="date-slider">Date</label><input id="date-slider" className="time-slider date-slider" type="range" min="0" max={maxDays} step="1" value={dayIndex} onChange={handleDateSlider} aria-label="Map reading date"/><div className="time-ends"><span>1 Aug 2026</span><span>{new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' }).format(latestTime)}</span></div><label className="slider-label time-label" htmlFor="time-slider">Time · 15 min</label><input id="time-slider" className="time-slider" type="range" min="0" max={maxQuarterHours} step="1" value={quarterHourIndex} onChange={handleTimeSlider} aria-label="Map reading time in 15-minute intervals"/><div className="time-ends"><span>12:00 am</span><span>11:45 pm</span></div></div>
      </section>
      {selected && <section className="detail-panel" aria-label={`${selected} region readings`}>
        <div className="detail-heading"><h2>{selected[0].toUpperCase() + selected.slice(1)}</h2><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close region details"><X size={19}/></button></div>
        <div className="current-readings">{['pm25','psi'].map((kind) => { const reading = values[kind][selected]; const band = Number.isFinite(reading?.value) ? bandFor(kind, reading.value) : null; return <div key={kind} className="current-reading"><span>{METRICS[kind].label}</span><strong>{Number.isFinite(reading?.value) ? reading.value : '—'}<small>{kind === 'pm25' ? ' µg/m³' : ''}</small></strong><em style={{ color: band?.color }}>{band?.label || 'No reading'}</em></div>; })}</div>
        <div className="detail-controls"><div className="preset-row"><span>Recent</span><div className="range-buttons" role="group" aria-label="Recent history range">{shortRanges.map(([key,label]) => <button key={key} className={quickRange === key ? 'active' : ''} onClick={() => chooseQuickRange(key)}>{label}</button>)}</div></div><div className="preset-row"><span>Longer</span><div className="range-buttons" role="group" aria-label="Long history range">{[['7','7d'],['15','15d'],['30','30d'],['month','Month'],['custom','Custom']].map(([key, label]) => <button key={key} className={range === key && !shortRanges.some(([quick]) => quick === quickRange) ? 'active' : ''} onClick={() => {setRange(key);setQuickRange('')}}>{label}</button>)}</div></div>{range === 'month' && <label className="date-field">Month <input type="month" min="2026-08" max={today.slice(0,7)} value={month} onChange={(event) => setMonth(event.target.value)}/></label>}{range === 'custom' && !shortRanges.some(([quick]) => quick === quickRange) && <div className="custom-fields"><label className="date-field">From <input type="date" min={FIRST_DAY} max={today} value={customStart} onChange={(event) => setCustomStart(event.target.value)}/></label><label className="date-field">To <input type="date" min={FIRST_DAY} max={today} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)}/></label></div>}</div>
        <div className="chart-heading"><strong>{METRICS[metric].label}</strong></div>
        <div className="chart-area">{!valid ? <p className="notice">Choose dates from 1 Aug 2026 through today, with the start before the end.</p> : points.length ? <Chart points={points} metric={metric} start={quickHours ? new Date(quickStart).toISOString() : bounds.start} end={quickHours ? new Date(time).toISOString() : bounds.end}/> : <p className="notice">No readings for this range.</p>}</div>
        <div className="chart-bottom"><span>{quickHours ? `${fmtDate(quickStart)} – ${fmtDate(time)} SGT` : `${bounds.start} – ${bounds.end}`}</span><span>{`${points.length.toLocaleString()} readings`}</span></div>
      </section>}
    </div>
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
