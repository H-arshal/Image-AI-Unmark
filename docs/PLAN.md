# AI Provenance Inspector & Cleaner — Absolute Plan

> Before building anything, we understand the topic, break it into steps, then plan.

---

## 1. What Is This Topic? (Understanding)

**Topic:** AI Provenance Inspector & Cleaner — a privacy-first, client-side web application that:

- Inspects image provenance (C2PA / Content Credentials, EXIF, XMP, IPTC)
- Explains what each signal means (especially AI-generation claims)
- Allows selective removal of supported metadata/provenance
- Generates a cleaned copy
- Verifies the output (re-scans + shows metadata diff)
- Never claims "AI-free" — clearly distinguishes metadata removal from pixel-level watermark removal

**Key insight from PRD:** This is NOT an "AI tag remover." It is a **developer-grade provenance laboratory with a simple consumer UX**. The core loop is: Inspect → Understand → Choose → Clean → Verify.

**Critical design rules (from PRD):**
- Local-first / client-side (no image upload)
- Original file is immutable (always generate new output)
- No LLM in core pipeline (deterministic file processing)
- Never say "AI-free" — use precise provenance language
- Pixel-level watermarks are different from metadata and cannot be removed by this tool

---

## 2. What Does the PRD Already Give Us?

The PRD (`AI_Provenance_Inspector_Cleaner_PRD.md`) is comprehensive. It covers:

| Section | What It Provides |
|---|---|
| §1-3 | Executive summary, vision, problem statement |
| §4 | Technical terminology (EXIF, XMP, IPTC, C2PA, invisible watermarks) |
| §5-6 | Goals (G1-G6) + Non-Goals (what MVP will NOT do) |
| §7 | 5 user personas |
| §8 | User stories |
| §9 | MVP scope (JPEG/PNG/WebP, inspection + cleaning + verification) |
| §11-19 | UX flow, landing page, analysis screen, cleaning screen, verification, diff |
| §20-29 | Architecture (local-first, web workers, domain model, cleaning pipeline, pixel integrity, security) |
| §30 | SVG considerations (out of MVP scope) |
| §31-32 | Privacy architecture + optional backend |
| §33 | Future API design |
| §34-35 | Error handling + status taxonomy |
| §36-37 | AI claim logic + C2PA cleaning semantics |
| §38 | Warning copy for provenance removal |
| §39-43 | Performance, file limits (25MB), browser compatibility, accessibility, observability |
| §44 | Testing strategy (unit, integration, fixtures, browser tests) |
| §45 | Acceptance criteria (AC1-AC10) |
| §46 | MVP release plan (Phase 0 spike → Phase 1 inspector → Phase 2 cleaner → Phase 3 trust/polish) |
| §47 | Tech stack (React + TypeScript + Vite + Tailwind + Web Workers + specialized libraries) |
| §48 | Repository structure |
| §49 | ADRs (local-first, no LLM, immutable original, no "AI-free" claim) |
| §50 | Threat model |
| §51 | Metrics |
| §52-58 | Future features (provenance graph, privacy presets, batch, CLI, browser extension, monetization, differentiation) |
| §59 | Naming: CleanLens |
| §60 | Final MVP definition |
| §61 | Recommended development order |
| §62 | Definition of Done checklist |
| §63 | Final product concept |

---

## 3. Steps Required (From PRD §46 + §61)

### Phase 0 — Technical Spike (~1 week)
**Goal:** Prove the core engine works in browser before building UI.

Steps:
1. Select browser-compatible libraries for EXIF, XMP, C2PA parsing
2. Validate file parsing (JPEG/PNG/WebP) in browser
3. Prove C2PA manifest extraction + assertion reading
4. Prove C2PA removal feasibility
5. Prove output file generation + re-opening + verification
6. Test performance in Web Worker
7. Deliverable: Proof-of-concept browser app

### Phase 1 — Core Inspector
Steps:
1. Landing page ("Inspect. Understand. Clean.")
2. File upload (drag/drop + select) with validation (MIME, size ≤25MB, magic bytes)
3. Image preview
4. Metadata parser (EXIF, XMP, IPTC)
5. C2PA parser (detection, assertions, actions, ingredients, signature status)
6. Unified analysis model (`ImageAnalysis` domain model from §23)
7. Results dashboard (file summary, provenance summary, C2PA detail, metadata detail)
8. Deliverable: Inspector MVP

