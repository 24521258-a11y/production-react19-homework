
import { useCallback, useEffect, useRef, useState } from 'react';
import { playDrum } from './audio/drumEngine';
import './App.css';

const PADS = [
  { code: 'KeyW', key: 'W', name: 'Kick', sound: 'kick', color: 'cyan' },
  { code: 'KeyA', key: 'A', name: 'Snare', sound: 'snare', color: 'pink' },
  { code: 'KeyS', key: 'S', name: 'Closed Hat', sound: 'closed-hat', color: 'yellow' },
  { code: 'KeyD', key: 'D', name: 'Open Hat', sound: 'open-hat', color: 'purple' },
  { code: 'KeyJ', key: 'J', name: 'Tom', sound: 'tom', color: 'cyan' },
  { code: 'KeyK', key: 'K', name: 'Clap', sound: 'clap', color: 'pink' },
  { code: 'KeyL', key: 'L', name: 'Crash', sound: 'crash', color: 'yellow' },
];

function DrumPad({ pad, active, disabled, onTrigger }) {
  return (
    <button
      type="button"
      className={`drum-pad drum-pad--${pad.color} ${active ? 'drum-pad--active' : ''}`}
      onClick={() => onTrigger(pad)}
      disabled={disabled}
      aria-label={`${pad.name} drum, keyboard key ${pad.key}`}
      aria-pressed={active}
    >
      <kbd className="pad-key">{pad.key}</kbd>
      <span className="pad-name">{pad.name}</span>
      <span className="pad-indicator" aria-hidden="true" />
    </button>
  );
}

export default function App() {
  const [enabled, setEnabled] = useState(true);
  const [activeKey, setActiveKey] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastHit, setLastHit] = useState('Ready to play');
  const [audioError, setAudioError] = useState('');

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const nextIdRef = useRef(0);

  const triggerPad = useCallback((pad) => {
    if (!enabled) return;

    try {
      if (!audioRef.current) {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported.');
        }

        audioRef.current = new AudioContextClass();
      }

      const context = audioRef.current;

      if (context.state === 'suspended') {
        void context.resume().catch(() => {
          setAudioError('Audio could not be started.');
        });
      }

      playDrum(context, pad.sound);
      setAudioError('');
    } catch (error) {
      setAudioError(error.message);
      return;
    }

    setLastHit(`${pad.key} - ${pad.name}`);
    setActiveKey(pad.code);

    nextIdRef.current += 1;
    const hit = {
      id: nextIdRef.current,
      label: pad.name,
      key: pad.key,
    };

    setHistory((previous) => [hit, ...previous].slice(0, 6));

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setActiveKey(null);
    }, 160);
  }, [enabled]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      const pad = PADS.find((item) => item.code === event.code);

      if (!pad || !enabled) return;

      event.preventDefault();
      triggerPad(pad);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, triggerPad]);

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);

      if (audioRef.current) {
        void audioRef.current.close();
      }
    };
  }, []);

  return (
    <main className="studio">
      <header className="studio-header">
        <p className="eyebrow">HOMEWORK 01 / REACT 19</p>

        <h1>Production Studio Drum Kit</h1>

        <p className="subtitle">
          A responsive, keyboard-accessible electronic drum studio
          built with React and the Web Audio API.
        </p>
      </header>

      <section className="studio-panel" aria-labelledby="drum-title">
        <header className="panel-header">
          <span className="panel-label">DRUM MACHINE / 7 PADS</span>

          <button
            type="button"
            className="power-button"
            aria-pressed={enabled}
            onClick={() => {
              setEnabled((previous) => !previous);
              setActiveKey(null);
            }}
          >
            <span className="power-dot" aria-hidden="true" />
            {enabled ? 'Sound On' : 'Sound Off'}
          </button>
        </header>

        <h2 id="drum-title">Play your rhythm</h2>

        <p className="instructions">
          Press W, A, S, D, J, K, L or click a pad to play.
        </p>

        <section className="drum-grid" aria-label="Interactive drum pads">
          {PADS.map((pad) => (
            <DrumPad
              key={pad.code}
              pad={pad}
              active={activeKey === pad.code}
              disabled={!enabled}
              onTrigger={triggerPad}
            />
          ))}
        </section>

        {audioError && (
          <p className="error-message" role="alert">
            {audioError}
          </p>
        )}

        <section className="monitor" aria-labelledby="monitor-title">
          <header className="monitor-heading">
            <h2 id="monitor-title">Live Performance Monitor</h2>
            <span className="live-indicator" aria-hidden="true">
              LIVE
            </span>
          </header>

          <p className="monitor-caption">LAST TRIGGERED SOUND</p>

          <output
            className="last-hit"
            aria-live="polite"
            aria-atomic="true"
          >
            {lastHit}
          </output>

          <header className="log-heading">
            <h3>Visual Hit Log</h3>
            <button
              type="button"
              className="clear-button"
              onClick={() => setHistory([])}
              disabled={history.length === 0}
            >
              Clear History
            </button>
          </header>

          {history.length === 0 ? (
            <p className="empty-log">
              No hits yet. Start playing to see your rhythm history.
            </p>
          ) : (
            <ol className="hit-list" aria-label="Recent drum hits">
              {history.map((hit) => (
                <li key={hit.id} className="hit-item">
                  <kbd>{hit.key}</kbd>
                  <span>{hit.label}</span>
                  <span aria-hidden="true">●</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>

      <footer className="studio-footer">
        <p>Created by Dinh Nhat Bao Nhi</p>
        <p>React 19 · ES6+ · Accessible Web Audio</p>
      </footer>
    </main>
  );
}
