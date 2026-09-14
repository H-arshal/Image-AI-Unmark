import { ReactNode } from 'react';
import './Disclaimer.css';

interface DisclaimerProps {
  /** Short uppercase eyebrow label rendered above the content. */
  label: string;
  children: ReactNode;
  /** Optional accent color for the left border. Defaults to brick (warning). */
  accent?: 'brick' | 'amber' | 'slate';
}

/**
 * Shared brand-promise component.
 *
 * This is the primary brand element of both Provenance Lab and
 * Image AI-Unmark. It is `role="alert"` so screen readers cannot miss it.
 *
 * Never collapse the text behind a "Read more" link. Never replace
 * the plain-language copy with marketing language. The disclaimer
 * is the brand.
 */
export function Disclaimer({ label, children, accent = 'brick' }: DisclaimerProps) {
  return (
    <div className={`disclaimer disclaimer--${accent}`} role="alert">
      <span className="disclaimer__label">{label}</span>
      {children}
    </div>
  );
}