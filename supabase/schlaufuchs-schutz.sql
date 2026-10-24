-- Schlaufuchs: Schutz des Lernstands direkt in der Datenbank (24.10.2026, nach Leanas verschwundenem Lernstand).
-- Wirkt unabhängig von der App – auch gegen alte, noch zwischengespeicherte App-Versionen und künftige Fehler.
--
-- 1. Nichts wird leer überschrieben: Inhalt durch „{}“/„[]“/null ersetzen geht nicht – der alte bleibt.
-- 2. Der Lernstand wird nie kleiner: Sterne, gelöste Aufgaben und Antworten je Thema nur nach oben; ein Tag im
--    Aufgaben-Verlauf verliert keine Antworten; ein Test bleibt.
-- 3. Löschen nur auf ausdrücklichen Wunsch: Die aktuelle App setzt beim Löschen nur das Kennzeichen (Inhalt bleibt).
--    Alte App-Versionen schickten dabei einen leeren Inhalt mit – solche Löschungen werden abgewiesen.
-- 4. Sicherungen: Vor jeder abgewiesenen oder verkleinernden Änderung und einmal am Tag je Zeile wird die alte Fassung
--    in schlaufuchs_history aufgehoben (60 Tage). Die App liest sie bei „Lernstand suchen“.
--
-- Einmal im Supabase-Projekt „Schlaufuchs“ unter SQL Editor ausführen. Kann gefahrlos mehrfach ausgeführt werden.

create table if not exists public.schlaufuchs_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz,
  saved_at timestamptz not null default now(),
  reason text not null default 'tag'
);
create index if not exists schlaufuchs_history_row on public.schlaufuchs_history (user_id, kind, id, saved_at desc);
alter table public.schlaufuchs_history enable row level security;
drop policy if exists "own history read" on public.schlaufuchs_history;
create policy "own history read" on public.schlaufuchs_history for select to authenticated using (user_id = auth.uid());
grant select on public.schlaufuchs_history to authenticated;

-- Summe der Antworten je Thema in einer Lernstand-Zeile
create or replace function public.schlaufuchs_answers(d jsonb) returns bigint
language sql immutable as $$
  select coalesce(sum(case when jsonb_typeof(v->'n') = 'number' then (v->>'n')::bigint else 0 end), 0)
  from jsonb_each(case when jsonb_typeof(d->'skills') = 'object' then d->'skills' else '{}'::jsonb end) as e(k, v)
$$;

create or replace function public.schlaufuchs_num(d jsonb, k text) returns numeric
language sql immutable as $$
  select case when jsonb_typeof(d->k) = 'number' then (d->>k)::numeric else 0 end
$$;

create or replace function public.schlaufuchs_is_empty(d jsonb) returns boolean
language sql immutable as $$
  select d is null or d = 'null'::jsonb or d = '{}'::jsonb or d = '[]'::jsonb
$$;

create or replace function public.schlaufuchs_protect() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  why text := null;
begin
  -- 1. nie leer überschreiben
  if schlaufuchs_is_empty(new.data) and not schlaufuchs_is_empty(old.data) then
    -- 3. alte App-Versionen löschten mit leerem Inhalt: abweisen (Kennzeichen bleibt wie es war)
    if new.deleted and not old.deleted then
      new.deleted := old.deleted;
      why := 'loeschen-abgewiesen';
    else
      why := 'leer-abgewiesen';
    end if;
    new.data := old.data;
  end if;
  -- 2. Lernstand nie kleiner
  if why is null and new.kind = 'progress' and not new.deleted and jsonb_typeof(new.data) = 'object' and jsonb_typeof(old.data) = 'object' then
    if schlaufuchs_num(new.data, 'stars') < schlaufuchs_num(old.data, 'stars')
       or schlaufuchs_num(new.data, 'solved') < schlaufuchs_num(old.data, 'solved')
       or schlaufuchs_answers(new.data) < schlaufuchs_answers(old.data) then
      new.data := old.data;
      why := 'kleiner-abgewiesen';
    end if;
  end if;
  if why is null and new.kind = 'log' and not new.deleted and jsonb_typeof(new.data) = 'array' and jsonb_typeof(old.data) = 'array'
     and jsonb_array_length(new.data) < jsonb_array_length(old.data) then
    new.data := old.data;
    why := 'kleiner-abgewiesen';
  end if;
  -- 4. Sicherung: bei jedem Abweisen und beim ersten Ändern an einem Tag
  if why is not null or not exists (
    select 1 from schlaufuchs_history h
    where h.user_id = old.user_id and h.kind = old.kind and h.id = old.id and h.saved_at > now() - interval '1 day'
  ) then
    insert into schlaufuchs_history (user_id, kind, id, data, deleted, updated_at, reason)
    values (old.user_id, old.kind, old.id, old.data, old.deleted, old.updated_at, coalesce(why, 'tag'));
    delete from schlaufuchs_history h
    where h.user_id = old.user_id and h.kind = old.kind and h.id = old.id and h.saved_at < now() - interval '60 days';
  end if;
  return new;
end $$;

drop trigger if exists schlaufuchs_protect on public.schlaufuchs_items;
create trigger schlaufuchs_protect before update on public.schlaufuchs_items
  for each row execute function public.schlaufuchs_protect();

-- Zum Prüfen von außen (die App/Claude fragt das ab): 1 = Schutz eingerichtet
create or replace function public.schlaufuchs_schutz_version() returns int language sql stable as $$ select 1 $$;
grant execute on function public.schlaufuchs_schutz_version() to anon, authenticated;
