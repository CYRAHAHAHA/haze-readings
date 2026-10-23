import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowUpRight, RefreshCw } from 'lucide-react';
import SingaporeMap from './Map';
import Chart from './Chart';
import { addDays, bandFor, fetchRange, FIRST_DAY, METRICS, readingsFor, REGIONS, todaySgt } from './data';
import './style.css';
const today = todaySgt();
const initialStart = addDays(today, -6) < FIRST_DAY ? FIRST_DAY : addDays(today, -6);
function App() {
  const [metric, setMetric] = useState('pm25');
  const [range, setRange] = useState('7');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [customStart, setCustomStart] = useState(initialStart);
  const [customEnd, setCustomEnd] = useState(today);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState([]);
  const [latest, setLatest] = useState({});
  const [progress, setProgress] = useState(null);
  const [failures, setFailures] = useState([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const chartRef = useRef(null);
  const bounds = useMemo(() => {
    if (range === 'month') return { start: `${month}-01` < FIRST_DAY ? FIRST_DAY : `${month}-01`, end: new Date(`${month}-01T00:00:00Z`).toISOString().slice(0, 7) === today.slice(0, 7) ? today : addDays(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0,10), -1) };
    if (range === 'custom') return { start: customStart, end: customEnd };
    return { start: [FIRST_DAY, addDays(today, 1-Number(range))].sort().at(-1), end: today };
  }, [range, month, customStart, customEnd]);
  const valid = bounds.start >= FIRST_DAY && bounds.start <= bounds.end && bounds.end <= today;
  useEffect(() => {
    const controller = new AbortController();
    fetchRange(metric, today, today, controller.signal).then(({ items: rows }) => {
      const values = {}; for (const region of REGIONS) values[region] = readingsFor(rows, metric, region).at(-1); setLatest(values);
    }).catch(() => setLatest({}));
    return () => controller.abort();
  }, [metric, retry]);
  useEffect(() => {
    if (!selected || !valid) return;
    const controller = new AbortController();
    setProgress({ done: 0, total: 0 }); setError(''); setFailures([]); setItems([]);
    fetchRange(metric, bounds.start, bounds.end, controller.signal, (done, total) => setProgress({ done, total }))
      .then(({ items: rows, failures: failed }) => { if (controller.signal.aborted) return; setItems(rows); setFailures(failed); setProgress(null); if (failed.length === (Math.round((Date.parse(bounds.end)-Date.parse(bounds.start))/86400000)+1)) setError('Unable to retrieve this date range from NEA. Please retry.'); })
      .catch((cause) => { if (!controller.signal.aborted) { setError(cause.message || 'Could not load readings.'); setProgress(null); } });
    return () => controller.abort();
  }, [selected, metric, bounds.start, bounds.end, valid, retry]);
  const points = useMemo(() => selected ? readingsFor(items, metric, selected) : [], [items, metric, selected]);
  const shown = selected ? latest[selected] : null;
  const status = shown ? bandFor(metric, shown.value) : null;
  function chooseRegion(region) { setSelected(region); window.setTimeout(() => chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40); }
  return <main className="page">
    <header className="site-header"><a className="brand" href="#home"><span className="brand-symbol"><i/><i/><i/></span> Singapore Haze Readings</a><a className="source-link" href="https://www.haze.gov.sg/" target="_blank" rel="noreferrer">NEA Haze <ArrowUpRight size={15}/></a></header>
    <section className="hero" id="home"><div className="hero-top"><div><h1>How’s the haze<br/>across Singapore?</h1><p>Explore official air quality readings for five regions, from 1 August 2026.</p></div><div className="hero-actions"><span>Viewing current</span><div className="metric-switch" role="group" aria-label="Reading type"><button className={metric === 'pm25' ? 'active' : ''} onClick={() => setMetric('pm25')}>1-hour PM₂.₅</button><button className={metric === 'psi' ? 'active' : ''} onClick={() => setMetric('psi')}>24-hour PSI</button></div></div></div>
      <SingaporeMap selected={selected} onSelect={chooseRegion} metric={metric} latest={latest}/>
      <div className="map-under"><span><span className="live-dot"/> Latest published regional reading</span><span>Tap a region to see its timeline <ArrowDown size={15}/></span></div>
    </section>
    <section className="history" ref={chartRef} id="history"><div className="history-heading"><div><h2>{selected ? `${selected[0].toUpperCase()}${selected.slice(1)} region` : 'Regional history'}</h2><p>{selected ? <>Latest: <strong style={{color: status?.color}}>{shown ? `${shown.value} ${METRICS[metric].unit} · ${status?.label}` : 'reading unavailable'}</strong></> : 'Select a region on the map to explore its readings.'}</p></div>{selected && <button className="refresh-button" onClick={() => setRetry((n) => n+1)} aria-label="Reload readings"><RefreshCw size={16}/><span>Refresh</span></button>}</div>
      <div className="filters"><div className="range-buttons" role="group" aria-label="Date range">{[['7','Last 7 days'],['15','Last 15 days'],['30','Last 30 days'],['month','Month'],['custom','Custom']].map(([key,label]) => <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)}>{label}</button>)}</div>{range === 'month' && <label className="date-field">Month <input type="month" min="2026-08" max={today.slice(0,7)} value={month} onChange={(e) => setMonth(e.target.value)}/></label>}{range === 'custom' && <div className="custom-fields"><label className="date-field">From <input type="date" min={FIRST_DAY} max={today} value={customStart} onChange={(e) => setCustomStart(e.target.value)}/></label><label className="date-field">To <input type="date" min={FIRST_DAY} max={today} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}/></label></div>}</div>
      {!valid && <p className="notice error">Choose dates between 1 August 2026 and today, with the start before the end.</p>}
      {selected && valid && <><div className="chart-head"><div><h3>{METRICS[metric].label} over time</h3><span>{bounds.start} – {bounds.end} · Singapore time</span></div><span>{progress ? `Loading ${progress.done}/${progress.total || '…'} days` : `${points.length.toLocaleString()} published readings`}</span></div>{progress ? <div className="loading-state"><div className="loading-track"><i style={{width: progress.total ? `${progress.done/progress.total*100}%` : '5%'}}/></div><p>Loading daily NEA records…</p></div> : error ? <p className="notice error">{error}</p> : points.length ? <Chart points={points} metric={metric} start={bounds.start} end={bounds.end}/> : <p className="notice">No published readings found for this selection.</p>}{failures.length > 0 && <p className="notice error">{failures.length} day{failures.length === 1 ? '' : 's'} could not be loaded. The chart shows available days only. Refresh to retry.</p>}<div className="band-legend" aria-label={`${METRICS[metric].label} bands`}>{METRICS[metric].bands.map((band, i) => <div key={band.label}><i style={{background: band.color}}/><span>{band.label}</span><small>{Number.isFinite(band.max) ? `${i === 0 ? 0 : METRICS[metric].bands[i-1].max + 1}–${band.max}` : `≥${METRICS[metric].bands[i-1].max + 1}`}</small></div>)}</div></>}
      <p className="method-note">NEA publishes these regional values hourly. The chart plots each available published timestamp; it does not invent 15-minute readings. The map is a schematic of NEA’s reporting regions, not an official boundary map.</p></section>
    <footer><span>Data: <a href="https://guide.data.gov.sg/developer-guide/real-time-apis" target="_blank" rel="noreferrer">data.gov.sg / NEA</a> · Bands: <a href="https://www.haze.gov.sg/resources/1-hr-pm2.5-readings" target="_blank" rel="noreferrer">PM₂.₅</a> and <a href="https://www.nea.gov.sg/our-services/pollution-control/air-pollution/faqs" target="_blank" rel="noreferrer">PSI</a></span><span>All times SGT</span></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
