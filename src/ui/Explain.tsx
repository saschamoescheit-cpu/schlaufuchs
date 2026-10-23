// Erklärung eines Themas: Text, Bild, Vorlesen und passende YouTube-Videos.
import { useEffect, useMemo, useState } from 'react';
import type { Skill } from '../engine/types';
import type { VideoRef } from '../content/videos';

// Die Videoliste wird erst beim ersten Öffnen einer Erklärung geladen (kleineres Startpaket)
let videoCache: Record<string, VideoRef[]> | null = null;
const loadVideos = () => import('../content/videos').then((m) => (videoCache = m.VIDEOS));
import { Rich, Sheet, Speak } from './common';
import { correctText } from '../engine/check';
import { Visual } from './Visual';
import { WORDS } from '../content/words';
import { speak } from './speech';
import { mixedParts } from './mixed';

export function VideoCard({ v, onPlay }: { v: VideoRef; onPlay: () => void }) {
  return (
    <button className="video-card" onClick={onPlay}>
      <div className="video-thumb" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${v.id}/mqdefault.jpg)` }}>
        <span className="len">{v.len}</span>
        <span className="play">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <div className="grow">
        <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{v.title}</div>
        <div className="muted small">{v.channel}</div>
      </div>
    </button>
  );
}

export function VideoPlayer({ v, onClose }: { v: VideoRef; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label={v.title}>
      <div className="stack">
        <div className="player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <div>
          <b>{v.title}</b>
          <div className="muted small">{v.channel} · YouTube</div>
        </div>
        <a className="btn ghost block small" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">
          Auf YouTube öffnen
        </a>
        <button className="btn block" onClick={onClose}>
          Fertig
        </button>
      </div>
    </Sheet>
  );
}

export function Videos({ skill }: { skill: Skill }) {
  const [playing, setPlaying] = useState<VideoRef | null>(null);
  const [all, setAll] = useState(videoCache);
  useEffect(() => {
    if (!all) void loadVideos().then(setAll).catch(() => setAll({}));
  }, [all]);
  const vids = all?.[skill.id] ?? [];
  return (
    <div className="stack" style={{ gap: 10 }}>
      <h3>🎬 Erklärvideo{vids.length > 1 ? 's' : ''}</h3>
      {vids.map((v) => (
        <VideoCard key={v.id} v={v} onPlay={() => setPlaying(v)} />
      ))}
      <a className="btn ghost small" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(skill.explain.videoQuery)}`} target="_blank" rel="noreferrer">
        Weitere Videos auf YouTube suchen
      </a>
      {playing && <VideoPlayer v={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

export function ExplainBody({ skill }: { skill: Skill }) {
  const text = skill.explain.text.join(' ');
  // Englisch-Themen: Deutsch mit deutscher, Englisch mit englischer Stimme (Nachtlauf 23.10.2026)
  const parts = useMemo(() => mixedParts(skill.subject, text, skill.title), [skill, text]);
  return (
    <div className="stack">
      <div className="row">
        <span style={{ fontSize: '2rem' }}>{skill.icon}</span>
        <h2 className="grow">{skill.title}</h2>
        <Speak text={`${skill.title}. ${text}`} parts={parts} label="Erklärung vorlesen" />
      </div>
      <div className="explain-text">
        {skill.explain.text.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </div>
      {skill.explain.visual && (
        <div className="visual-box">
          <Visual v={skill.explain.visual} />
        </div>
      )}
      <Example skill={skill} />
      <WordList skill={skill} />
      <Videos skill={skill} />
    </div>
  );
}

/** Englisch-Wortfelder: alle Wörter zum Ansehen und Anhören (vor dem Üben) */
function WordList({ skill }: { skill: Skill }) {
  const words = WORDS[skill.id];
  if (!words?.length) return null;
  return (
    <details className="card word-list">
      <summary>
        <h3>📖 Alle Wörter ({words.length})</h3>
      </summary>
      <div className="word-grid">
        {words.map((w) => (
          <button key={w.en} type="button" className="word-item" onClick={() => speak(w.en, 'en')} aria-label={`${w.en} – ${w.de}. Anhören`}>
            <span className="word-pic" aria-hidden>
              {w.hex ? <i style={{ background: w.hex }} /> : (w.e ?? w.txt)}
            </span>
            <span className="word-txt">
              <b lang="en">{w.en}</b>
              <span className="small muted" lang="de">{w.de}</span>
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}

/** Vorgerechnetes Beispiel: eine echte (leichte) Aufgabe des Themas – erst selbst überlegen, dann Lösungsweg aufklappen */
function Example({ skill }: { skill: Skill }) {
  const make = () => skill.generate(Math.random, 1);
  const [task, setTask] = useState(make);
  const [open, setOpen] = useState(false);
  return (
    <div className="card example">
      <div className="row">
        <h3 className="grow">✏️ Ein Beispiel</h3>
        <button
          className="btn ghost small"
          onClick={() => {
            setTask(make());
            setOpen(false);
          }}
        >
          Neues Beispiel
        </button>
      </div>
      <div className="prompt" style={{ fontSize: '1.15rem' }}>
        <Rich text={task.prompt} />
      </div>
      {task.listen && (
        <div className="listen-wrap">
          <Speak big text={task.listen.text} lang={task.listen.lang} slow={task.listen.slow} label="Anhören" />
        </div>
      )}
      {task.visual && (
        <div className="visual-box">
          <Visual v={task.visual} />
        </div>
      )}
      {task.answer.type === 'trace' && (
        <div className="visual-box">
          <Visual v={{ kind: 'word', word: task.answer.value }} />
        </div>
      )}
      {task.answer.type === 'choice' && <div className="small muted">Auswahl: {task.answer.options.join(' · ')}</div>}
      {!open ? (
        <button className="btn ok block small" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
          Überlege selbst – dann Lösung zeigen
        </button>
      ) : (
        <>
          <ol className="steps">
            {task.solution.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {task.solutionVisual && (
            <div className="visual-box">
              <Visual v={task.solutionVisual} />
            </div>
          )}
          <div>
            Lösung: <b>{correctText(task.answer)}</b>
          </div>
        </>
      )}
    </div>
  );
}

export function ExplainSheet({ skill, onClose, onPractice }: { skill: Skill; onClose: () => void; onPractice?: () => void }) {
  return (
    <Sheet onClose={onClose} label={skill.title}>
      <div className="stack">
        <ExplainBody skill={skill} />
        {onPractice && (
          <button className="btn ok block" onClick={onPractice}>
            Jetzt üben
          </button>
        )}
        <button className="btn ghost block" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  );
}
