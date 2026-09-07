import { AIUnmark } from './ai-unmark/AIUnmark';

export function App() {
  return (
    <div className="frame">
      <AIUnmark />
      <footer className="app-footer mono">
        Image AI-Unmark — Vite + React + TypeScript. Single-page app, single shared metadata engine.
        See <a href="docs/AI_Provenance_Inspector_Cleaner_PRD.md" style={{ color: 'var(--text-dim)' }}>PRD</a>.
      </footer>
    </div>
  );
}