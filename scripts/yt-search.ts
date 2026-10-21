// npx vite-node scripts/yt-search.ts > out.json – sucht je Thema YouTube-Kandidaten (Titel, Kanal, Länge, einbettbar?)
import { ALL_SKILLS } from '../src/content/curriculum';

type Cand = { id: string; title: string; channel: string; len: string; views: string; embed?: boolean };
function walk(o: unknown, out: Cand[]) {
  if (!o || typeof o !== 'object') return;
  const v = (o as Record<string, any>).videoRenderer;
  if (v?.videoId) {
    out.push({ id: v.videoId, title: v.title?.runs?.[0]?.text ?? '', channel: v.ownerText?.runs?.[0]?.text ?? '', len: v.lengthText?.simpleText ?? '', views: v.viewCountText?.simpleText ?? '' });
    return;
  }
  for (const k of Object.keys(o as object)) walk((o as Record<string, unknown>)[k], out);
}
async function search(q: string): Promise<Cand[]> {
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=de&gl=DE`, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'accept-language': 'de-DE,de;q=0.9', cookie: 'CONSENT=YES+cb; SOCS=CAI' }, redirect: 'manual' });
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const out: Cand[] = [];
  walk(JSON.parse(m[1]), out);
  return out.slice(0, 6);
}
async function embeddable(id: string) {
  const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
  return r.ok;
}
import { existsSync, readFileSync } from 'node:fs';
const prev = process.argv[2] && existsSync(process.argv[2]) ? JSON.parse(readFileSync(process.argv[2], 'utf-8')) : {};
const result: Record<string, { q: string; c: Cand[] }> = {};
for (const s of ALL_SKILLS) {
  if (prev[s.id]?.c?.length) {
    result[s.id] = prev[s.id];
    continue;
  }
  let c: Cand[] = [];
  for (let tries = 0; tries < 3 && !c.length; tries++) {
    if (tries) await new Promise((r) => setTimeout(r, 4000));
    c = await search(s.explain.videoQuery).catch((e) => { console.error(s.id, String(e)); return [] as Cand[]; });
  }
  for (const x of c.slice(0, 4)) x.embed = await embeddable(x.id).catch(() => undefined);
  result[s.id] = { q: s.explain.videoQuery, c };
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(JSON.stringify(result, null, 1));
