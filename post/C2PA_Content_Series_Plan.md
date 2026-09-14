# C2PA Content Series — Content Plan

## Overview

A connected content series around **C2PA, Content Credentials, image provenance, and the AI Provenance Inspector & Cleaner project**.

Core narrative:

> **Educate → Introduce the Project → Go Deep → Correct Misconceptions → Show Engineering → Explain Architecture**

### Important Positioning Rule

Do not describe the project as “removing AI,” “making AI images undetectable,” or “making an AI image a normal image.”

Prefer:

- Removing supported C2PA provenance
- Cleaning image metadata
- Removing Content Credentials from a copy
- Inspecting and cleaning image provenance
- Creating a metadata-clean copy

Removing C2PA/EXIF/XMP does **not** prove that an image was never AI-generated and does not necessarily remove pixel-level or invisible watermarking.

---

# Series Structure

| # | Platform | Working Title | Primary Goal | Status |
|---|---|---|---|---|
| 01 | LinkedIn | What Is C2PA? The Metadata Behind Content Credentials | Education | Planned |
| 02 | LinkedIn | I Built a Tool to Inspect & Clean C2PA/Image Metadata | Project Introduction | Planned |
| 03 | Medium | C2PA Explained: Content Credentials, AI Provenance & How It Actually Works | Deep Technical Education | Planned |
| 04 | LinkedIn | Removing C2PA Doesn't Remove AI — Here's Why | Myth Busting | Planned |
| 05 | Medium | I Built an Image Provenance Inspector & Cleaner — Architecture, Security & Lessons Learned | Engineering Case Study | Planned |
| 06 | LinkedIn | What Actually Happens When You Clean an Image? | Architecture / Engineering | Planned |

---

# 01 — LinkedIn: What Is C2PA?

## Purpose

Introduce C2PA to developers and technically curious readers.

## Core Question

> How can an image carry information about where it came from and how it was modified?

## Concepts

- C2PA
- Content Credentials
- Provenance
- C2PA manifests
- Claims
- Assertions
- Actions
- Ingredients
- Cryptographic signatures
- AI-generation claims
- Verification

## Visual

```text
IMAGE
  ↓
CONTENT CREDENTIALS
  ↓
WHO / WHAT / WHEN
  ↓
PROVENANCE
```

## Takeaway

> C2PA is not simply an “AI tag.” It is a framework for attaching verifiable provenance information to digital content.

---

# 02 — LinkedIn: I Built a C2PA & Metadata Cleaner

## Purpose

Introduce the actual application.

## Product Flow

```text
Upload
   ↓
Inspect
   ↓
Understand
   ↓
Select Metadata
   ↓
Clean
   ↓
Verify
   ↓
Download
```

## Features

### Inspection

- EXIF
- XMP
- IPTC
- C2PA
- Software/application information
- Provenance claims

### Cleaning

- Remove EXIF
- Remove XMP
- Remove IPTC
- Remove supported C2PA provenance

### Verification

- Re-analyze output
- Show what was removed
- Show what remains
- Metadata diff

## Positioning

> The goal isn't to “remove AI.” The goal is to understand and control the provenance and metadata attached to an image.

## Privacy Angle

If implemented as planned:

> Images are processed locally in the browser whenever supported.

---

# 03 — Medium: C2PA Explained

## Working Title

**C2PA Explained: Content Credentials, AI Provenance & How It Actually Works**

## Purpose

This is the canonical long-form educational article.

## Suggested Structure

1. The Problem
2. What Is C2PA?
3. Content Credentials
4. C2PA Mental Model
5. Assertions
6. Actions
7. Ingredients
8. Cryptographic Signatures
9. AI-Generated Content
10. What C2PA Does Not Do
11. Metadata vs Pixels
12. Limitations
13. Introducing Our Application
14. Conclusion

## Mental Model

```text
Content
   │
   ▼
Manifest
   │
   ├── Claims
   ├── Assertions
   ├── Actions
   ├── Ingredients
   └── Signature
```

## Important Distinctions

```text
C2PA
  ≠
AI detector

C2PA
  ≠
pixel watermark

C2PA
  ≠
proof that every pixel is authentic
```

---

# 04 — LinkedIn: Removing C2PA Doesn't Remove AI

