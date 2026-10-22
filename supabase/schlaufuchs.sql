-- Schlaufuchs in Saschas Supabase-Projekt (dasselbe wie GolfOS, eigene Tabellen).
-- Einmal im SQL Editor ausführen; mehrfaches Ausführen schadet nicht.

-- 1) Die abgeglichenen Daten: eine Zeile je Kind, Lernstand, Test, Verlaufstag – jede gehört genau einer Familie.
create table if not exists public.schlaufuchs_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, kind, id)
);
alter table public.schlaufuchs_items enable row level security;
drop policy if exists "own rows only" on public.schlaufuchs_items;
create policy "own rows only" on public.schlaufuchs_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Benutzernamen: Anmelden mit Benutzername + Passwort (Supabase selbst kennt nur E-Mail + Passwort).
create table if not exists public.schlaufuchs_names (
  username text primary key check (username ~ '^[a-z0-9][a-z0-9._-]{2,19}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.schlaufuchs_names enable row level security;
drop policy if exists "own name" on public.schlaufuchs_names;
create policy "own name" on public.schlaufuchs_names for select to authenticated using (auth.uid() = user_id);

-- Fehlversuche je Benutzername (gegen Durchprobieren von Passwörtern); nur die Funktionen unten lesen und schreiben.
create table if not exists public.schlaufuchs_login_fails (
  username text not null,
  at timestamptz not null default now()
);
alter table public.schlaufuchs_login_fails enable row level security;

-- Neues Konto mit Benutzername (aus der App): Name gleich mit anlegen. Ist er vergeben, scheitert das ganze Konto.
create or replace function public.schlaufuchs_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'sf_username' then
    insert into public.schlaufuchs_names (username, user_id)
    values (lower(trim(new.raw_user_meta_data->>'sf_username')), new.id);
  end if;
  return new;
end $$;
drop trigger if exists schlaufuchs_on_new_user on auth.users;
create trigger schlaufuchs_on_new_user after insert on auth.users
  for each row execute function public.schlaufuchs_new_user();
revoke all on function public.schlaufuchs_new_user() from public, anon, authenticated;

-- Ist der Benutzername noch frei?
create or replace function public.schlaufuchs_name_free(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.schlaufuchs_names where username = lower(trim(p_username)));
$$;
revoke all on function public.schlaufuchs_name_free(text) from public;
grant execute on function public.schlaufuchs_name_free(text) to anon, authenticated;

-- Benutzername + Passwort → die E-Mail des Kontos (nur bei richtigem Passwort; danach normale Anmeldung).
-- Nach 10 Fehlversuchen in 15 Minuten ist der Name eine Weile gesperrt.
create or replace function public.schlaufuchs_login_email(p_username text, p_password text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := lower(trim(p_username));
  v_email text;
  v_hash text;
begin
  if (select count(*) from public.schlaufuchs_login_fails where username = v_name and at > now() - interval '15 minutes') >= 10 then
    raise exception 'too_many_attempts';
  end if;
  select u.email, u.encrypted_password into v_email, v_hash
    from public.schlaufuchs_names n join auth.users u on u.id = n.user_id
    where n.username = v_name;
  if coalesce(v_hash, '') <> '' and extensions.crypt(p_password, v_hash) = v_hash then
    delete from public.schlaufuchs_login_fails where username = v_name;
    return v_email;
  end if;
  insert into public.schlaufuchs_login_fails (username) values (v_name);
  return null;
end $$;
revoke all on function public.schlaufuchs_login_email(text, text) from public;
grant execute on function public.schlaufuchs_login_email(text, text) to anon, authenticated;

-- Angemeldet (z. B. mit Google): Benutzernamen festlegen oder ändern – danach geht auch Benutzername + Passwort.
create or replace function public.schlaufuchs_set_username(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  insert into public.schlaufuchs_names (username, user_id)
  values (lower(trim(p_username)), auth.uid())
  on conflict (user_id) do update set username = excluded.username;
end $$;
revoke all on function public.schlaufuchs_set_username(text) from public, anon;
grant execute on function public.schlaufuchs_set_username(text) to authenticated;
