
/*
 * Homework 1 - Drum audio engine
 * Synthesized sounds using the Web Audio API.
 * No external audio files required.
 */

function createNoise(context, duration = 0.5) {
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  );

  const samples = buffer.getChannelData(0);

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}

function playTone(context, {
  frequency = 180,
  endFrequency = 50,
  duration = 0.25,
  volume = 0.65,
  type = 'sine',
} = {}) {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;

  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(1, endFrequency),
    now + duration,
  );

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + duration,
  );

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playNoise(context, {
  duration = 0.2,
  volume = 0.4,
  filterType = 'highpass',
  cutoff = 1200,
} = {}) {
  const now = context.currentTime;
  const noise = createNoise(context, duration + 0.05);
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  filter.type = filterType;
  filter.frequency.value = cutoff;

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + duration,
  );

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(now);
  noise.stop(now + duration + 0.02);
}

export function playDrum(context, sound) {
  switch (sound) {
    case 'kick':
      playTone(context, {
        frequency: 160,
        endFrequency: 42,
        duration: 0.4,
        volume: 0.85,
      });
      break;

    case 'snare':
      playNoise(context, {
        duration: 0.18,
        volume: 0.55,
        cutoff: 1400,
      });
      playTone(context, {
        frequency: 185,
        endFrequency: 110,
        duration: 0.1,
        volume: 0.25,
        type: 'triangle',
      });
      break;

    case 'closed-hat':
      playNoise(context, {
        duration: 0.075,
        volume: 0.3,
        cutoff: 6500,
      });
      break;

    case 'open-hat':
      playNoise(context, {
        duration: 0.5,
        volume: 0.24,
        cutoff: 5200,
      });
      break;

    case 'tom':
      playTone(context, {
        frequency: 230,
        endFrequency: 90,
        duration: 0.32,
        volume: 0.65,
        type: 'triangle',
      });
      break;

    case 'clap':
      playNoise(context, {
        duration: 0.13,
        volume: 0.45,
        cutoff: 1800,
      });
      break;

    case 'crash':
      playNoise(context, {
        duration: 0.85,
        volume: 0.32,
        cutoff: 3800,
      });
      break;

    default:
      break;
  }
}
