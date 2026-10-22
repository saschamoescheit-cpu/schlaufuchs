// npx vite-node scripts/topics-list.ts – alle Themen je Fach und Klasse (für den Abgleich mit dem Lehrplan)
import { ALL_SKILLS } from '../src/content/curriculum';
const by: Record<string, string[]> = {};
for (const s of ALL_SKILLS) (by[`${s.subject} ${s.grade}`] ??= []).push(`${s.id} ${s.title}`);
for (const [k, v] of Object.entries(by)) console.log(`## ${k}\n  ${v.join('\n  ')}`);