## Purpose

Correct the most likely misunderstanding around the project.

## Core Hook

> I built a tool that can remove C2PA metadata from an image.
>
> Does that mean the AI is gone?
>
> **No.**

## Visual

```text
AI-GENERATED IMAGE
        │
   ┌────┼────┐
   ▼    ▼    ▼
 C2PA  EXIF  PIXELS
   │    │      │
   └────┘      │
  Metadata     │
   │           │
 REMOVED    STILL THERE
```

## Explain

Removing:

- C2PA
- EXIF
- XMP
- IPTC

does not automatically remove:

- image pixels;
- invisible/pixel-level watermarks;
- every possible provenance mechanism.

## Language Rule

Instead of:

> “AI removed.”

Use:

> “Supported provenance metadata removed.”

Instead of:

> “AI-free.”

Use:

> “C2PA provenance no longer present in the cleaned copy.”

---

# 05 — Medium: Engineering Case Study

## Working Title

**I Built an Image Provenance Inspector & Cleaner — Architecture, Security & Lessons Learned**

## Purpose

Show how the application was actually designed and engineered.

## Suggested Structure

1. Why I Built It
2. Product Requirements
3. Architecture
4. Why Client-Side?
5. Web Workers
6. Metadata Processing
7. C2PA Processing
8. Cleaning Pipeline
9. Why We Never Modify the Original
10. Verification
11. Security
12. Privacy
13. What the Application Cannot Do
14. Lessons Learned
15. Future Work

## Architecture

```text
                    Browser
                       │
                       ▼
                File Validation
                       │
                       ▼
              Image Processing Layer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        EXIF          XMP          C2PA
       Parser        Parser       Parser
          │            │            │
          └────────────┼────────────┘
                       ▼
               Unified Analysis
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
         Inspector            Cleaner
                                   │
                                   ▼
                              Clean Copy
                                   │
                                   ▼
                              Verification
```

## Cleaning Pipeline

```text
Original
   ↓
Capability Detection
   ↓
Cleaning Plan
   ↓
Remove Selected Metadata
   ↓
Generate New File
   ↓
Re-analyze
```

## Engineering Topics

- React / TypeScript
- Web Workers
- Binary file processing
- Metadata parsers
- C2PA SDK
- Browser APIs
- WASM where needed
- Security boundaries
- Privacy
- Verification

---

# 06 — LinkedIn: What Actually Happens When You Clean an Image?

## Purpose

Create a highly visual developer-focused architecture post.

## Core Pipeline

```text
IMAGE
  │
  ▼
FILE VALIDATION
  │
  ▼
METADATA EXTRACTION
  │
  ├──────── EXIF
  ├──────── XMP
  ├──────── IPTC
  └──────── C2PA
  │
  ▼
UNIFIED ANALYSIS
  │
  ▼
CLEANING ENGINE
  │
  ▼
NEW IMAGE
  │
  ▼
RE-ANALYSIS
  │
  ▼
METADATA DIFF
  │
  ▼
VERIFIED OUTPUT
```

## Main Message

> We don't just delete metadata and hope it worked.
>
> We analyze → clean → analyze again → compare.

## Developer Topics

- Web Workers
- Binary file processing
- Parser isolation
- Browser APIs
- WASM
- Image formats
- Deterministic processing
- Verification

---

# Content Relationships

```text
POST 01
What is C2PA?
     │
     ▼
POST 02
I Built a Tool
     │
 ┌───┴────┐
 ▼        ▼
POST 03  POST 04
Medium   LinkedIn
Deep     Myth Busting
C2PA
 └───┬────┘
     ▼
POST 05
Engineering Case Study
     │
     ▼
POST 06
Architecture
```

The pieces should reference one another so the series feels like one technical journey.

---

# Visual Strategy

Keep a consistent visual identity:

- minimalist developer/editorial aesthetic;
- warm or off-white paper;
- dark graphite/black linework;
- handwritten or editorial typography;
- generous whitespace;
- simple diagrams;
- restrained accent color;
- imperfect hand-drawn elements where appropriate.

Every visual should be derived from the specific C2PA content of that piece.

---

# Suggested Visuals

## Post 01

C2PA provenance diagram:

