
const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export const PIANO_NOTES = Array.from(
  { length: 88 },
  (_, index) => {
    const midi = index + 21;
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const name = `${NOTE_NAMES[noteIndex]}${octave}`;

    const frequency =
      440 * 2 ** ((midi - 69) / 12);

    return {
      id: `note-${midi}`,
      midi,
      name,
      frequency,
      isBlack: name.includes('#'),
    };
  }
);

export const WHITE_NOTES = PIANO_NOTES.filter(
  (note) => !note.isBlack
);

export const BLACK_NOTES = PIANO_NOTES.filter(
  (note) => note.isBlack
);

export const MAX_VOICES = 8;
