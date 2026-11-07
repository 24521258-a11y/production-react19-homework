
import { useState } from 'react';
import DrumKit from './App';
import Piano from './homework2/Piano';

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
          gap: '12px',
          padding: '20px 12px',
          background: '#111b2e',
          borderBottom: '1px solid #334155',
        }}
      >
        <button
          type="button"
          aria-pressed={homework === 'hw1'}
          onClick={() => setHomework('hw1')}
          style={{
            minHeight: 44,
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid #64748b',
            color: '#fff',
            background: homework === 'hw1' ? '#155e75' : '#25334b',
            cursor: 'pointer',
          }}
        >
          HW1 – Drum Kit
        </button>

        <button
          type="button"
          aria-pressed={homework === 'hw2'}
          onClick={() => setHomework('hw2')}
          style={{
            minHeight: 44,
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid #64748b',
            color: '#fff',
            background: homework === 'hw2' ? '#6d28d9' : '#25334b',
            cursor: 'pointer',
          }}
        >
          HW2 – Piano
        </button>
      </nav>

      {homework === 'hw1' ? <DrumKit /> : <Piano />}
    </>
  );
}
