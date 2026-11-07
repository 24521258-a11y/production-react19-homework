
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  PIANO_NOTES,
  MAX_VOICES,
} from './pianoNotes';

import { PianoEngine } from './pianoEngine';

import {
  createRecordingEvent,
  playSequence,
} from './pianoSequencer';

import './Piano.css';

const WHITE_WIDTH = 30;
const BLACK_WIDTH = 18;

const NOTE_BY_MIDI = new Map(
  PIANO_NOTES.map((note) => [note.midi, note])
);

const NOTE_POSITIONS = (() => {
  let whiteCount = 0;

  return PIANO_NOTES.map((note) => {
    const position = note.isBlack
      ? whiteCount * WHITE_WIDTH - BLACK_WIDTH / 2
      : whiteCount * WHITE_WIDTH;

    if (!note.isBlack) {
      whiteCount += 1;
    }

    return { ...note, position };
  });
})();

const PianoKey = memo(function PianoKey({
  note,
  active,
  onPlay,
  onRelease,
}) {
  return (
    <button
      type="button"
      className={[
        'piano-key',
        note.isBlack
          ? 'piano-key--black'
          : 'piano-key--white',
        active ? 'piano-key--active' : '',
      ].join(' ')}
      style={{ left: note.position }}
      aria-label={`Piano note ${note.name}`}
      aria-pressed={active}
      title={note.name}
      onPointerDown={(event) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(
          event.pointerId
        );

        onPlay(note.midi);
      }}
      onPointerUp={() => onRelease(note.midi)}
      onPointerCancel={() => onRelease(note.midi)}
      onLostPointerCapture={() => onRelease(note.midi)}
      onKeyDown={(event) => {
        if (
          (event.key === 'Enter' ||
            event.key === ' ') &&
          !event.repeat
        ) {
          event.preventDefault();
          onPlay(note.midi);
        }
      }}
      onKeyUp={(event) => {
        if (
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          onRelease(note.midi);
        }
      }}
    >
      <span
        className="piano-key__label"
        aria-hidden="true"
      >
        {!note.isBlack &&
        ['A0', 'C4', 'C8'].includes(note.name)
          ? note.name
          : ''}
      </span>
    </button>
  );
});

