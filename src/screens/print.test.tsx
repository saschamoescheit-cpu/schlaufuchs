import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintView } from './Print';
import type { Profile } from '../data/store';
import type { Task } from '../engine/types';

// Arbeitsblatt: Hör-Aufgaben bekommen ein Vorlese-Blatt für Erwachsene – der Hörtext steht nicht neben der Aufgabe
const profile = { grade: 2, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25] } as unknown as Profile;
const task = (t: Partial<Task>): Task => ({ key: 'k', skillId: 'x', stage: 2, prompt: 'Aufgabe', answer: { type: 'number', value: 1 }, tags: [], solution: [], ...t }) as Task;
const html = (tasks: Task[]) => renderToStaticMarkup(<PrintView profile={profile} spec={{ subject: 'deutsch', skills: [], tasks, limit: 600, pace: 'schule' }} onBack={() => {}} />);

describe('Arbeitsblatt', () => {
  it('Diktat: Wort nur auf dem Vorlese-Blatt, an der Aufgabe ein Hinweis mit Nummer', () => {
    const out = html([task({ prompt: 'Rechne 2 + 2' }), task({ prompt: 'Hör gut zu und schreibe das Wort.', listen: { text: 'Fahrrad. Ich fahre mit dem Fahrrad. Fahrrad.', lang: 'de' }, answer: { type: 'text', value: 'Fahrrad', dictation: true } })]);
    expect(out).toContain('Vorlese-Blatt – für Erwachsene');
    expect(out).toContain('Vorlese-Blatt, Nr. 2');
    expect(out.indexOf('Ich fahre mit dem Fahrrad')).toBeGreaterThan(out.indexOf('Vorlese-Blatt – für Erwachsene'));
  });
  it('kein Vorlese-Blatt, wenn der Hörtext schon in der Aufgabe steht oder nichts zu hören ist', () => {
    const out = html([task({ prompt: 'Was heißt „January“ auf Deutsch?', listen: { text: 'January', lang: 'en' } }), task({ prompt: 'Rechne 3 + 4' })]);
    expect(out).not.toContain('Vorlese-Blatt');
  });
});
