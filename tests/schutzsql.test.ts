// Der Datenbank-Schutz (supabase/schlaufuchs-schutz.sql) in einer echten Postgres (PGlite) mit nachgebildetem
// Supabase-Umfeld. 24.10.2026: Leanas Lernstand war weg – die Cloud darf nie leer überschrieben, verkleinert oder
// still gelöscht werden; jede abgewiesene Fassung wird gesichert.
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const U = '00000000-0000-0000-0000-000000000001';
const db = new PGlite();
const prog = (stars: number, n: number) => ({ skills: { 'm3-plus': { n, ok: stars, recent: [], last: 1, tags: {} } }, review: [], solved: 2, stars, days: {} });
const sql = (f: string) => readFileSync(new URL(`../supabase/${f}`, import.meta.url), 'utf8');

/** wie die App über PostgREST schreibt: Upsert (insert … on conflict do update) */
const upsert = (kind: string, id: string, data: unknown, deleted = false) =>
  db.query(
    `insert into schlaufuchs_items (user_id, kind, id, data, deleted, updated_at) values ($1,$2,$3,$4,$5,now())
     on conflict (user_id, kind, id) do update set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at`,
    [U, kind, id, JSON.stringify(data), deleted],
  );
/** wie die App ausdrücklich löscht: nur das Kennzeichen (PATCH) */
const mark = (kind: string, id: string) => db.query(`update schlaufuchs_items set deleted = true, updated_at = now() where kind = $1 and id = $2`, [kind, id]);
const row = async (kind: string, id: string) => (await db.query<{ data: Record<string, unknown> & unknown[]; deleted: boolean }>(`select data, deleted from schlaufuchs_items where kind = $1 and id = $2`, [kind, id])).rows[0];
const hist = async (reason: string) => (await db.query<{ n: number }>(`select count(*)::int as n from schlaufuchs_history where reason = $1`, [reason])).rows[0].n;

beforeAll(async () => {
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${U}');
    create function auth.uid() returns uuid language sql as $$ select '${U}'::uuid $$;
    create role anon; create role authenticated;
  `);
  const base = sql('schlaufuchs.sql');
  const from = base.indexOf('create table if not exists public.schlaufuchs_items');
  await db.exec(base.slice(from, base.indexOf(');', from) + 2));
  await db.exec(sql('schlaufuchs-schutz.sql'));
  await db.exec(sql('schlaufuchs-schutz.sql')); // mehrfach ausführbar
  await upsert('profile', 'leana', { id: 'leana', name: 'Leana' });
  await upsert('progress', 'leana', prog(120, 130));
  await upsert('log', 'leana/2026-10-24', [{ t: 1 }, { t: 2 }]);
}, 60_000);

describe('Datenbank-Schutz für den Lernstand', { timeout: 30_000 }, () => {
  it('Weiterüben geht; einmal am Tag eine Sicherung', async () => {
    await upsert('progress', 'leana', prog(121, 131));
    await upsert('progress', 'leana', prog(122, 132));
    expect((await row('progress', 'leana')).data.stars).toBe(122);
    expect(await hist('tag')).toBe(1);
  });

  it('ein geleerter oder kleinerer Lernstand überschreibt die Cloud nicht – und wird gesichert', async () => {
    await upsert('progress', 'leana', { skills: {}, review: [], solved: 0, stars: 0, days: {} });
    expect((await row('progress', 'leana')).data.stars).toBe(122);
    await upsert('progress', 'leana', prog(122, 10));
    expect(((await row('progress', 'leana')).data.skills as Record<string, { n: number }>)['m3-plus'].n).toBe(132);
    expect(await hist('kleiner-abgewiesen')).toBe(2);
  });

  it('alte App löscht mit leerem Inhalt: abgewiesen, Kind und Lernstand bleiben', async () => {
    await upsert('profile', 'leana', {}, true);
    await upsert('progress', 'leana', {}, true);
    const p = await row('profile', 'leana');
    expect(p.deleted).toBe(false);
    expect(p.data.name).toBe('Leana');
    expect((await row('progress', 'leana')).data.stars).toBe(122);
    expect(await hist('loeschen-abgewiesen')).toBe(2);
  });

  it('ein Tag im Verlauf wird weder kürzer noch leer', async () => {
    await upsert('log', 'leana/2026-10-24', [{ t: 1 }]);
    await upsert('log', 'leana/2026-10-24', []);
    expect((await row('log', 'leana/2026-10-24')).data).toHaveLength(2);
  });

  it('ausdrücklich löschen (nur Kennzeichen) geht, der Inhalt bleibt; wiederherstellen geht', async () => {
    await mark('profile', 'leana');
    let p = await row('profile', 'leana');
    expect(p.deleted).toBe(true);
    expect(p.data.name).toBe('Leana');
    await upsert('profile', 'leana', { id: 'leana', name: 'Leana' });
    p = await row('profile', 'leana');
    expect(p.deleted).toBe(false);
  });

  it('Prüf-Funktion für „Schutz eingerichtet?“', async () => {
    expect((await db.query<{ v: number }>('select public.schlaufuchs_schutz_version() as v')).rows[0].v).toBe(1);
  });
});
