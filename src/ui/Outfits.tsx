// Fuchs-Kleiderschrank: Mützen, Hüte und Schleifen für den Fuchs – freigeschaltet mit Sternen.
import { useState } from 'react';
import { saveProfile, type Profile } from '../data/store';
import { Fox, Sheet } from './common';
import { OUTFITS, type Outfit } from './outfitArt';

export { OUTFITS };

export const outfitById = (id: string) => OUTFITS.find((o) => o.id === id);
export const unlockedOutfits = (stars: number) => OUTFITS.filter((o) => stars >= o.stars);
export const nextOutfit = (stars: number) => OUTFITS.find((o) => stars < o.stars);

/** das, was das Kind ausgewählt hat – nur freigeschaltete Teile (falls Sterne woanders gezählt wurden) */
export function wearing(profile: Profile | undefined, stars: number): string[] {
  return (profile?.outfit ?? []).filter((id) => (outfitById(id)?.stars ?? Infinity) <= stars);
}

const seenKey = (pid: string) => `schlaufuchs:outfits-seen:${pid}`;
export function unseenOutfits(pid: string, stars: number): number {
  let seen = 0;
  try {
    seen = Number(localStorage.getItem(seenKey(pid)) ?? 0);
  } catch {
    /* ohne Speicher keine Markierung */
  }
  return Math.max(0, unlockedOutfits(stars).length - seen);
}
function markSeen(pid: string, stars: number) {
  try {
    localStorage.setItem(seenKey(pid), String(unlockedOutfits(stars).length));
  } catch {
    /* egal */
  }
}

export function Wardrobe({ profile, stars, onClose }: { profile: Profile; stars: number; onClose: () => void }) {
  const [sel, setSel] = useState<string[]>(wearing(profile, stars));
  const toggle = (o: Outfit) => {
    const next = sel.includes(o.id) ? sel.filter((x) => x !== o.id) : [...sel.filter((x) => outfitById(x)?.slot !== o.slot), o.id];
    setSel(next);
    saveProfile({ ...profile, outfit: next }, false);
  };
  const close = () => {
    markSeen(profile.id, stars);
    onClose();
  };
  const nxt = nextOutfit(stars);
  return (
    <Sheet onClose={close} label="Kleiderschrank">
      <div className="stack">
        <h2>👕 Kleiderschrank</h2>
        <div className="center">
          <Fox size={150} mood="happy" outfit={sel} />
        </div>
        {nxt && (
          <p className="small muted center" style={{ marginTop: -6 }}>
            Noch {nxt.stars - stars} ⭐ bis zum nächsten Teil für deinen Fuchs!
          </p>
        )}
        <div className="wardrobe">
          {OUTFITS.map((o) => {
            const open = stars >= o.stars;
            const on = sel.includes(o.id);
            return (
              <button key={o.id} className={`wardrobe-item ${on ? 'on' : ''}`} disabled={!open} onClick={() => toggle(o)} aria-pressed={on} aria-label={open ? o.name : `${o.name} – ab ${o.stars} Sternen`}>
                <span className={open ? '' : 'locked'}>
                  <Fox size={64} outfit={[o.id]} />
                </span>
                <b>{o.name}</b>
                <span className="small muted">{open ? (on ? 'an ✓' : 'anziehen') : `🔒 ${o.stars} ⭐`}</span>
              </button>
            );
          })}
        </div>
        <button className="btn ok block" onClick={close}>
          Fertig
        </button>
      </div>
    </Sheet>
  );
}
