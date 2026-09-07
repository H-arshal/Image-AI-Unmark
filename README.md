# C2PA Cleaner

Two privacy-first, client-side image provenance tools. Built with
Vite, React, and TypeScript. Both apps share a single byte-level
metadata engine and a single design token system.

## Products

| Route | Product | What it does |
|---|---|---|
| [`/provenance`](http://localhost:5173/provenance) | **Provenance Lab** | Inspect declared metadata (C2PA, EXIF, XMP, IPTC, ICC). Choose what to strip. Verify. **Pixels never touched.** |
| [`/unmark`](http://localhost:5173/unmark) | **Image AI-Unmark** | Auto-detect visible "AI generated" badges, inpaint them with LaMa in a Web Worker, and strip declared metadata. Honest about what it doesn't do. |
| `/` | (redirect) | Redirects to `/provenance`. |

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the URL Vite prints. No build step needed for development.

## Build for production

```bash
npm run build        # outputs dist/
npm run preview      # serves dist/ locally
```

## Project layout

```
src/
├── core/                   ← shared engine (ProvenanceCore, TypeScript)
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
├── provenance-lab/
│   ├── ProvenanceLab.tsx   ← main route component
│   └── styles.css          ← app-specific overrides
│
├── unmark/
│   ├── Unmark.tsx
│   ├── detector.ts         ← Sobel + corner-region badge scoring
│   ├── pipeline.ts         ← decode → tile → inpaint → encode → strip
│   ├── inpaint.worker.ts   ← LaMa ONNX inference in a Web Worker
│   └── styles.css
│
├── App.tsx                 ← router shell
└── main.tsx                ← React root

legacy/                     ← original single-file HTML versions, preserved for reference
docs/                       ← PRD, design, fixtures specs
post/                       ← content series plan + image assets
```

## Architectural constraints (locked)

1. **`core/` never modifies pixels.** Its API is `analyze(bytes)` and
   `clean(bytes, categories)`. If you find yourself wanting to
   decode an image there, you are building a third product. Don't
   do it in this repo.

2. **Honest positioning is a hard constraint.** See
   `docs/AI_Provenance_Inspector_Cleaner_PRD.md` §6 and
   `docs/Unmark_PRD.md` §6 for the non-goals. Both apps'
   `<Disclaimer>` components enforce this in the UI.
   The "Image AI-Unmark" name implies more than the product does;
   the Disclaimer copy is the user's primary protection against
   that implication. See `docs/Unmark_PRD.md` v0.2 rename note.

3. **Image AI-Unmark's AC10 honesty test** — running the output
   through an AI-detection classifier must show no statistically
   significant delta. This is in CI when tests are added (currently
   deferred per project decision).

## Legacy files

[`legacy/provenance-lab.html`](legacy/provenance-lab.html) and
[`legacy/cleanlabel.html`](legacy/cleanlabel.html) are the original
single-file HTML versions. They remain functional and can be
opened directly in a browser without any build step. Use them as a
reference for byte-level behavior; the React version should be
kept consistent with them.

## Tech stack

- **Vite 5** — dev server + build
- **React 18** — UI
- **TypeScript 5** — strict mode, no implicit `any`
- **react-router-dom 6** — routing
- **No CSS framework** — design tokens + plain CSS modules
- **ONNX Runtime Web** (CDN) — LaMa inference in the inpaint worker
- **No backend, no telemetry, no third-party scripts** in the
  runtime app

## Roadmap

- Engine unit tests (Vitest) — deferred per project decision
- Fixture corpus per `docs/CleanLabel_fixtures.md`
- AC10 honesty test in CI
- The PixelLab design doc in [`docs/design.md`](docs/design.md) is
  currently *unapplied* — the working theme is bespoke per-product
  (amber for Provenance Lab, slate-teal for CleanLabel).