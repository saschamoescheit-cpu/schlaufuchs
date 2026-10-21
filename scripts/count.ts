import { ALL_SKILLS } from '../src/content/curriculum';
const c: Record<string, number> = {};
for (const s of ALL_SKILLS) c[s.subject + ' ' + s.grade] = (c[s.subject + ' ' + s.grade] ?? 0) + 1;
console.log(c, ALL_SKILLS.length);
