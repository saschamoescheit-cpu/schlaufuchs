// node qa/trace-play.mjs [url] – „Zeig's mir“ beim Nachspuren: Vorführung läuft, Bilder mittendrin und am Ende
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
let bad = 0;
for (let i = 0; i < 3; i++) {
  const { p, shot, click, done } = await open({ url, out: 'qa/shots/trace-play', grade: 1, device: 'iPhone 13' });
  await click('Deutsch');
  await p.locator('.topic-main', { hasText: 'Buchstaben nachspuren' }).first().click();
  await p.locator('.trace-canvas').waitFor();
  await p.waitForTimeout(500);
  const play = p.locator('.trace-play');
  if (!(await play.count())) { bad++; console.log('✗ kein Abspiel-Symbol'); }
  await play.click();
  await p.waitForTimeout(900);
  await shot(`${i}-mitte`);
  await p.waitForTimeout(4500);
  await shot(`${i}-ende`);
  // nochmal abspielen muss wieder von vorn starten
  await play.click();
  await p.waitForTimeout(300);
  await shot(`${i}-neu`);
  bad += await done();
}
process.exit(bad);
