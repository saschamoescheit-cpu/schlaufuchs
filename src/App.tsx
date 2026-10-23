import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { buildMix, buildPattern, buildPractice, buildReview } from './engine/session';
import { dueReviews, emptyProgress, type Mode } from './engine/learning';
import type { Skill, Subject, Task } from './engine/types';
import { ALL_SKILLS } from './content/curriculum';
import { getData, hasLoadError, hasSaveError, setActive, useData, usesSchoolFont } from './data/store';
import { followFamily, takePushTarget } from './data/push';
import { useSyncStatus } from './data/sync';
import { mirrorOk } from './data/mirror';
import { Home, SubjectScreen } from './screens/Home';
import { Practice } from './screens/Practice';
import { ReviewScreen, StatsScreen } from './screens/Stats';
import { TestResultView, TestRun, TestSetup, type TestSpec } from './screens/Tests';
import { ProfileEdit, Settings, Welcome } from './screens/Profile';
import { Blitz } from './screens/Blitz';
import type { CardDir, VocabStart } from './screens/Vocab';
import { buildDictation } from './content/words';
import { hasPin, isUnlocked } from './data/parent';
import { stopSpeaking } from './ui/speech';

// Selten gebrauchte Bildschirme erst bei Bedarf laden (kleineres Startpaket; offline vom Service Worker vorgehalten)
// Fehlt ein Teil (App war während eines Updates offen), einmal neu laden statt einer Fehlerseite
const RELOAD_KEY = 'schlaufuchs:chunk-reload';
const reloadOnce = (e: unknown): Promise<never> => {
  try {
    if (!sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1');
      location.reload();
      return new Promise<never>(() => {});
    }
  } catch {
    /* kein sessionStorage – dann die Fehlerseite */
  }
  throw e;
};
// nach erfolgreichem Start darf später wieder einmal neu geladen werden
setTimeout(() => {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    /* egal */
  }
}, 10000);
const ParentHome = lazy(() => import('./screens/Parent').then((m) => ({ default: m.ParentHome }), reloadOnce));
const ParentChild = lazy(() => import('./screens/Parent').then((m) => ({ default: m.ParentChild }), reloadOnce));
const PinGate = lazy(() => import('./screens/Parent').then((m) => ({ default: m.PinGate }), reloadOnce));
const PrintView = lazy(() => import('./screens/Print').then((m) => ({ default: m.PrintView }), reloadOnce));
const VocabCards = lazy(() => import('./screens/VocabCards').then((m) => ({ default: m.VocabCards }), reloadOnce));
const Loading = () => <div className="app full" aria-busy="true" />;

type Tab = 'home' | 'review' | 'tests' | 'stats';
type Route =
  | { r: 'tab'; tab: Tab }
  | { r: 'subject'; subject: Subject }
  | { r: 'practice'; title: string; tasks: Task[]; mode: Mode; again?: () => Task[]; n: number }
  | { r: 'test'; spec: TestSpec }
  | { r: 'print'; spec: TestSpec }
  | { r: 'blitz'; skill: Skill; n: number }
  | { r: 'cards'; skillIds: string[]; size: number; dir: CardDir; n: number }
  | { r: 'result'; id: string }
  | { r: 'profile-edit' }
  | { r: 'profile-new' }
  | { r: 'settings' }
  | { r: 'parent' }
  | { r: 'parent-child'; id: string };

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Lernen' },
  { id: 'review', icon: '🧰', label: 'Wiederholen' },
  { id: 'tests', icon: '⏱️', label: 'Tests' },
  { id: 'stats', icon: '📊', label: 'Lernstand' },
];