### Phase 2 — Cleaner
Steps:
1. Cleaning controls (select EXIF / XMP / IPTC / C2PA individually)
2. Metadata removal pipeline (capability-based, per §25)
3. C2PA removal where supported
4. Output builder (new blob, same format, preserve pixels, avoid recompression)
5. Download clean copy
6. Verification (re-analyze cleaned file)
7. Deliverable: Inspector + Cleaner MVP

### Phase 3 — Trust & Polish
Steps:
1. Metadata diff (original vs cleaned table)
2. Pixel/content fingerprint comparison (SHA-256 of decoded pixels)
3. Warning messages (before removing provenance — §38)
4. Detailed C2PA viewer
5. Accessibility (keyboard, focus, screen reader, contrast)
6. Error states (graceful parser failure isolation — §34)
7. Performance optimization (progress indicators, memory limits)
8. Security audit (file validation, worker isolation, timeouts)
9. Regression fixtures (fixture corpus — §44)
10. Deliverable: Public beta

---

## 4. Things to Think About / Plan Before Creating

### A. Technical Decisions to Confirm
- [ ] Which C2PA library? (PRD says: mature, maintained, browser-compatible — finalize in Phase 0)
- [ ] EXIF parser library choice
- [ ] XMP parser library choice
- [ ] Image processing: pure browser APIs vs WASM
- [ ] Web Worker architecture (analysis.worker.ts, cleaning.worker.ts — §21)
- [ ] State management: React context vs Zustand (§47)

### B. Security & Privacy Planning
- [ ] File size limit enforcement (25MB MVP)
- [ ] MIME + magic-byte validation
- [ ] Malformed file handling
- [ ] Parser sandboxing / worker isolation
- [ ] Memory limits + timeouts
- [ ] No server upload in local mode (§31)
- [ ] Network request audit (no analytics payload with image data — §43)

### C. UX & Transparency Planning
- [ ] Status taxonomy (§35): FOUND, NOT_FOUND, VALID, INVALID, UNKNOWN, UNSUPPORTED, REMOVED, PRESERVED, FAILED
- [ ] Warning copy before provenance removal (§38)
- [ ] Never display "AI-free" — always distinguish C2PA found / AI claim present / not found (§36)
- [ ] Pixel-level watermark message: "This application does not determine whether proprietary pixel-level watermarking exists."
- [ ] Metadata diff table (§19)

### D. Testing & Fixtures Planning
- [ ] Fixture images: EXIF-only, XMP-only, IPTC-only, C2PA-only, combined, malformed, no metadata (§44)
- [ ] Unit tests: file validation, metadata extraction, cleaning operations, status mapping, diff generation
- [ ] Integration tests: full workflow with fixtures
- [ ] Browser tests: drag/drop, large files, worker failures, download, cleanup

### E. Acceptance Criteria (From PRD §45)
Before calling MVP done, verify:
- [ ] AC1: Upload displays image + begins analysis
- [ ] AC2: EXIF detected + displayed
- [ ] AC3: C2PA manifest identified + normalized
- [ ] AC4: AI-generation claim explicitly identified
- [ ] AC5: Metadata removal works individually
- [ ] AC6: Original file never mutated
- [ ] AC7: Cleaned output automatically re-analyzed
- [ ] AC8: No "AI-free" claim made
- [ ] AC9: No image upload to server in local mode
- [ ] AC10: Parser failure isolated (one parser fails, others complete)

---

## 5. Absolute Plan — What We Will Do (Ordered)

```
STEP 1: Confirm understanding (this file) ✓
STEP 2: Create session memory with key decisions
STEP 3: Create repo memory with project conventions
STEP 4: Set up repository structure (from PRD §48)
STEP 5: Phase 0 — Technical spike (library selection + PoC)
STEP 6: Phase 1 — Core Inspector (UI + parsers + analysis model)
STEP 7: Phase 2 — Cleaner (removal pipeline + output + download)
STEP 8: Phase 3 — Trust & Polish (diff, verification, accessibility, fixtures, tests)
STEP 9: Final verification against Definition of Done (§62)
```

---

## 6. Key Reminders Before Starting

> **This is NOT an AI tag remover.** It is a provenance inspection + selective cleaning + verification tool.

> **Always generate a new file.** Never overwrite the original.

> **Always explain what was NOT removed.** Pixel-level watermarks, proprietary signals, and unsupported formats must be clearly communicated.

> **Always verify.** Re-scan the cleaned output and show the diff.

> **Always be transparent.** Use precise language: FOUND / NOT FOUND / REMOVED / PRESERVED / UNKNOWN — never "Safe" or "Clean" unless precisely defined.
