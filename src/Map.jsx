import React from 'react';
import { bandFor, METRICS, REGIONS } from './data';

const SHAPE = 'M 59 179 C 85 156 115 147 138 126 L 180 120 206 105 250 96 284 86 315 90 342 101 371 95 407 105 438 128 465 120 493 132 518 130 547 150 586 155 613 170 639 177 668 202 708 211 749 212 770 227 747 245 720 250 685 269 649 277 619 294 577 294 550 305 516 293 478 310 447 300 409 309 376 310 347 329 321 315 291 315 267 300 241 302 213 286 183 281 160 263 129 254 108 239 79 229 58 211 Z';
const FACETS = [
  ['58,179 138,126 180,120 166,187', '#ffffff', .14],
  ['58,179 166,187 129,254 58,211', '#244e35', .07],
  ['166,187 180,120 284,86 260,168', '#ffffff', .11],
  ['166,187 260,168 337,222 241,302', '#ffffff', .07],
  ['166,187 241,302 129,254', '#244e35', .08],
  ['260,168 284,86 390,173 337,222', '#244e35', .06],
  ['284,86 407,105 438,128 390,173', '#ffffff', .11],
  ['390,173 438,128 570,177 516,293', '#ffffff', .08],
  ['337,222 390,173 516,293 409,309', '#244e35', .07],
  ['337,222 409,309 321,315 241,302', '#ffffff', .07],
  ['438,128 547,150 570,177', '#244e35', .08],
  ['570,177 668,202 749,212 685,269', '#ffffff', .12],
  ['570,177 685,269 516,293', '#244e35', .07],
  ['516,293 685,269 619,294 550,305', '#ffffff', .1],
];
const CELLS = [
  { id: 'north', points: '70,50 800,50 800,160 570,178 390,173 260,168 70,180', x: 385, y: 131 },
  { id: 'west', points: '0,148 265,162 337,222 302,360 0,360', x: 205, y: 221 },
  { id: 'central', points: '260,162 570,177 560,263 434,285 337,222', x: 416, y: 225 },
  { id: 'east', points: '570,177 800,153 800,340 560,263', x: 617, y: 231 },
  { id: 'south', points: '337,222 434,285 560,263 800,340 800,390 260,390 302,360', x: 428, y: 296 },
];
export default function SingaporeMap({ selected, onSelect, metric, latest }) {
  return <div className="map-stage">
    <div className="map-watermark">SINGAPORE</div>
    <svg className="island-map" viewBox="0 0 800 420" role="img" aria-label="Schematic Singapore map with five selectable NEA reporting regions">
      <defs><clipPath id="island-boundary"><path d={SHAPE}/></clipPath></defs>
      <ellipse cx="408" cy="332" rx="350" ry="35" fill="#709a7a" opacity=".14"/>
      <path d={SHAPE} transform="translate(0 24)" fill="#7c9b80" stroke="#66876d" strokeWidth="2"/>
      <path d={SHAPE} transform="translate(0 12)" fill="#9ab79c" stroke="#78967d" strokeWidth="1"/>
      <path d={SHAPE} fill="#e3e9e2" stroke="#8ba590" strokeWidth="2"/>
      <g clipPath="url(#island-boundary)">
        {CELLS.map((cell) => {
          const value = latest[cell.id]?.value;
          const color = Number.isFinite(value) ? bandFor(metric, value).color : '#d3ddd4';
          return <polygon key={cell.id} points={cell.points} fill={color} fillOpacity={selected === cell.id ? .86 : .65} stroke="#82988c" strokeWidth="2" className="region-shape"/>;
        })}
      </g>
      <g clipPath="url(#island-boundary)" pointerEvents="none">
        {FACETS.map(([points, color, opacity], index) => <polygon key={index} points={points} fill={color} opacity={opacity}/>) }
      </g>
      <path d={SHAPE} fill="none" stroke="#6f9277" strokeWidth="2.5" pointerEvents="none"/>
      {CELLS.map((cell) => {
        const value = latest[cell.id]?.value;
        return <g key={cell.id} className={`region-hit ${selected === cell.id ? 'selected' : ''}`} role="button" tabIndex="0" aria-label={`${cell.id} region${Number.isFinite(value) ? `, ${value} ${METRICS[metric].unit}` : ', reading unavailable'}`} onClick={() => onSelect(cell.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(cell.id); } }}>
          <polygon points={cell.points} clipPath="url(#island-boundary)" fill="transparent"/>
          <rect x={cell.x - 57} y={cell.y - 29} width="114" height="57" rx="10" className="region-label-bg"/>
          <text x={cell.x} y={cell.y - 3} textAnchor="middle" className="region-name">{cell.id.toUpperCase()}</text>
          <text x={cell.x} y={cell.y + 17} textAnchor="middle" className="region-value">{Number.isFinite(value) ? value : '—'}</text>
        </g>;
      })}
    </svg>
    <span className="map-caption">Schematic reporting regions · select a region to explore its history</span>
  </div>;
}
