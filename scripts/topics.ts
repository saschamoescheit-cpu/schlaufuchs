// npx vite-node scripts/topics.ts – alle Themen je Fach und Klasse auflisten (Lehrplan-Abgleich)
import { ALL_SKILLS } from '../src/content/curriculum';
for (const subj of ['mathe', 'deutsch', 'englisch'])
  for (const g of [1, 2, 3, 4]) {
    const l = ALL_SKILLS.filter((s) => s.subject === subj && s.grade === g);
    if (l.length) console.log(`${subj} ${g}: ${l.map((s) => s.title).join(' · ')}`);
  }
