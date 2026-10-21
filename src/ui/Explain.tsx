// Erklärung eines Themas: Text, Bild, Vorlesen und passende YouTube-Videos.
import { useState } from 'react';
import type { Skill } from '../engine/types';
import { VIDEOS, type VideoRef } from '../content/videos';
import { Sheet, Speak } from './common';
import { Visual } from './Visual';

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
  const vids = VIDEOS[skill.id] ?? [];
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
  return (
    <div className="stack">
      <div className="row">
        <span style={{ fontSize: '2rem' }}>{skill.icon}</span>
        <h2 className="grow">{skill.title}</h2>
        <Speak text={`${skill.title}. ${text}`} label="Erklärung vorlesen" />
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
      <Videos skill={skill} />
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
