# Image AI-Unmark

A privacy-first, client-side image metadata inspector and selective
stripper. Built with Vite, React, and TypeScript.

## What it does

Drop a JPEG, PNG, or WebP. Inspect its declared provenance (C2PA,
EXIF, XMP, IPTC, ICC). Choose what to remove. Verify the result by
re-scanning the cleaned copy.

## What it doesn't do

- It does not modify the original file. A new copy is generated.
- It does not modify pixels. The visible AI badge is *not* erased.
- It does not affect SynthID, Adobe's pixel-fallback watermark, or
  any pixel-domain watermark.
- It does not affect AI-detection classifiers — those read pixels,
  not metadata.
- It does not make an image "undetectable."

The brand name implies more than the product does. The Disclaimer
component is the user's primary protection against that implication.
See [docs/AI_Provenance_Inspector_Cleaner_PRD.md](docs/AI_Provenance_Inspector_Cleaner_PRD.md) §6 for the full non-goals.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

## Build for production

```bash
npm run build        # outputs dist/
npm run preview      # serves dist/ locally
```

## Project layout

```
src/
├── core/                   ← byte-level metadata engine (pure TS, no DOM)
│   ├── types.ts            ← CATEGORY, Segment, Analysis, …
│   ├── bytes.ts            ← byte-level helpers
│   ├── format.ts           ← magic-byte format detection
│   ├── exif.ts             ← EXIF IFD0 parser
│   ├── jpeg.ts             ← JPEG segment parser
│   ├── png.ts              ← PNG chunk parser
│   ├── webp.ts             ← WebP RIFF chunk parser
│   ├── rewrite.ts          ← segment-aware rewriter
│   └── index.ts            ← public API: analyze, clean
│
├── shared/                 ← shared UI primitives
│   ├── tokens.css          ← design tokens (colors, fonts, spacing)
│   ├── chrome.css          ← page shell, header, footer, drop zone
│   ├── Disclaimer.tsx      ← brand-promise component (role="alert")
│   ├── Disclaimer.css
│   └── bytes.ts            ← humanBytes(), mimeFor()
│
├── ai-unmark/
│   ├── AIUnmark.tsx        ← main component
│   └── styles.css          ← app-specific overrides
│
├── App.tsx                 ← renders AIUnmark
└── main.tsx                ← React root

legacy/                     ← preserved reference of the original single-file HTML versions
docs/                       ← PRD, design notes
post/                       ← content series plan + image assets
```

## Architectural constraints (locked)

1. **`core/` never modifies pixels.** Its API is `analyze(bytes)` and
   `clean(bytes, categories)`. No DOM access, no canvas. This is
   enforced by the type system — adding `document` or `Image` here
   would be a type error.

2. **Honest positioning is a hard constraint.** See
   [docs/AI_Provenance_Inspector_Cleaner_PRD.md](docs/AI_Provenance_Inspector_Cleaner_PRD.md)
   §6 for the non-goals. The `<Disclaimer>` component surfaces them
   at every relevant UI surface.

3. **The product name "Image AI-Unmark" implies more than the
   product does.** The visible "AI" badge in the corner is not
   touched by this app — only the declared metadata is. If you
   need pixel-level editing, this is the wrong tool. The Disclaimer
   copy tells the user this on first load.

## Legacy files

[`legacy/provenance-lab.html`](legacy/provenance-lab.html) and
[`legacy/cleanlabel.html`](legacy/cleanlabel.html) are the original
single-file HTML versions from before the rename history. They are
preserved for reference. The current single-app version lives in
[`src/ai-unmark/AIUnmark.tsx`](src/ai-unmark/AIUnmark.tsx).

## Tech stack

- **Vite 5** — dev server + build
- **React 18** — UI
- **TypeScript 5** — strict mode
- **No CSS framework** — design tokens + plain CSS
- **No backend, no telemetry, no third-party scripts** in the
  runtime app