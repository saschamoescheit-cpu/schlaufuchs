// Zeichnungen der Fuchs-Outfits (eigene Datei, damit der Fuchs sie ohne Kreis-Import nutzen kann).
import type { ReactNode } from 'react';

export type Slot = 'kopf' | 'hals';
export interface Outfit {
  id: string;
  name: string;
  slot: Slot;
  stars: number;
  draw: ReactNode;
}

// Zeichnungen im Koordinatensystem des Fuchses (viewBox 0 0 200 200, Kopf oben bei y≈46, Kinn bei y≈180)
export const OUTFITS: Outfit[] = [
  {
    id: 'blume',
    name: 'Blume',
    slot: 'kopf',
    stars: 15,
    draw: (
      <g transform="translate(50 46)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-11" rx="7" ry="10" fill="#FFD1E8" stroke="#F28BBE" strokeWidth="2" transform={`rotate(${a})`} />
        ))}
        <circle r="7" fill="#FFC93C" />
      </g>
    ),
  },
  {
    id: 'schleife',
    name: 'Schleife',
    slot: 'kopf',
    stars: 40,
    draw: (
      <g transform="translate(148 48) rotate(-18)">
        <path d="M0 0 L-24 -15 Q-28 0 -24 15 Z" fill="#FF6FA8" stroke="#E04888" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M0 0 L24 -15 Q28 0 24 15 Z" fill="#FF6FA8" stroke="#E04888" strokeWidth="2.5" strokeLinejoin="round" />
        <circle r="7" fill="#E04888" />
      </g>
    ),
  },
  {
    id: 'fliege',
    name: 'Fliege',
    slot: 'hals',
    stars: 75,
    draw: (
      <g transform="translate(100 188)">
        <path d="M0 0 L-22 -10 L-22 10 Z" fill="#3B82F6" stroke="#1E5FD0" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M0 0 L22 -10 L22 10 Z" fill="#3B82F6" stroke="#1E5FD0" strokeWidth="2.5" strokeLinejoin="round" />
        <circle r="5.5" fill="#1E5FD0" />
      </g>
    ),
  },
  {
    id: 'kappe',
    name: 'Kappe',
    slot: 'kopf',
    stars: 120,
    draw: (
      <g>
        <path d="M118 52 Q158 44 180 58 Q156 66 118 62 Z" fill="#D63B3B" />
        <path d="M60 60 Q60 22 100 22 Q140 22 140 60 Q100 50 60 60 Z" fill="#EF4B4B" />
        <path d="M100 22 L100 54" stroke="#D63B3B" strokeWidth="3" />
        <circle cx="100" cy="22" r="5" fill="#D63B3B" />
      </g>
    ),
  },
  {
    id: 'schal',
    name: 'Schal',
    slot: 'hals',
    stars: 200,
    draw: (
      <g>
        <path d="M44 160 Q100 196 156 160 L160 174 Q100 212 40 174 Z" fill="#2FA866" />
        <path d="M118 176 L136 172 L140 198 L122 200 Z" fill="#2FA866" />
        <path d="M120 186 L139 183 M121 193 L140 190" stroke="#FFF6EC" strokeWidth="3" />
        <path d="M60 172 Q100 196 140 172" fill="none" stroke="#FFF6EC" strokeWidth="3" strokeDasharray="8 7" />
      </g>
    ),
  },
  {
    id: 'muetze',
    name: 'Pudelmütze',
    slot: 'kopf',
    stars: 300,
    draw: (
      <g>
        <path d="M60 58 Q60 20 100 20 Q140 20 140 58 Z" fill="#7C5CFA" />
        <rect x="56" y="50" width="88" height="14" rx="7" fill="#5B3FD6" />
        <path d="M78 26 L78 50 M100 20 L100 50 M122 26 L122 50" stroke="#5B3FD6" strokeWidth="3" />
        <circle cx="100" cy="16" r="10" fill="#FFFFFF" stroke="#E6E0FF" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: 'doktorhut',
    name: 'Doktorhut',
    slot: 'kopf',
    stars: 450,
    draw: (
      <g>
        <path d="M68 58 L68 38 Q100 30 132 38 L132 58 Q100 50 68 58 Z" fill="#2B2340" />
        <path d="M100 12 L152 28 L100 44 L48 28 Z" fill="#3A3054" stroke="#2B2340" strokeWidth="2" strokeLinejoin="round" />
        <path d="M100 28 L146 34 L146 54" fill="none" stroke="#FFC93C" strokeWidth="3" strokeLinecap="round" />
        <circle cx="146" cy="56" r="5" fill="#FFC93C" />
        <circle cx="100" cy="28" r="4" fill="#FFC93C" />
      </g>
    ),
  },
  {
    id: 'zauberhut',
    name: 'Zauberhut',
    slot: 'kopf',
    stars: 700,
    draw: (
      <g>
        <path d="M62 58 L108 2 L138 58 Z" fill="#3D5AFE" strokeLinejoin="round" />
        <ellipse cx="100" cy="58" rx="48" ry="8" fill="#2F46D0" />
        <path d="M96 30 l2.5 5 5.5 .8 -4 3.9 1 5.5 -5 -2.6 -5 2.6 1 -5.5 -4 -3.9 5.5 -.8 Z" fill="#FFC93C" />
        <circle cx="114" cy="44" r="3" fill="#FFC93C" />
        <circle cx="106" cy="16" r="2.5" fill="#FFC93C" />
      </g>
    ),
  },
  {
    id: 'krone',
    name: 'Krone',
    slot: 'kopf',
    stars: 1000,
    draw: (
      <g>
        <path d="M64 58 L64 22 L82 38 L100 14 L118 38 L136 22 L136 58 Z" fill="#FFC93C" stroke="#E0A400" strokeWidth="3" strokeLinejoin="round" />
        <rect x="64" y="48" width="72" height="10" fill="#E0A400" />
        <circle cx="100" cy="40" r="5" fill="#EF4B4B" />
        <circle cx="80" cy="46" r="3.5" fill="#3B82F6" />
        <circle cx="120" cy="46" r="3.5" fill="#2FA866" />
      </g>
    ),
  },
];

