import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

import './shared/tokens.css';
import './shared/chrome.css';
import './shared/Disclaimer.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);