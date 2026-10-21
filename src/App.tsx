import { useCallback, useEffect, useState } from 'react';
import { buildMix, buildPractice, buildReview } from './engine/session';
import { dueReviews, emptyProgress, type Mode } from './engine/learning';
import type { Skill, Subject, Task } from './engine/types';
import { ALL_SKILLS } from './content/curriculum';
import { useData } from './data/store';
import { Home, SubjectScreen } from './screens/Home';
import { Practice } from './screens/Practice';
import { ReviewScreen, StatsScreen } from './screens/Stats';
import { TestResultView, TestRun, TestSetup, type TestSpec } from './screens/Tests';
import { ProfileEdit, Settings, Welcome } from './screens/Profile';
import { ParentChild, ParentHome, PinGate } from './screens/Parent';
import { hasPin, isUnlocked } from './data/parent';
import { stopSpeaking } from './ui/speech';

type Tab = 'home' | 'review' | 'tests' | 'stats';
type Route =
  | { r: 'tab'; tab: Tab }
  | { r: 'subject'; subject: Subject }
  | { r: 'practice'; title: string; tasks: Task[]; mode: Mode; again?: () => Task[]; n: number }
  | { r: 'test'; spec: TestSpec }
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
    if (!isUnlocked()) return <PinGate onOk={() => setTick((t) => t + 1)} onCancel={onBack} />;
    if (r.r === 'parent-child') return <ParentChild data={data} id={r.id} onBack={onBack} />;
    return <ParentHome data={data} onChild={openChild} onBack={onBack} />;
  };

  // Profil gewechselt oder gelöscht → zurück zum Start
  useEffect(() => {
    setStack([{ r: 'tab', tab: 'home' }]);
  }, [data.activeId]);

  if (!profile) {
    if (route.r === 'profile-new') return <ProfileEdit onDone={() => setStack([{ r: 'tab', tab: 'home' }])} onCancel={() => setStack([{ r: 'tab', tab: 'home' }])} />;
    if (route.r === 'parent' || route.r === 'parent-child')
      return parentView(route, () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ r: 'tab', tab: 'home' }])), (id) => setStack((s) => [...s, { r: 'parent-child', id }]));
    return <Welcome data={data} onNew={() => setStack([{ r: 'profile-new' }])} onParent={() => setStack([{ r: 'parent' }])} />;
  }

  const practiceSkill = (s: Skill) => push({ r: 'practice', title: s.title, tasks: buildPractice(s, progress), mode: 'übung', again: () => buildPractice(s, data.progress[profile.id] ?? progress), n: 0 });
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
          <Home profile={profile} progress={progress} onSubject={(subject) => push({ r: 'subject', subject })} onReview={() => reviewAll()} onPractice={practiceSkill} onProfile={() => push({ r: 'settings' })} />
        ) : route.tab === 'review' ? (
          <ReviewScreen profile={profile} progress={progress} onReviewAll={reviewAll} onPractice={practiceSkill} />
        ) : route.tab === 'tests' ? (
          <TestSetup profile={profile} progress={progress} onStart={(spec) => push({ r: 'test', spec })} onOpenResult={(id) => push({ r: 'result', id })} />
        ) : (
          <StatsScreen profile={profile} progress={progress} onPractice={practiceSkill} onOpenTest={(id) => push({ r: 'result', id })} />
        );
      break;
    case 'subject':
      body = <SubjectScreen profile={profile} progress={progress} subject={route.subject} onBack={back} onPractice={practiceSkill} onMix={practiceMix} />;
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
          onRestart={route.again ? () => replace({ ...route, tasks: route.again!(), n: route.n + 1 }) : dueReviews(data.progress[profile.id] ?? progress, Date.now()).length && route.mode === 'wiederholung' ? () => replace({ ...route, tasks: buildReview(ALL_SKILLS, data.progress[profile.id] ?? progress), n: route.n + 1 }) : undefined}
        />
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
      <div className="app">{body}</div>
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
