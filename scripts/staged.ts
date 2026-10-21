import { ALL_SKILLS } from '../src/content/curriculum';
const n = ALL_SKILLS.filter((s) => !s.staged).map((s) => s.id);
console.log('ohne Stufen:', n.length, n.join(' '));
