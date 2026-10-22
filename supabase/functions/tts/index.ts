// Supabase Edge Function „tts“: Text → MP3 über Google Cloud Text-to-Speech, mit Zwischenspeicher.
// Warum: Die Browser-Stimme von Safari verstummt auf iPhone/iPad im Vibrations-/Stummmodus – echte Audiodateien nicht.
//
// Aufruf: GET /functions/v1/tts?l=de|en&r=0.95&t=<Text>
// Antwort: audio/mpeg (ein Jahr cachebar). Gleicher Text + Stimme + Tempo wird nur einmal bei Google erzeugt
// und danach aus dem Storage-Bucket „tts“ geliefert (spart das Gratiskontingent).
//
// Secrets (Supabase → Edge Functions → Secrets): GOOGLE_TTS_KEY (API-Schlüssel, nur für die Text-to-Speech-API freigegeben)
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.

const KEY = Deno.env.get('GOOGLE_TTS_KEY') ?? '';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BUCKET = 'tts';

// Stimmen: zuerst Neural2, falls die nicht verfügbar ist WaveNet
const VOICES: Record<string, { languageCode: string; names: string[] }> = {
  de: { languageCode: 'de-DE', names: ['de-DE-Neural2-G', 'de-DE-Wavenet-G'] },
  en: { languageCode: 'en-GB', names: ['en-GB-Neural2-A', 'en-GB-Wavenet-A'] },
};

// nur aus der App (eigene Adressen) – schützt das Kontingent vor fremder Nutzung
const ALLOWED = [/^https:\/\/saschamoescheit-cpu\.github\.io$/, /^https:\/\/(www\.)?schlaufuchs\.[a-z]+$/, /^http:\/\/localhost(:\d+)?$/];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED.some((r) => r.test(origin)) ? origin : 'https://saschamoescheit-cpu.github.io',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  Vary: 'Origin',
});

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const h = cors(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (origin && !ALLOWED.some((r) => r.test(origin))) return new Response('forbidden', { status: 403, headers: h });

  const u = new URL(req.url);
  const lang = u.searchParams.get('l') ?? 'de';
  const text = (u.searchParams.get('t') ?? '').trim();
  const rate = Math.min(1.2, Math.max(0.5, Math.round(Number(u.searchParams.get('r') ?? '1') * 20) / 20 || 1));
  const voice = VOICES[lang];
  if (!voice || !text || text.length > 400) return new Response('bad request', { status: 400, headers: h });
  if (!KEY) return new Response('GOOGLE_TTS_KEY fehlt', { status: 503, headers: h });

  const audioHeaders = { ...h, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable' };
  const id = await sha256(`${voice.names[0]}|${rate}|${text}`);
  const path = `${lang}/${id}.mp3`;

  // 1) schon erzeugt? aus dem Speicher liefern
  const cached = await fetch(`${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  if (cached.ok) return new Response(cached.body, { headers: audioHeaders });

  // 2) bei Google erzeugen (erste verfügbare Stimme)
  let mp3: Uint8Array | null = null;
  for (const name of voice.names) {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: voice.languageCode, name }, audioConfig: { audioEncoding: 'MP3', speakingRate: rate } }),
    });
    if (!r.ok) continue;
    const j = await r.json();
    mp3 = Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
    break;
  }
  if (!mp3) return new Response('tts failed', { status: 502, headers: h });

  // 3) für das nächste Mal ablegen (Fehler hier sind egal – dann wird beim nächsten Mal neu erzeugt)
  try {
    await fetch(`${SB_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' },
      body: mp3,
    });
  } catch {
    /* egal */
  }

  return new Response(mp3, { headers: audioHeaders });
});
