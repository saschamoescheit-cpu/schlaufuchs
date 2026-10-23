import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VocabCards } from './VocabCards';
import { emptyProgress } from '../engine/learning';
import type { Profile } from '../data/store';

// Vokabelkarten „Nur hören“: vorne weder Wort noch Bild – nur das Ohr und der Knopf zum Nochmal-Anhören
const profile = { id: 'k1', sound: false } as unknown as Profile;
const render = (dir: 'hear' | 'en-de') =>
  renderToStaticMarkup(<VocabCards profile={profile} progress={emptyProgress()} skillIds={['e1-colours']} n={5} dir={dir} onExit={() => {}} onRestart={() => {}} />);

describe('Vokabelkarten', () => {
  it('Hör-Karte zeigt vorne kein Wort und kein Bild', () => {
    const out = render('hear');
    expect(out).toContain('👂');
    expect(out).toContain('Nochmal anhören');
    expect(out).not.toContain('vcard-vis');
    expect(out).not.toMatch(/>(red|blue|green|yellow|orange|purple|pink|black|white|brown|grey)</);
  });
  it('Englisch vorne zeigt das Wort', () => {
    expect(render('en-de')).toMatch(/>(red|blue|green|yellow|orange|purple|pink|black|white|brown|grey)</);
  });
});