export default function Piano() {
  const engineRef = useRef(null);
  const initializationRef = useRef(null);

  const heldNotesRef = useRef(new Set());
  const mountedRef = useRef(false);

  const recordingRef = useRef(false);
  const recordStartRef = useRef(0);
  const lastStartRef = useRef(0);
  const rawEventsRef = useRef([]);
  const openEventsRef = useRef(new Map());

  const playbackControllerRef = useRef(null);
  const demoTimerRef = useRef(null);

  const [activeNotes, setActiveNotes] = useState([]);
  const [voiceCount, setVoiceCount] = useState(0);
  const [lastNote, setLastNote] = useState('None');
  const [fifoCount, setFifoCount] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(
    'Ready to play.'
  );

  const syncVoices = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !mountedRef.current) return;

    setActiveNotes(engine.getActiveNotes());
    setVoiceCount(engine.getVoiceCount());
  }, []);

  const ensureAudio = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return null;

    if (!initializationRef.current) {
      initializationRef.current = engine.initialize()
        .catch((err) => {
          initializationRef.current = null;
          throw err;
        });
    }

    await initializationRef.current;

    return engineRef.current === engine
      ? engine
      : null;
  }, []);

  const stopPlayback = useCallback(() => {
    const controller = playbackControllerRef.current;

    if (controller) {
      controller.abort();
      playbackControllerRef.current = null;
    }

    engineRef.current?.stopAll();
    heldNotesRef.current.clear();

    if (mountedRef.current) {
      setIsPlaying(false);
      setMessage('Playback stopped.');
      syncVoices();
    }
  }, [syncVoices]);

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current !== null) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  const finalizeOpenEvents = useCallback(() => {
    const now = performance.now();

    for (const event of openEventsRef.current.values()) {
      event.durationMs = Math.max(
        1,
        now - event.startedAt
      );
    }

    openEventsRef.current.clear();
  }, []);

  const stopRecording = useCallback(() => {
    if (!recordingRef.current) return;

    finalizeOpenEvents();

    recordingRef.current = false;
    setIsRecording(false);

    const result = rawEventsRef.current.map(
      (event) =>
        createRecordingEvent({
          midi: event.midi,
          freqHz: event.freqHz,
          durationMs: event.durationMs,
          deltaMs: event.deltaMs,
        })
    );

    setRecordedEvents(result);
    setMessage(
      `Recording saved: ${result.length} notes.`
    );
  }, [finalizeOpenEvents]);

  const stopAllNotes = useCallback(() => {
    stopDemo();
    stopPlayback();

    heldNotesRef.current.clear();
    engineRef.current?.stopAll();

    syncVoices();
  }, [stopDemo, stopPlayback, syncVoices]);

  const startRecording = useCallback(() => {
    stopAllNotes();

    rawEventsRef.current = [];
    openEventsRef.current.clear();

    const now = performance.now();

    recordStartRef.current = now;
    lastStartRef.current = now;

    recordingRef.current = true;

    setRecordedEvents([]);
    setIsRecording(true);
    setError('');
    setMessage('Recording started. Play the piano.');
  }, [stopAllNotes]);

  const playNote = useCallback(async (midi) => {
    if (isPlaying || heldNotesRef.current.has(midi)) {
      return;
    }

    const note = NOTE_BY_MIDI.get(midi);
    if (!note) return;

    heldNotesRef.current.add(midi);

    // Record the actual user press time,
    // not the time when AudioContext finishes resuming.
    if (recordingRef.current) {
      const now = performance.now();
      const previous = rawEventsRef.current.length;

      const deltaMs = previous === 0
        ? now - recordStartRef.current
        : now - lastStartRef.current;

      const event = {
        midi,
        freqHz: note.frequency,
        durationMs: 0,
        deltaMs,
        startedAt: now,
      };

      rawEventsRef.current.push(event);
      openEventsRef.current.set(midi, event);
      lastStartRef.current = now;
    }

    try {
      const engine = await ensureAudio();

      if (
        !engine ||
        !heldNotesRef.current.has(midi)
      ) {
        return;
      }

      const previousNotes = engine.getActiveNotes();

      engine.playNote(note);

      if (
        previousNotes.length >= MAX_VOICES &&
        !previousNotes.includes(midi)
      ) {
        setFifoCount((count) => count + 1);
      }

      setLastNote(note.name);
      setError('');
      syncVoices();
    } catch (err) {
      heldNotesRef.current.delete(midi);
      setError(err.message);
    }
  }, [ensureAudio, isPlaying, syncVoices]);

  const releaseNote = useCallback((midi) => {
    heldNotesRef.current.delete(midi);

    const event = openEventsRef.current.get(midi);

    if (event) {
      event.durationMs = Math.max(
        1,
        performance.now() - event.startedAt
      );

      openEventsRef.current.delete(midi);
    }

    engineRef.current?.releaseNote(midi);
    syncVoices();
  }, [syncVoices]);

  const testFifo = useCallback(async () => {
    if (isRecording || isPlaying) return;

    stopAllNotes();

    try {
      const engine = await ensureAudio();
      if (!engine) return;

      const testNotes = PIANO_NOTES.filter(
        (note) => note.midi >= 60 && note.midi <= 68
      );

      testNotes.forEach((note) => {
        engine.playNote(note);
      });

      setFifoCount((count) => count + 1);
      setLastNote('FIFO test');
      setMessage('9 notes requested; 8 voices retained.');
      syncVoices();

      demoTimerRef.current = window.setTimeout(() => {
        if (engineRef.current === engine) {
          engine.stopAll();
          syncVoices();
        }
        demoTimerRef.current = null;
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  }, [
    ensureAudio,
    isPlaying,
    isRecording,
    stopAllNotes,
    syncVoices,
  ]);

  const startPlayback = useCallback(async () => {
    if (
      isRecording ||
      isPlaying ||
      recordedEvents.length === 0
    ) {
      return;
    }

    stopDemo();
    engineRef.current?.stopAll();
    heldNotesRef.current.clear();
    syncVoices();

    const controller = new AbortController();
    playbackControllerRef.current = controller;

    setIsPlaying(true);
    setError('');
    setMessage(`Playing recording at ${speed}x.`);

    try {
      const engine = await ensureAudio();

      if (!engine || controller.signal.aborted) {
        return;
      }

      await playSequence({
        events: recordedEvents,
        speed,
        signal: controller.signal,

        onNoteStart: (midi) => {
          if (controller.signal.aborted) return;

          const note = NOTE_BY_MIDI.get(midi);
          if (!note) return;

          const before = engine.getActiveNotes();

          engine.playNote(note);

          if (
            before.length >= MAX_VOICES &&
            !before.includes(midi)
          ) {
            setFifoCount((count) => count + 1);
          }

          setLastNote(note.name);
          syncVoices();
        },

        onNoteEnd: (midi) => {
          if (controller.signal.aborted) return;

          engine.releaseNote(midi);
          syncVoices();
        },
      });

      if (!controller.signal.aborted) {
        setMessage('Playback completed.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      if (
        playbackControllerRef.current === controller
      ) {
        playbackControllerRef.current = null;

        engineRef.current?.stopAll();
        setIsPlaying(false);
        syncVoices();
      }
    }
  }, [
    ensureAudio,
    isPlaying,
    isRecording,
    recordedEvents,
    speed,
    stopDemo,
    syncVoices,
  ]);

  const clearRecording = useCallback(() => {
    stopPlayback();
    stopRecording();

    rawEventsRef.current = [];
    openEventsRef.current.clear();

    setRecordedEvents([]);
    setMessage('Recording cleared.');
  }, [stopPlayback, stopRecording]);

  useEffect(() => {
    const engine = new PianoEngine();

    engineRef.current = engine;
    mountedRef.current = true;

    const heldNotes = heldNotesRef.current;

    return () => {
      mountedRef.current = false;
      recordingRef.current = false;

      playbackControllerRef.current?.abort();
      playbackControllerRef.current = null;

      if (demoTimerRef.current !== null) {
        window.clearTimeout(demoTimerRef.current);
      }

      heldNotes.clear();
      openEventsRef.current.clear();

      if (engineRef.current === engine) {
        engineRef.current = null;
        initializationRef.current = null;
      }

      void engine.dispose();
    };
  }, []);

  return (
    <section
      className="piano-studio"
      aria-labelledby="piano-title"
    >
      <header className="piano-header">
        <p className="piano-eyebrow">
          HOMEWORK 02 / REACT 19
        </p>

        <h1 id="piano-title">
          88-Key Polyphonic Piano
        </h1>

        <p>
          Eight-voice polyphony, FIFO voice stealing,
          recording and concurrent playback.
        </p>
      </header>

      <section
        className="piano-dashboard"
        aria-label="Piano statistics"
      >
        <article>
          <span>Total Keys</span>
          <strong>88</strong>
        </article>

        <article>
          <span>Active Voices</span>
          <strong>{voiceCount} / 8</strong>
        </article>

        <article>
          <span>Last Note</span>
          <strong>{lastNote}</strong>
        </article>
      </section>

      <section
        className="piano-test-panel"
        aria-label="Polyphony controls"
      >
        <h2>Polyphony & FIFO Testing</h2>

        <p>
          The ninth note replaces the oldest voice.
          Maximum eight active voices.
        </p>

        <p className="piano-fifo-count">
          FIFO Voice Steals: {fifoCount}
        </p>

        <section className="piano-test-buttons">
          <button
            type="button"
            onClick={testFifo}
            disabled={isRecording || isPlaying}
          >
            Test 9 Notes (FIFO)
          </button>

          <button
            type="button"
            onClick={stopAllNotes}
          >
            Stop All Notes
          </button>
        </section>
      </section>

      <section
        className="piano-sequencer"
        aria-labelledby="sequencer-title"
      >
        <h2 id="sequencer-title">
          Concurrent FIFO Sequencer
        </h2>

        <p>
          Record your performance and replay it at
          different speeds while preserving note
          overlaps and durations.
        </p>

        <section className="piano-sequencer-stats">
          <span>
            Status:{' '}
            <strong>
              {isRecording
                ? 'Recording'
                : isPlaying
                  ? 'Playing'
                  : 'Idle'}
            </strong>
          </span>

          <span>
            Recorded Notes:{' '}
            <strong>{recordedEvents.length}</strong>
          </span>
        </section>

        <section className="piano-test-buttons">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={isPlaying}
            >
              Record
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="piano-recording-button"
            >
              Stop Recording
            </button>
          )}

          <button
            type="button"
            onClick={startPlayback}
            disabled={
              isRecording ||
              isPlaying ||
              recordedEvents.length === 0
            }
          >
            Play Recording
          </button>

          <button
            type="button"
            onClick={stopPlayback}
          >
            Stop Playback
          </button>

          <button
            type="button"
            onClick={clearRecording}
          >
            Clear Recording
          </button>
        </section>

        <section className="piano-speed">
          <label htmlFor="playback-speed">
            Playback Speed
          </label>

          <select
            id="playback-speed"
            value={speed}
            disabled={isPlaying || isRecording}
            onChange={(event) => {
              setSpeed(Number(event.target.value));
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </section>

        <p
          className="piano-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>

        {recordedEvents.length > 0 && (
          <section
            className="piano-events"
            aria-labelledby="recorded-events-title"
          >
            <h3 id="recorded-events-title">
              Recorded Events
            </h3>

            <div className="piano-events-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Note</th>
                    <th>MIDI</th>
                    <th>Freq (Hz)</th>
                    <th>Duration</th>
                    <th>Delta</th>
                  </tr>
                </thead>

                <tbody>
                  {recordedEvents.map((event, index) => (
                    <tr key={`${index}-${event.midi}`}>
                      <td>
                        {NOTE_BY_MIDI.get(event.midi)?.name}
                      </td>
                      <td>{event.midi}</td>
                      <td>{event.freqHz.toFixed(2)}</td>
                      <td>{event.durationMs} ms</td>
                      <td>{event.deltaMs} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>

      {error && (
        <p className="piano-error" role="alert">
          {error}
        </p>
      )}

      <p className="piano-hint">
        Scroll horizontally to explore A0–C8.
        Press and hold any piano key to play.
      </p>

      <section
        className="piano-scroll"
        aria-label="Scrollable piano keyboard"
      >
        <section
          className="piano-keyboard"
          aria-label="88 piano keys"
        >
          {NOTE_POSITIONS.map((note) => (
            <PianoKey
              key={note.id}
              note={note}
              active={activeNotes.includes(note.midi)}
              onPlay={playNote}
              onRelease={releaseNote}
            />
          ))}
        </section>
      </section>

      <footer className="piano-footer">
        <p>Created by Dinh Nhat Bao Nhi</p>
        <p>
          React 19 · Web Audio API · AbortController
        </p>
      </footer>
    </section>
  );
}
