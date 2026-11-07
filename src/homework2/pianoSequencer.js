
/*
 * HW2 - Concurrent Piano Sequencer
 *
 * Each recorded note contains:
 * midi, freqHz, durationMs, deltaMs
 *
 * deltaMs is measured from the previous note start.
 * Overlapping notes are played concurrently.
 */

export function createRecordingEvent({
  midi,
  freqHz,
  durationMs,
  deltaMs,
}) {
  return {
    midi,
    freqHz,
    durationMs: Math.max(1, Math.round(durationMs)),
    deltaMs: Math.max(0, Math.round(deltaMs)),
  };
}

export function waitWithAbort(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(
        new DOMException('Playback aborted', 'AbortError')
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, Math.max(0, ms));

    function handleAbort() {
      window.clearTimeout(timeoutId);
      signal.removeEventListener('abort', handleAbort);

      reject(
        new DOMException('Playback aborted', 'AbortError')
      );
    }

    signal.addEventListener('abort', handleAbort, {
      once: true,
    });
  });
}

export async function playSequence({
  events,
  speed,
  signal,
  onNoteStart,
  onNoteEnd,
}) {
  let targetElapsedMs = 0;
  const startTime = performance.now();
  const releaseTasks = [];

  for (const event of events) {
    if (signal.aborted) {
      throw new DOMException(
        'Playback aborted',
        'AbortError'
      );
    }

    targetElapsedMs += event.deltaMs / speed;

    const elapsed = performance.now() - startTime;
    const remaining = targetElapsedMs - elapsed;

    await waitWithAbort(remaining, signal);

    if (signal.aborted) {
      throw new DOMException(
        'Playback aborted',
        'AbortError'
      );
    }

    onNoteStart(event.midi);

    // Each release is independently scheduled.
    // This allows notes to overlap naturally.
    const releaseTask = (async () => {
      try {
        await waitWithAbort(
          event.durationMs / speed,
          signal
        );

        if (!signal.aborted) {
          onNoteEnd(event.midi);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          throw error;
        }
      }
    })();

    releaseTasks.push(releaseTask);
  }

  await Promise.all(releaseTasks);
}