```text
IMAGE
  ↓
CONTENT CREDENTIALS
  ↓
WHO / WHAT / WHEN
```

## Post 02

Product workflow:

```text
UPLOAD → INSPECT → CLEAN → VERIFY
```

## Post 04

Myth vs reality:

```text
REMOVE C2PA
      ≠
REMOVE AI
```

## Post 06

Technical pipeline:

```text
FILE
 ↓
PARSERS
 ↓
ANALYSIS
 ↓
CLEANER
 ↓
VERIFY
```

---

# GitHub Integration

The repository should become the technical home for the series.

Recommended README opening:

```text
# CleanLens

Image Provenance Inspector & Cleaner

Inspect image metadata.
Understand C2PA provenance.
Create cleaned copies.
Verify the result.
```

Then include:

- C2PA inspection
- EXIF inspection
- XMP inspection
- IPTC inspection
- Metadata cleaning
- Provenance cleaning
- Verification
- Metadata diff
- Local-first processing

Link the Medium articles, LinkedIn series, live demo, and architecture documentation.

---

# Recommended Publishing Sequence

## Week 1

### Day 1
LinkedIn — What Is C2PA?

### Day 3–4
LinkedIn — I Built a Tool to Inspect & Clean C2PA/Image Metadata

## Week 2

### Day 1
Medium — C2PA Explained

### Day 3–4
LinkedIn — Removing C2PA Doesn't Remove AI

## Week 3

### Day 1
Medium — I Built an Image Provenance Inspector & Cleaner

### Day 3–4
LinkedIn — What Actually Happens When You Clean an Image?

---

# Content Checklist

## Post 01

- [ ] Explain C2PA
- [ ] Explain Content Credentials
- [ ] Explain provenance
- [ ] Explain manifest
- [ ] Explain signatures
- [ ] Explain AI-generation claims
- [ ] Add visual
- [ ] Add CTA

## Post 02

- [ ] Introduce project
- [ ] Explain problem
- [ ] Show workflow
- [ ] Show privacy-first architecture
- [ ] Explain supported metadata
- [ ] Add screenshots/visuals
- [ ] Add project link
- [ ] Add CTA

## Medium 01

- [ ] Detailed C2PA explanation
- [ ] Technical diagrams
- [ ] Examples
- [ ] Metadata vs pixels
- [ ] AI provenance
- [ ] Limitations
- [ ] Brief project introduction
- [ ] References

## Post 04

- [ ] State misconception
- [ ] Explain metadata vs pixels
- [ ] Explain C2PA removal
- [ ] Explain watermark distinction
- [ ] Avoid “AI-free” claims
- [ ] Add myth/reality visual

## Medium 02

- [ ] Product requirements
- [ ] Architecture
- [ ] Processing pipeline
- [ ] C2PA implementation
- [ ] Web Workers
- [ ] Security
- [ ] Privacy
- [ ] Verification
- [ ] Lessons learned
- [ ] Future work

## Post 06

- [ ] Architecture diagram
- [ ] Explain processing pipeline
- [ ] Explain workers
- [ ] Explain metadata parsers
- [ ] Explain cleaning
- [ ] Explain verification
- [ ] Ask technical question

---

# Messaging Rules

## Prefer

- “C2PA provenance”
- “Content Credentials”
- “metadata”
- “supported provenance information”
- “cleaned copy”
- “metadata removed”
- “verified output”
- “pixel-level watermarking is a separate mechanism”

## Avoid

- “Remove AI”
- “Remove AI detection”
- “Make AI images undetectable”
- “AI-free image”
- “Normal image”
- “Guaranteed watermark removal”

These phrases overstate what the application can technically guarantee.

---

# Final Series Narrative

The complete story should feel like one technical journey:

```text
I discovered C2PA.
        ↓
I understood how provenance works.
        ↓
I built a tool around it.
        ↓
I learned that removing metadata ≠ removing AI.
        ↓
I designed a privacy-first architecture.
        ↓
I verified the cleaned output instead of trusting assumptions.
```

## Ultimate Message

> **Digital provenance is becoming an important part of how we understand online content. Instead of treating C2PA as just an “AI tag,” we can understand what it contains, what it proves, what it doesn't prove, and how users can control the metadata attached to their own files.**
