-- Schlaufuchs: Mitteilungen (Sascha 23.10.2026, „wie bei GolfOS Rounds“). Einmal im SQL Editor des Schlaufuchs-Projekts
-- ausführen, NACHDEM die Funktion schlaufuchs-push angelegt ist (supabase/functions/schlaufuchs-push/index.ts);
-- mehrfaches Ausführen schadet nicht.
-- Nur die Funktion liest und schreibt diese Tabellen (mit dem Service-Schlüssel) – die App spricht mit der Funktion,
-- deshalb braucht es keine Zeilen-Regeln für Eltern: Zeilenschutz an, keine Regel = niemand sonst.

-- eine Zeile je Gerät, das Mitteilungen eingeschaltet hat
create table if not exists public.schlaufuchs_push (
  endpoint text primary key check (length(endpoint) <= 1000),
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  kinds jsonb,              -- {"learn":true,"tests":true,"cards":true}; null = alle an
  tz text,                  -- Zeitzone des Geräts, z. B. Europe/Berlin (Erinnerungen nur nachmittags)
  updated_at timestamptz not null default now()
);
alter table public.schlaufuchs_push enable row level security;
create index if not exists schlaufuchs_push_user on public.schlaufuchs_push (user_id);

-- was schon geschickt wurde (je Kind und Tag einmal, je Klassenarbeit einmal in 3 Tagen und einmal morgen)
create table if not exists public.schlaufuchs_push_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (length(key) <= 200),
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.schlaufuchs_push_sent enable row level security;

-- das Schlüsselpaar des Absenders, von der Funktion beim ersten Aufruf erzeugt (verlässt den Server nie)
create table if not exists public.schlaufuchs_push_keys (
  id integer primary key check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.schlaufuchs_push_keys enable row level security;

-- alle 15 Minuten: Erinnerungen prüfen und schicken
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule('schlaufuchs-push-tick') where exists (select 1 from cron.job where jobname = 'schlaufuchs-push-tick');
select cron.schedule(
  'schlaufuchs-push-tick',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://gypgaepmlftnqwywupeq.supabase.co/functions/v1/schlaufuchs-push',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"action": "tick"}'::jsonb
     ) $$
);
