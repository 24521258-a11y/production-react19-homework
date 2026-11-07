
import { MAX_VOICES } from './pianoNotes';

/*
 * HW2 - Polyphonic Piano Audio Engine
 * Maximum 8 simultaneous voices.
 * FIFO voice stealing.
 */

export class PianoEngine {
  constructor() {
    this.context = null;
    this.voices = new Map();
    this.nextVoiceId = 0;
  }

  async initialize() {
    if (!this.context) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported.');
      }

      this.context = new AudioContextClass();
    }

    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  stopVoice(voiceId) {
    const voice = this.voices.get(voiceId);

    if (!voice || !this.context) return;

    const now = this.context.currentTime;

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(
      Math.max(voice.gain.gain.value, 0.001),
      now,
    );

    voice.gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + 0.08,
    );

    try {
      voice.oscillator.stop(now + 0.09);
    } catch {
      // The oscillator was already stopped.
    }

    this.voices.delete(voiceId);
  }

  playNote(note) {
    if (!this.context) return null;

    // Do not play the same MIDI note twice while held.
    for (const voice of this.voices.values()) {
      if (voice.midi === note.midi) {
        return voice.id;
      }
    }

    // FIFO: remove the oldest voice when limit is reached.
    if (this.voices.size >= MAX_VOICES) {
      const oldestVoiceId =
        this.voices.keys().next().value;

      this.stopVoice(oldestVoiceId);
    }

    const context = this.context;
    const now = context.currentTime;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      note.frequency,
      now,
    );

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(
      0.17,
      now + 0.02,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now);

    this.nextVoiceId += 1;

    const voiceId = this.nextVoiceId;

    this.voices.set(voiceId, {
      id: voiceId,
      midi: note.midi,
      oscillator,
      gain,
      startedAt: now,
    });

    return voiceId;
  }

  releaseNote(midi) {
    for (const [voiceId, voice] of this.voices) {
      if (voice.midi === midi) {
        this.stopVoice(voiceId);
        break;
      }
    }
  }

  getActiveNotes() {
    return Array.from(
      this.voices.values(),
      (voice) => voice.midi,
    );
  }

  getVoiceCount() {
    return this.voices.size;
  }

  stopAll() {
    for (const voiceId of Array.from(this.voices.keys())) {
      this.stopVoice(voiceId);
    }
  }

  async dispose() {
    this.stopAll();

    if (this.context && this.context.state !== 'closed') {
      await this.context.close();
    }

    this.context = null;
  }
}
