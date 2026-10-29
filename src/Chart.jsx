import React, { useState } from 'react';
import { bandFor, METRICS } from './data';
const W = 1000, H = 310, L = 48, R = 14, T = 18, B = 35;
const fmt = (t, options) => new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', ...options }).format(t);
export default function Chart({ points, metric, start, end }) {
  const [hover, setHover] = useState(null);
  const bands = METRICS[metric].bands;
  const maxData = Math.max(...points.map((p) => p.value), 0);
  const maxY = Math.max(metric === 'psi' ? 110 : 65, Math.ceil(maxData * 1.1 / 10) * 10);
  const minX = start.includes('T') ? Date.parse(start) : Date.parse(`${start}T00:00:00+08:00`);
  const maxX = end.includes('T') ? Date.parse(end) : Date.parse(`${end}T23:59:59+08:00`);
  const x = (t) => L + (t - minX) / (maxX - minX) * (W - L - R);
  const y = (v) => T + (1 - v / maxY) * (H - T - B);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(maxY * i / 4));
  const dateTicks = Array.from({ length: 5 }, (_, i) => minX + (maxX - minX) * i / 4);
  const paths = []; let current = [];
  for (const point of points) {
    if (current.length && point.t - current.at(-1).t > 90 * 60_000) { paths.push(current); current = []; }
    current.push(point);
  }
  if (current.length) paths.push(current);
  const colorStops = [];
  [...bands].reverse().forEach((band, index, reversed) => {
    const originalIndex = bands.length - 1 - index;
    const upper = Math.min(band.max, maxY);
    const lower = originalIndex === 0 ? 0 : Math.min(bands[originalIndex - 1].max, maxY);
    if (lower >= maxY) return;
    const color = band.color;
    colorStops.push({ offset: `${(1 - upper / maxY) * 100}%`, color });
    colorStops.push({ offset: `${(1 - lower / maxY) * 100}%`, color });
  });
  return <div className="chart-wrap">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${METRICS[metric].label} readings chart with ${points.length} published observations`} onMouseLeave={() => setHover(null)} onMouseMove={(event) => {
      if (!points.length) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const time = minX + Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * (maxX - minX);
      let lo = 0, hi = points.length - 1;
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (points[mid].t < time) lo = mid + 1; else hi = mid; }
      setHover(points[Math.max(0, lo - (lo > 0 && Math.abs(points[lo - 1].t - time) < Math.abs(points[lo].t - time) ? 1 : 0))]);
    }}>
      <defs><linearGradient id={`reading-bands-${metric}`} gradientUnits="userSpaceOnUse" x1="0" y1={T} x2="0" y2={H-B}>{colorStops.map((stop, i) => <stop key={i} offset={stop.offset} stopColor={stop.color}/>)}</linearGradient></defs>
      {bands.map((band, i) => { const low = i === 0 ? 0 : bands[i-1].max; const high = Math.min(band.max, maxY); return low < maxY && <rect key={band.label} x={L} y={y(high)} width={W-L-R} height={y(low)-y(high)} fill={band.color} opacity=".095"/>; })}
      {ticks.map((tick) => <g key={tick}><line x1={L} x2={W-R} y1={y(tick)} y2={y(tick)} stroke="#d9e1da"/><text x={L-10} y={y(tick)+4} textAnchor="end" className="axis-text">{tick}</text></g>)}
      {dateTicks.map((tick, i) => <text key={i} x={x(tick)} y={H-7} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} className="axis-text">{fmt(tick, start.includes('T') || start === end ? { hour: 'numeric', minute: '2-digit' } : { day: 'numeric', month: 'short' })}</text>)}
      {paths.map((path, i) => <polyline key={i} points={path.map((p) => `${x(p.t)},${y(p.value)}`).join(' ')} fill="none" stroke={`url(#reading-bands-${metric})`} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>)}
      {hover && <><line x1={x(hover.t)} x2={x(hover.t)} y1={T} y2={H-B} stroke="#536c5e" strokeDasharray="4 4"/><circle cx={x(hover.t)} cy={y(hover.value)} r="5" fill={bandFor(metric, hover.value).color} stroke="white" strokeWidth="2"/></>}
    </svg>
    {hover && <div className="chart-tooltip"><strong>{hover.value} {METRICS[metric].unit}</strong><span>{bandFor(metric, hover.value).label} · {fmt(hover.t, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} SGT</span></div>}
  </div>;
}
