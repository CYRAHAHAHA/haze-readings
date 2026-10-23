import React from 'react';
import { bandFor, METRICS } from './data';

const SHAPE = 'M 59 179 C 85 156 115 147 138 126 L 180 120 206 105 250 96 284 86 315 90 342 101 371 95 407 105 438 128 465 120 493 132 518 130 547 150 586 155 613 170 639 177 668 202 708 211 749 212 770 227 747 245 720 250 685 269 649 277 619 294 577 294 550 305 516 293 478 310 447 300 409 309 376 310 347 329 321 315 291 315 267 300 241 302 213 286 183 281 160 263 129 254 108 239 79 229 58 211 Z';
const CELLS = [
  { id: 'north', points: '0,0 800,0 800,158 560,158 255,158 0,158', x: 393, y: 131 },
  { id: 'west', points: '0,158 255,158 335,222 300,390 0,390', x: 189, y: 221 },
  { id: 'central', points: '255,158 560,158 555,260 430,282 335,222', x: 414, y: 218 },
  { id: 'east', points: '560,158 800,158 800,390 555,260', x: 644, y: 228 },
  { id: 'south', points: '335,222 430,282 555,260 800,390 300,390', x: 439, y: 294 },
];
const FACETS = [
  '60,179 180,120 165,158', '180,120 284,86 255,158',
  '284,86 390,173 430,100', '430,100 560,158 490,132',
  '59,211 255,158 300,290', '335,222 430,282 390,173',
  '560,158 749,212 650,265', '430,282 555,260 516,293',
];
function RegionLabel({ cell, pm, psi, selected, onSelect }) {
  const available = Number.isFinite(pm) || Number.isFinite(psi);
  return <g className={`region-hit ${selected ? 'selected' : ''}`} role="button" tabIndex="0" aria-label={`${cell.id} region, 1-hour PM2.5 ${Number.isFinite(pm) ? pm : 'unavailable'}, 24-hour PSI ${Number.isFinite(psi) ? psi : 'unavailable'}`} onClick={() => onSelect(cell.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(cell.id); } }}>
    <polygon points={cell.points} clipPath="url(#island-boundary)" fill="transparent"/>
    <rect x={cell.x - 68} y={cell.y - 36} width="136" height="73" rx="6" className="region-label-bg"/>
    <text x={cell.x} y={cell.y - 16} textAnchor="middle" className="region-name">{cell.id.toUpperCase()}</text>
    <text x={cell.x} y={cell.y + 3} textAnchor="middle" className="region-reading">1h PM₂.₅  <tspan className="region-number">{Number.isFinite(pm) ? pm : '—'}</tspan></text>
    <text x={cell.x} y={cell.y + 23} textAnchor="middle" className="region-reading">24h PSI  <tspan className="region-number">{Number.isFinite(psi) ? psi : '—'}</tspan></text>
  </g>;
}
export default function SingaporeMap({ selected, onSelect, metric, values }) {
  return <div className="map-stage">
    <div className="map-legend" aria-label={`${METRICS[metric].label} colour bands`}>
      <strong>{metric === 'pm25' ? '1h PM₂.₅ · µg/m³' : '24h PSI'}</strong>
      {METRICS[metric].bands.map((band, index) => <div className="map-legend-item" key={band.label}>
        <i style={{ backgroundColor: band.color }}/><span>{band.label}</span>
        <small>{Number.isFinite(band.max) ? `${index === 0 ? 0 : METRICS[metric].bands[index - 1].max + 1}–${band.max}` : `≥${METRICS[metric].bands[index - 1].max + 1}`}</small>
      </div>)}
    </div>
    <svg className="island-map" viewBox="0 0 800 380" role="img" aria-label="Singapore schematic map with five selectable NEA reporting regions">
      <defs><clipPath id="island-boundary"><path d={SHAPE}/></clipPath></defs>
      <path d={SHAPE} transform="translate(0 7)" fill="#829b84" opacity=".75"/>
      <path d={SHAPE} fill="#dce8dc" stroke="#60826a" strokeWidth="2"/>
      <g clipPath="url(#island-boundary)">
        {CELLS.map((cell) => {
          const value = values[metric][cell.id]?.value;
          const shade = Number.isFinite(value) ? bandFor(metric, value).color : '#cddbcf';
          return <polygon key={cell.id} points={cell.points} fill={shade} fillOpacity={selected === cell.id ? .5 : .28} stroke="#f8faf5" strokeWidth="5" className="region-shape"/>;
        })}
        {FACETS.map((points, index) => <polygon key={points} points={points} fill={index % 2 ? '#ffffff' : '#45654c'} opacity=".045" pointerEvents="none"/>)}
      </g>
      <path d={SHAPE} fill="none" stroke="#60826a" strokeWidth="2" pointerEvents="none"/>
      {CELLS.map((cell) => <RegionLabel key={cell.id} cell={cell} pm={values.pm25[cell.id]?.value} psi={values.psi[cell.id]?.value} selected={selected === cell.id} onSelect={onSelect}/>)}
    </svg>
  </div>;
}
