
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HomeworksHub from './HomeworksHub';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HomeworksHub />
  </StrictMode>
);
