import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProvenanceLab } from './provenance-lab/ProvenanceLab';
import { Unmark } from './unmark/Unmark';

function Nav() {
  const loc = useLocation();
  const isRoot = loc.pathname === '/' || loc.pathname === '/provenance';
  const isUnmark = loc.pathname.startsWith('/unmark');
  return (
    <nav className="app-nav">
      <NavLink to="/provenance" className={isRoot ? 'active' : ''}>Provenance Lab</NavLink>
      <NavLink to="/unmark" className={isUnmark ? 'active' : ''}>Image AI-Unmark</NavLink>
      <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: '11px', alignSelf: 'center' }}>
        local-first · no upload
      </span>
    </nav>
  );
}

export function App() {
  return (
    <div className="frame">
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/provenance" replace />} />
        <Route path="/provenance" element={<ProvenanceLab />} />
        <Route path="/unmark" element={<Unmark />} />
      </Routes>
      <footer className="app-footer mono">
        C2PA Cleaner — Vite + React + TypeScript port. Two apps, one shared metadata engine.
        See <a href="docs/AI_Provenance_Inspector_Cleaner_PRD.md" style={{ color: 'var(--text-dim)' }}>PRD</a> ·
        <a href="docs/Unmark_PRD.md" style={{ color: 'var(--text-dim)' }}>Unmark PRD</a>.
      </footer>
    </div>
  );
}