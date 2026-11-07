
import { useState } from 'react';

import DrumKit from './App';
import Piano from './homework2/Piano';
import PubgArena from './homework3/PubgArena';

const HOMEWORKS = [
  { id: 'hw1', label: 'HW1 – Drum Kit' },
  { id: 'hw2', label: 'HW2 – Piano' },
  { id: 'hw3', label: 'HW3 – PUBG Arena' },
];

export default function HomeworksHub() {
  const [homework, setHomework] = useState('hw1');

  return (
    <>
      <nav
        aria-label="Homework navigation"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          padding: '20px 12px',
          background: '#111b2e',
          borderBottom: '1px solid #334155',
        }}
      >
        {HOMEWORKS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={homework === item.id}
            onClick={() => setHomework(item.id)}
            style={{
              minHeight: 44,
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid #64748b',
              color: '#ffffff',
              background:
                homework === item.id
                  ? '#155e75'
                  : '#25334b',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {homework === 'hw1' && <DrumKit />}
      {homework === 'hw2' && <Piano />}
      {homework === 'hw3' && <PubgArena />}
    </>
  );
}