export default function App() {
  const data = useData();
  const profile = data.profiles.find((p) => p.id === data.activeId);
  const progress = (profile && data.progress[profile.id]) || emptyProgress();
  const [stack, setStack] = useState<Route[]>([{ r: 'tab', tab: 'home' }]);
  const route = stack[stack.length - 1];

  // Schulschrift für Aufgaben (Profil-Einstellung, Standard in Klasse 1–2)
  const schoolFont = !!profile && usesSchoolFont(profile);
  useEffect(() => {
    document.documentElement.toggleAttribute('data-school-font', schoolFont);
  }, [schoolFont]);

  // Zurück-Taste des Geräts/Browsers = eine Ebene zurück
  useEffect(() => {
    const onPop = () => {
      stopSpeaking();
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const push = useCallback((r: Route) => {
    stopSpeaking();
    window.history.pushState({ s: Date.now() }, '');
    setStack((s) => [...s, r]);
    window.scrollTo(0, 0);
  }, []);
  const replace = useCallback((r: Route) => {
    stopSpeaking();
    setStack((s) => [...s.slice(0, -1), r]);
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => {
    stopSpeaking();
    if (stack.length > 1) window.history.back();
  }, [stack.length]);
  const goTab = (tab: Tab) => {
    stopSpeaking();
    const depth = stack.length - 1;
    if (depth > 0) window.history.go(-depth);
    setStack([{ r: 'tab', tab }]);
    window.scrollTo(0, 0);
  };

  const [, setTick] = useState(0);
  const parentView = (r: Route, onBack: () => void, openChild: (id: string) => void) => {
    return (
      <Suspense fallback={<Loading />}>
        {!isUnlocked() ? <PinGate onOk={() => setTick((t) => t + 1)} onCancel={onBack} /> : r.r === 'parent-child' ? <ParentChild data={data} id={r.id} onBack={onBack} /> : <ParentHome data={data} onChild={openChild} onBack={onBack} />}
      </Suspense>
    );
  };

  // Profil gewechselt oder gelöscht → zurück zum Start (kam der Wechsel von einer Mitteilung „Vokabelkarten fällig“: gleich zu Englisch)
  const cardsFor = useRef<string | null>(null);
  useEffect(() => {
    const cards = cardsFor.current != null && cardsFor.current === data.activeId;
    cardsFor.current = null;
    setStack(cards ? [{ r: 'tab', tab: 'home' }, { r: 'subject', subject: 'englisch' }] : [{ r: 'tab', tab: 'home' }]);
  }, [data.activeId]);

  // Mitteilungen für die ganze Familie: kommt per Abgleich „an“, „aus“ oder eine andere Art, zieht dieses Gerät nach
  const sync = useSyncStatus();
  const familyPushKey = JSON.stringify(data.parent?.push ?? null);
  useEffect(() => {
    void followFamily(sync.signedIn);
  }, [familyPushKey, sync.signedIn]);

  // Angetippte Mitteilung: …/#kind=<id> (dieses Kind), …/#karten=<id> (seine Vokabelkarten) – beim Start und, wenn die
  // App schon offen ist, wenn der Service Worker die Adresse wechselt
  useEffect(() => {
    const go = () => {
      const t = takePushTarget();
      const d = getData();
      if (!t || !d.profiles.some((p) => p.id === t.kid)) return;
      if (d.activeId !== t.kid) {
        cardsFor.current = t.cards ? t.kid : null;
        setActive(t.kid);
      } else setStack(t.cards ? [{ r: 'tab', tab: 'home' }, { r: 'subject', subject: 'englisch' }] : [{ r: 'tab', tab: 'home' }]);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);

  // Sprungmarken von der Homepage: …/#anmelden (Konto in den Einstellungen), …/#eltern (Eltern-Bereich)
  useEffect(() => {
    const jump = location.hash.slice(1);
    if (jump !== 'anmelden' && jump !== 'eltern') return;
    history.replaceState(history.state, '', location.pathname + location.search);
    if (profile) push(jump === 'eltern' ? { r: 'parent' } : { r: 'settings' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) {
    if (route.r === 'profile-new') return <ProfileEdit onDone={() => setStack([{ r: 'tab', tab: 'home' }])} onCancel={() => setStack([{ r: 'tab', tab: 'home' }])} />;
    if (route.r === 'parent' || route.r === 'parent-child')
      return parentView(route, () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ r: 'tab', tab: 'home' }])), (id) => setStack((s) => [...s, { r: 'parent-child', id }]));
    return <Welcome data={data} onNew={() => setStack([{ r: 'profile-new' }])} onParent={() => setStack([{ r: 'parent' }])} />;
  }

  const practiceSkill = (s: Skill) => push({ r: 'practice', title: s.title, tasks: buildPractice(s, progress), mode: 'übung', again: () => buildPractice(s, data.progress[profile.id] ?? progress), n: 0 });
  // Vokabeltrainer: nur Wortfelder, wählbare Länge
  const practiceVocab = ({ skills, n, kind, dir }: VocabStart) => {
    const ids = skills.map((s) => s.id);
    const title = `${kind === 'diktat' ? 'Diktat' : 'Vokabeln'}: ${skills.length === 1 ? skills[0].title : `${skills.length} Wortfelder`}`;
    if (kind === 'karten') push({ r: 'cards', skillIds: ids, size: n, dir, n: 0 });
    else if (kind === 'diktat') push({ r: 'practice', title, tasks: buildDictation(ids, progress, n), mode: 'übung', again: () => buildDictation(ids, data.progress[profile.id] ?? progress, n), n: 0 });
    else push({ r: 'practice', title, tasks: buildMix(skills, progress, undefined, undefined, n), mode: 'übung', again: () => buildMix(skills, data.progress[profile.id] ?? progress, undefined, undefined, n), n: 0 });
  };
  const practiceMix = (skills: Skill[], title: string) => push({ r: 'practice', title, tasks: buildMix(skills, progress), mode: 'übung', again: () => buildMix(skills, data.progress[profile.id] ?? progress), n: 0 });
  const reviewAll = (subject?: Subject) => {
    const skills = ALL_SKILLS.filter((s) => !subject || s.subject === subject);
    const tasks = buildReview(skills, progress);
    if (tasks.length) push({ r: 'practice', title: 'Fehler-Kiste', tasks, mode: 'wiederholung', n: 0 });
  };

  let body: JSX.Element;
  switch (route.r) {
    case 'tab':
      body =
        route.tab === 'home' ? (
          <Home profile={profile} progress={progress} onSubject={(subject) => push({ r: 'subject', subject })} onReview={() => reviewAll()} onPractice={practiceSkill} onProfile={() => push({ r: 'settings' })} onMix={practiceMix} onStartTest={(spec) => push({ r: 'test', spec })} />
        ) : route.tab === 'review' ? (
          <ReviewScreen profile={profile} progress={progress} onReviewAll={reviewAll} onPractice={practiceSkill} onPracticePattern={(s, tag, label) => push({ r: 'practice', title: `${label} üben`, tasks: buildPattern(s, tag, progress), mode: 'übung', again: () => buildPattern(s, tag, data.progress[profile.id] ?? progress), n: 0 })} />
        ) : route.tab === 'tests' ? (
          <TestSetup profile={profile} progress={progress} onStart={(spec) => push({ r: 'test', spec })} onOpenResult={(id) => push({ r: 'result', id })} onPractice={practiceMix} onPrint={(spec) => push({ r: 'print', spec })} />
        ) : (
          <StatsScreen profile={profile} progress={progress} onPractice={practiceSkill} onOpenTest={(id) => push({ r: 'result', id })} />
        );
      break;
    case 'subject':
      body = <SubjectScreen profile={profile} progress={progress} subject={route.subject} onBack={back} onPractice={practiceSkill} onMix={practiceMix} onBlitz={(skill) => push({ r: 'blitz', skill, n: 0 })} onVocab={practiceVocab} />;
      break;
    case 'practice':
      return (
        <Practice
          key={route.n}
          profile={profile}
          title={route.title}
          tasks={route.tasks}
          mode={route.mode}
          onExit={back}
          onPracticePattern={(id, tag, label) => {
            const s = ALL_SKILLS.find((k) => k.id === id);
            if (s) replace({ r: 'practice', title: `${label} üben`, tasks: buildPattern(s, tag, data.progress[profile.id] ?? progress), mode: 'übung', again: () => buildPattern(s, tag, data.progress[profile.id] ?? progress), n: route.n + 1 });
          }}
          onRestart={route.again ? () => replace({ ...route, tasks: route.again!(), n: route.n + 1 }) : dueReviews(data.progress[profile.id] ?? progress, Date.now()).length && route.mode === 'wiederholung' ? () => replace({ ...route, tasks: buildReview(ALL_SKILLS, data.progress[profile.id] ?? progress), n: route.n + 1 }) : undefined}
        />
      );
    case 'blitz':
      return <Blitz key={route.n} profile={profile} progress={progress} skill={route.skill} onExit={back} />;
    case 'cards':
      return (
        <Suspense fallback={<Loading />}>
          <VocabCards key={route.n} profile={profile} progress={progress} skillIds={route.skillIds} n={route.size} dir={route.dir} onExit={back} onRestart={() => replace({ ...route, n: route.n + 1 })} />
        </Suspense>
      );
    case 'print':
      return (
        <Suspense fallback={<Loading />}>
          <PrintView profile={profile} spec={route.spec} onBack={back} />
        </Suspense>
      );
    case 'test':
      return <TestRun profile={profile} spec={route.spec} onCancel={back} onDone={(id) => replace({ r: 'result', id })} />;
    case 'result': {
      const res = progress.tests.find((t) => t.id === route.id);
      if (!res) {
        body = <div className="empty">Test nicht gefunden.</div>;
        break;
      }
      return <TestResultView profile={profile} result={res} onBack={back} onPractice={(tasks) => push({ r: 'practice', title: 'Fehler aus dem Test', tasks, mode: 'wiederholung', n: 0 })} />;
    }
    case 'profile-edit':
      return <ProfileEdit profile={profile} limited={hasPin()} onDone={back} onCancel={back} />;
    case 'profile-new':
      return <ProfileEdit onDone={() => setStack([{ r: 'tab', tab: 'home' }])} onCancel={back} />;
    case 'settings':
      return <Settings data={data} profile={profile} onEdit={() => push({ r: 'profile-edit' })} onNew={() => push({ r: 'profile-new' })} onParent={() => push({ r: 'parent' })} onBack={back} />;
    case 'parent':
    case 'parent-child':
      return parentView(route, back, (id) => push({ r: 'parent-child', id }));
  }

  const due = dueReviews(progress, Date.now()).length;
  const activeTab = route.r === 'tab' ? route.tab : route.r === 'subject' ? 'home' : null;
  return (
    <>
      <main className="app">
        {hasSaveError() && (
          <div className="save-warn" role="alert">
            {mirrorOk() ? (
              <>
                ⚠️ <b>Speicher fast voll:</b> Der Lernstand wird gerade im Zweitspeicher des Browsers gesichert. Bitte Eltern Bescheid sagen – mit Anmeldung (Abgleich) bleibt alles zusätzlich in der Cloud.
              </>
            ) : (
              <>
                ⚠️ <b>Speicher voll:</b> Dieses Gerät kann den Lernstand gerade nicht speichern. Bitte Eltern Bescheid sagen – mit Anmeldung (Abgleich) bleibt alles in der Cloud gesichert.
              </>
            )}
          </div>
        )}
        {hasLoadError() ? (
          <div className="card" role="alert">
            <h2>Lernstand gerade nicht lesbar</h2>
            <p>Der Browser lässt den Schlaufuchs im Moment nicht an seinen Speicher. Es ist nichts verloren – bitte die App neu öffnen.</p>
            <button className="btn ok block" onClick={() => location.reload()}>
              Neu laden
            </button>
          </div>
        ) : (
          body
        )}
      </main>
      <nav className="tabbar" aria-label="Menü">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${activeTab === t.id ? 'on' : ''}`} onClick={() => goTab(t.id)} aria-current={activeTab === t.id ? 'page' : undefined}>
              <span className="ti">{t.icon}</span>
              {t.label}
              {t.id === 'review' && due > 0 && <span className="badge">{due}</span>}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
