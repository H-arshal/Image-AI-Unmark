# AI Provenance Inspector & Cleaner

## Product Requirements Document (PRD) + System Architecture

**Document Version:** 1.0\
**Status:** Proposed / MVP Planning\
**Date:** 31 August 2026\
**Primary Goal:** Build a privacy-first application that inspects image
provenance and metadata, explains detected AI/content-credential
signals, and creates a cleaned copy by removing selected
metadata/provenance records where technically possible.

------------------------------------------------------------------------

# 1. Executive Summary

AI-generated images can contain several different kinds of provenance or
metadata:

-   C2PA / Content Credentials manifests
-   EXIF metadata
-   XMP metadata
-   IPTC metadata
-   Software/application identifiers
-   Other format-specific metadata

Some AI systems may also use pixel-level or robust invisible
watermarking. These signals are fundamentally different from ordinary
metadata and cannot be assumed to disappear simply because metadata is
removed.

The proposed application, working name **AI Provenance Inspector &
Cleaner**, will therefore not claim to "make an image non-AI." Instead,
it will:

1.  Analyze an uploaded image.
2.  Detect supported provenance and metadata.
3.  Explain what each signal means.
4.  Show whether an AI-generation or editing claim is present.
5.  Allow users to selectively remove supported metadata/provenance.
6.  Generate a cleaned copy.
7.  Verify the resulting file.
8.  Clearly communicate what was and was not removed.

The preferred architecture is **local-first/client-side processing** so
that images do not need to leave the user's device.

------------------------------------------------------------------------

# 2. Product Vision

## Vision

Create the simplest trustworthy tool for understanding and controlling
digital image provenance.

## Product statement

> "Know what your image contains. Decide what metadata to keep. Create a
> clean copy without uploading the image."

## Core principles

-   **Privacy first**
-   **Technical transparency**
-   **No misleading AI-detection claims**
-   **Non-destructive by default**
-   **Verify every output**
-   **Explain provenance rather than hiding complexity**
-   **Client-side processing wherever practical**

------------------------------------------------------------------------

# 3. Problem Statement

Users frequently download or generate images without knowing what
information is embedded in the resulting file.

They may want to:

-   inspect image metadata;
-   understand whether Content Credentials are present;
-   remove unnecessary personal metadata;
-   remove supported provenance manifests before sharing;
-   reduce metadata leakage;
-   compare original and cleaned files;
-   understand whether cleaning metadata actually affects other
    provenance mechanisms.

Existing tools often focus on a single task such as EXIF removal. The
proposed product combines:

**inspection + explanation + selective cleaning + verification**

in one workflow.

------------------------------------------------------------------------

# 4. Important Technical Terminology

## 4.1 Metadata

Data stored alongside or inside an image file describing the image or
its origin.

Examples:

-   camera make/model;
-   GPS coordinates;
-   timestamp;
-   software;
-   author;
-   editing application;
-   copyright information.

## 4.2 EXIF

Exchangeable Image File Format metadata commonly found in JPEG and other
image formats.

Potentially sensitive information includes:

-   GPS location;
-   device model;
-   capture time;
-   orientation;
-   camera settings.

## 4.3 XMP

Extensible Metadata Platform metadata used by many imaging and creative
applications.

It can contain:

-   editing information;
-   creator information;
-   application information;
-   workflow information;
-   provenance-related information.

## 4.4 IPTC

Metadata standard commonly used for publishing and image-management
workflows.

Examples:

-   creator;
-   copyright;
-   description;
-   keywords;
-   location.

## 4.5 C2PA / Content Credentials

C2PA is a standard for establishing verifiable provenance and
authenticity information for digital content.

A C2PA manifest can describe:

-   who/what created content;
-   actions performed on it;
-   ingredients;
-   tools/software;
-   cryptographic assertions;
-   signatures;
-   provenance history.

A C2PA record indicating generative AI use is a provenance statement. It
is not equivalent to an intrinsic property of the image pixels.

## 4.6 Invisible / Pixel-Level Watermarks

Some systems can embed information into image pixels using robust
watermarking techniques.

These are different from ordinary metadata.

Therefore:

> Removing EXIF/XMP/C2PA metadata must not be represented as proof that
> every AI-origin signal has been removed.

------------------------------------------------------------------------

# 5. Goals

## 5.1 Primary Goals

### G1 --- Image Inspection

Allow a user to upload an image and receive a structured
provenance/metadata report.

### G2 --- C2PA Awareness

Detect supported C2PA Content Credentials and explain their meaning.

### G3 --- Metadata Cleaning

Allow supported metadata categories to be removed.

### G4 --- Verification

Re-analyze the generated output and show exactly what remains.

### G5 --- Privacy

Prefer processing entirely in the browser.

### G6 --- Transparency

Never state that an image is "AI-free" merely because metadata was
removed.

------------------------------------------------------------------------

# 6. Non-Goals

The MVP will NOT:

-   guarantee removal of every AI watermark;
-   claim to determine whether an image was AI-generated from pixels
    alone;
-   defeat proprietary watermarking systems;
-   forge or falsify provenance;
-   modify signed provenance records while pretending the original
    signature remains valid;
-   reconstruct or manipulate cryptographic signatures;
-   claim that a cleaned image has no provenance whatsoever;
-   provide a universal AI detector.

------------------------------------------------------------------------

# 7. Target Users

## Persona 1 --- AI Content Creator

Uses AI image generators and wants to understand what provenance
information is attached to generated images.

## Persona 2 --- Developer

Needs to inspect C2PA, EXIF, XMP, and image-file behavior during
development.

## Persona 3 --- Privacy-Conscious User

Wants to remove GPS, device, software, or other metadata before sharing
an image.

## Persona 4 --- Content Publisher

Needs a quick way to understand what provenance information exists
before publishing an asset.

## Persona 5 --- Researcher / Technical User

Wants a detailed forensic-style metadata and provenance report without
sending images to a server.

------------------------------------------------------------------------

# 8. User Stories

### Inspection

> As a user, I want to upload an image and see all supported metadata so
> I know what information is attached to it.

### C2PA

> As a user, I want to know whether Content Credentials exist and
> whether they contain an AI-generation claim.

### Privacy

> As a user, I want to remove GPS and device information before sharing
> an image.

### Provenance Cleaning

> As a user, I want to create a copy without supported C2PA/EXIF/XMP
> metadata.

### Verification

> As a user, I want the application to re-scan my cleaned image so I
> know exactly what changed.

### Technical Transparency

> As a user, I want the application to distinguish metadata removal from
> removal of pixel-level watermarking.

------------------------------------------------------------------------

# 9. Product Scope

## MVP

### Supported inputs

-   JPEG
-   PNG
-   WebP

### Inspection

-   File type
-   File size
-   Dimensions
-   MIME type
-   EXIF
-   XMP
-   IPTC where supported
-   C2PA / Content Credentials where supported
-   Software/application metadata
-   Basic provenance claims

### Cleaning

-   Remove EXIF
-   Remove XMP
-   Remove IPTC where supported
-   Remove C2PA metadata/manifests where technically supported
-   Preserve image pixels where possible
-   Produce a new output file

### Verification

-   Re-scan cleaned output
-   Metadata diff
-   File-size comparison
-   Pixel-integrity check where feasible

------------------------------------------------------------------------

# 10. Future Scope

-   AVIF
-   HEIC
-   TIFF
-   RAW formats
-   Batch processing
-   Folder processing
-   CLI
-   Desktop application
-   Browser extension
-   API
-   Advanced C2PA visualization
-   Provenance graph
-   Re-signing with user-controlled provenance
-   Organization/team workflows

------------------------------------------------------------------------

# 11. Core User Workflow

``` text
User opens application
        |
        v
Drag & Drop / Select Image
        |
        v
Client validates file
        |
        v
Image Parser
        |
        +-------------------+
        |                   |
        v                   v
Metadata Parser        C2PA Parser
        |                   |
        +---------+---------+
                  |
                  v
           Unified Analysis
                  |
                  v
          Results Dashboard
                  |
          +-------+--------+
          |                |
          v                v
       Inspect           Clean
                           |
                           v
                  User chooses fields
                           |
                           v
                    Generate Copy
                           |
                           v
                     Re-analyze
                           |
                           v
                     Verification
                           |
                           v
                       Download
```

------------------------------------------------------------------------

# 12. Detailed UX

## 12.1 Landing Page

Primary message:

> **Inspect. Understand. Clean.**

Supporting message:

> Analyze image metadata and Content Credentials directly in your
> browser.

Primary CTA:

**Analyze an Image**

Privacy statement:

> Your image is processed locally whenever supported. Nothing is
> uploaded by the application in local-processing mode.

------------------------------------------------------------------------

# 13. Analysis Screen

## File Summary

Display:

  Field             Example
  ----------------- ---------------------
  File name         generated-image.jpg
  Format            JPEG
  Size              2.4 MB
  Dimensions        1536 × 1024
  MIME type         image/jpeg
  Processing mode   Local

------------------------------------------------------------------------

# 14. Provenance Summary

Example:

``` text
PROVENANCE SUMMARY

C2PA / Content Credentials
FOUND

AI generation claim
FOUND

EXIF metadata
FOUND

XMP metadata
FOUND

IPTC metadata
NOT FOUND

Pixel-level watermark
NOT DETERMINED
```

The last status is important.

Do not show:

> "No AI watermark."

Instead:

> "This application does not determine whether proprietary pixel-level
> watermarking exists."

------------------------------------------------------------------------

# 15. C2PA Detail View

Example:

``` text
CONTENT CREDENTIALS

Status
✓ Manifest detected

Issuer
Example Provider

Created
2026-08-31

Actions
- Created
- Generated

Source
Generative AI

Signature
Valid / Invalid / Unknown

Ingredients
2

Manifest
Available
```

The UI should make clear that a valid C2PA signature establishes
provenance information about the signed claims; it does not prove that
the pixels themselves are intrinsically "AI" or "human."

------------------------------------------------------------------------

# 16. Metadata Detail View

Use expandable categories.

``` text
EXIF
  Camera Make
  Camera Model
  Date/Time
  GPS
  Orientation
  Exposure
  Lens

XMP
  Creator
  Software
  Editing history
  Custom properties

IPTC
  Creator
  Copyright
  Description
  Keywords
```

Sensitive fields such as GPS should be visually highlighted.

------------------------------------------------------------------------

# 17. Cleaning Screen

The user chooses exactly what to remove.

``` text
CLEAN IMAGE

Metadata

[x] EXIF
[x] XMP
[x] IPTC

Provenance

[x] C2PA / Content Credentials

Other

[ ] ICC profile

Output

Format: Same as original
Quality: Preserve where possible

[Create Clean Copy]
```

A warning should appear before removing provenance:

> Removing Content Credentials can remove verifiable provenance
> information from the resulting copy.

------------------------------------------------------------------------

# 18. Verification Screen

After cleaning:

``` text
CLEANING COMPLETE

Original
2.4 MB

Cleaned
2.3 MB

Removed
✓ EXIF
✓ XMP
✓ IPTC
✓ C2PA

Remaining
✓ ICC profile

Pixel data
Preserved where applicable

[Download Clean Copy]
[View Metadata Diff]
```

------------------------------------------------------------------------

# 19. Metadata Diff

Example:

  Category   Original   Cleaned
  ---------- ---------- -----------
  EXIF       Found      Removed
  GPS        Found      Removed
  XMP        Found      Removed
  IPTC       Found      Removed
  C2PA       Found      Removed
  ICC        Found      Preserved

This is one of the most important trust features.

------------------------------------------------------------------------

# 20. Architecture Overview

## Recommended Architecture

``` text
                         ┌─────────────────────┐
                         │      Browser        │
                         │                     │
                         │  React / Next.js    │
                         └──────────┬──────────┘
                                    |
                                    v
                         ┌─────────────────────┐
                         │ File Validation     │
                         │                     │
                         │ MIME / Size / Type  │
                         └──────────┬──────────┘
                                    |
                                    v
                    ┌──────────────────────────────┐
                    │     Image Processing Layer   │
                    └──────────────┬───────────────┘
                                   |
             +---------------------+---------------------+
             |                     |                     |
             v                     v                     v
      ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
      │ EXIF Parser │       │ XMP Parser   │      │ C2PA Parser │
      └──────┬──────┘       └──────┬──────┘      └──────┬──────┘
             |                     |                     |
             +---------------------+---------------------+
                                   |
                                   v
                       ┌─────────────────────┐
                       │ Unified Metadata    │
                       │ / Provenance Model  │
                       └──────────┬──────────┘
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
             ┌──────────────┐           ┌──────────────┐
             │ Inspector UI │           │ Cleaner      │
             └──────────────┘           └──────┬───────┘
                                               |
                                               v
                                      ┌────────────────┐
                                      │ Output Builder │
                                      └───────┬────────┘
                                              |
                                              v
                                      ┌────────────────┐
                                      │ Verification   │
                                      │ / Re-analysis  │
                                      └────────────────┘
```

------------------------------------------------------------------------

# 21. Frontend Architecture

Recommended stack:

-   React
-   TypeScript
-   Vite or Next.js
-   Tailwind CSS
-   Web Workers
-   Web APIs
-   WASM where required

## Suggested structure

``` text
src/
├── app/
├── components/
│   ├── upload/
│   ├── analysis/
│   ├── metadata/
│   ├── c2pa/
│   ├── cleaner/
│   ├── diff/
│   └── common/
│
├── core/
│   ├── file/
│   ├── parser/
│   ├── provenance/
│   ├── cleaner/
│   └── verification/
│
├── workers/
│   ├── analysis.worker.ts
│   └── cleaning.worker.ts
│
├── types/
│   ├── metadata.ts
│   ├── c2pa.ts
│   └── analysis.ts
│
└── utils/
```

------------------------------------------------------------------------

# 22. Why Web Workers?

Image processing can be expensive.

Without workers:

``` text
UI Thread
    |
    +-- Parse image
    +-- Parse metadata
    +-- Process C2PA
    +-- Rebuild image
    |
    UI freezes
```

With workers:

``` text
UI Thread                 Worker
   |                         |
   |---- Analyze ----------->|
   |                         | Parse
   |                         | Inspect
   |                         | Clean
   |<---- Result ------------|
   |
UI remains responsive
```

Large images should therefore be processed in Web Workers.

------------------------------------------------------------------------

# 23. Core Domain Model

A unified internal model prevents the UI from being tightly coupled to
individual parsers.

``` text
ImageAnalysis
|
├── file
│   ├── name
│   ├── size
│   ├── mimeType
│   ├── format
│   ├── width
│   └── height
│
├── metadata
│   ├── exif
│   ├── xmp
│   ├── iptc
│   └── other
│
├── provenance
│   ├── c2pa
│   ├── aiGenerationClaim
│   ├── issuer
│   ├── actions
│   └── signature
│
└── capabilities
    ├── canRemoveExif
    ├── canRemoveXmp
    ├── canRemoveIptc
    └── canRemoveC2pa
```

------------------------------------------------------------------------

# 24. C2PA Processing Architecture

C2PA should be treated as a dedicated subsystem.

``` text
Image
  |
  v
C2PA Detection
  |
  v
Manifest Extraction
  |
  v
Manifest Parsing
  |
  +--> Assertions
  |
  +--> Actions
  |
  +--> Ingredients
  |
  +--> Signatures
  |
  +--> Digital Source Type
  |
  v
Normalized C2PA Model
```

Important implementation principle:

**Do not implement the cryptographic C2PA format from scratch unless
there is a compelling reason.**

Prefer mature, maintained C2PA-compatible libraries and
WASM/browser-compatible implementations where available.

------------------------------------------------------------------------

# 25. Cleaning Architecture

Cleaning should be implemented as a capability-based pipeline.

``` text
Original File
     |
     v
Capability Detection
     |
     v
Cleaning Plan
     |
     +--> Remove EXIF
     |
     +--> Remove XMP
     |
     +--> Remove IPTC
     |
     +--> Remove C2PA
     |
     v
Rebuild / Rewrite Image
     |
     v
Output File
```

Each operation should report:

``` text
OperationResult

operation
status
changed
warnings
bytesBefore
bytesAfter
```

Example:

``` text
REMOVE_EXIF
status: SUCCESS
changed: true
```

------------------------------------------------------------------------

# 26. Critical Design Rule: Never Mutate the Original

The original file must always remain untouched.

Use:

``` text
Original File
     |
     +------> Analysis
     |
     +------> Cleaning
                 |
                 v
             New Blob
                 |
                 v
             Clean Copy
```

Never overwrite the original browser object.

------------------------------------------------------------------------

# 27. Output Strategy

Whenever possible:

-   preserve dimensions;
-   preserve image pixels;
-   preserve color information;
-   preserve format;
-   avoid unnecessary recompression;
-   avoid changing quality;
-   create a new file.

For metadata-only operations, the application should aim for **lossless
metadata transformation**.

If a format requires re-encoding, the UI must explicitly tell the user.

------------------------------------------------------------------------

# 28. Pixel Integrity

Where practical, calculate a pixel/content fingerprint before and after
cleaning.

Example concept:

``` text
Original decoded pixel hash
          |
          v
       SHA-256
          |
          v
Cleaned decoded pixel hash
          |
          v
      Compare
```

Important:

A normal file hash will change because metadata changes.

Therefore:

``` text
File SHA-256
```

is expected to differ.

The useful comparison is:

``` text
Decoded pixel/content fingerprint
```

when the implementation can guarantee deterministic comparison.

------------------------------------------------------------------------

# 29. Security Architecture

The application handles user-supplied binary files, so file parsing is a
security-sensitive subsystem.

## Required controls

-   Maximum file size
-   MIME validation
-   Magic-byte/file-signature validation
-   Malformed-file handling
-   Parser sandboxing where practical
-   Worker isolation
-   Timeouts
-   Memory limits
-   Avoid executing embedded content
-   Never render untrusted SVG as active HTML
-   No server-side persistence in local-first mode

------------------------------------------------------------------------

# 30. SVG Considerations

SVG should not be part of the initial MVP unless there is a clear
requirement.

SVG can contain:

-   scripts;
-   external references;
-   embedded content;
-   active elements.

If SVG support is introduced later, it should be handled as a separate
security-reviewed pipeline.

------------------------------------------------------------------------

# 31. Privacy Architecture

## Preferred model

``` text
                 INTERNET
                    X
                    |
                    |
              NO IMAGE UPLOAD
                    |
                    v
              ┌───────────┐
              │  Browser  │
              └───────────┘
                    |
             Local processing
                    |
                    v
               Clean file
```

No database is required for MVP.

No user account is required.

No image storage is required.

No analytics payload should contain image metadata.

------------------------------------------------------------------------

# 32. Optional Backend Architecture

A backend should only be introduced if required for functionality
unavailable in browsers.

Potential architecture:

``` text
Browser
   |
   | optional
   v
API Gateway
   |
   v
Processing Service
   |
   +--> Metadata Service
   |
   +--> C2PA Service
   |
   +--> Cleaning Service
```

If server processing is introduced:

-   process in memory where possible;
-   do not persist uploads by default;
-   automatically delete temporary files;
-   use strict size limits;
-   use isolated workers/containers;
-   document retention behavior.

------------------------------------------------------------------------

# 33. API Design --- Future Server Mode

The MVP does not require an API.

A future API could expose:

### POST /v1/analyze

Request:

``` text
multipart/form-data
file=<image>
```

Response:

``` json
{
  "file": {
    "format": "jpeg",
    "size": 2451234,
    "width": 1536,
    "height": 1024
  },
  "metadata": {
    "exif": true,
    "xmp": true,
    "iptc": false
  },
  "provenance": {
    "c2pa": true,
    "aiGenerationClaim": true
  }
}
```

### POST /v1/clean

Request:

``` json
{
  "remove": [
    "exif",
    "xmp",
    "iptc",
    "c2pa"
  ]
}
```

Response:

``` text
cleaned image
```

The API should never imply that the result has no AI origin.

------------------------------------------------------------------------

# 34. Error Handling

Every parser must fail gracefully.

Examples:

``` text
C2PA:
UNSUPPORTED

EXIF:
PARSED

XMP:
MALFORMED

IMAGE:
VALID
```

The application should still show everything it successfully analyzed.

Never fail the entire analysis because one metadata parser fails.

------------------------------------------------------------------------

# 35. Status Taxonomy

Use controlled statuses:

-   FOUND
-   NOT_FOUND
-   VALID
-   INVALID
-   UNKNOWN
-   UNSUPPORTED
-   REMOVED
-   PRESERVED
-   FAILED

Avoid ambiguous labels such as:

-   Safe
-   AI-Free
-   Clean
-   Authentic

unless precisely defined.

------------------------------------------------------------------------

# 36. AI Generation Claim Logic

The application should distinguish:

``` text
C2PA detected
```

from:

``` text
C2PA says generative AI was involved
```

from:

``` text
No C2PA detected
```

These are three different states.

For example:

### Case A

``` text
C2PA: FOUND
AI generation claim: YES
```

### Case B

``` text
C2PA: FOUND
AI generation claim: NO
```

### Case C

``` text
C2PA: NOT FOUND
AI generation claim: UNKNOWN
```

Case C must NOT be displayed as:

> "Not AI generated."

------------------------------------------------------------------------

# 37. C2PA Cleaning Semantics

Removing a C2PA manifest should be described as:

> "Removed C2PA Content Credentials from the output file."

Not:

> "Removed AI generation."

If a C2PA signature is invalidated by modification, the application
should explain that the original signed provenance cannot be preserved
as-is.

------------------------------------------------------------------------

# 38. UX Warning Copy

Recommended warning:

> **Removing provenance**
>
> Content Credentials can provide verifiable information about how an
> image was created or modified. Removing them creates a new copy
> without that provenance information. This does not prove that the
> image was not AI-generated and does not necessarily remove pixel-level
> watermarking.

------------------------------------------------------------------------

# 39. Performance Requirements

## MVP targets

For typical images:

-   UI should become interactive immediately after file selection.
-   Analysis should run asynchronously.
-   Avoid blocking the main thread.
-   Show progress for large files.
-   Keep memory usage bounded.
-   Clean operation should not require a page reload.

Example progress:

``` text
Analyzing image...

[████████████░░░░░░░░]

Reading file
✓
Parsing metadata
✓
Inspecting provenance
...
```

------------------------------------------------------------------------

# 40. File Size Limits

Suggested MVP limit:

**25 MB per image**

Future configurable limit:

**50--100 MB**

The limit should be enforced before expensive processing.

------------------------------------------------------------------------

# 41. Browser Compatibility

Target modern:

-   Chrome
-   Edge
-   Firefox
-   Safari

The application should detect unsupported capabilities and provide clear
messages.

Example:

> "C2PA inspection is unavailable in this browser build. Basic metadata
> inspection is still available."

------------------------------------------------------------------------

# 42. Accessibility

Required:

-   keyboard-accessible upload;
-   keyboard-accessible controls;
-   visible focus states;
-   semantic headings;
-   screen-reader labels;
-   sufficient contrast;
-   status messages announced appropriately;
-   no color-only meaning.

------------------------------------------------------------------------

# 43. Observability

Because MVP is local-first, avoid collecting image contents or metadata.

If telemetry is introduced, collect only anonymous application events
such as:

``` text
analysis_started
analysis_completed
cleaning_started
cleaning_completed
parser_error
```

Do not send:

-   image;
-   filename;
-   EXIF;
-   GPS;
-   C2PA manifest;
-   user-generated metadata.

------------------------------------------------------------------------

# 44. Testing Strategy

## Unit Tests

Test:

-   file validation;
-   metadata extraction;
-   metadata normalization;
-   cleaning operations;
-   status mapping;
-   diff generation.

## Integration Tests

Use fixture images containing:

-   EXIF only;
-   XMP only;
-   IPTC only;
-   C2PA only;
-   multiple metadata types;
-   malformed metadata;
-   no metadata.

## Regression Corpus

Maintain a versioned set of representative files.

Example:

``` text
fixtures/
├── jpeg/
├── png/
├── webp/
├── c2pa/
├── exif/
├── xmp/
├── malformed/
└── combined/
```

## Browser Tests

Test:

-   drag/drop;
-   file selection;
-   large files;
-   worker failures;
-   browser capability differences;
-   download;
-   cleanup.

------------------------------------------------------------------------

# 45. Acceptance Criteria

## AC1 --- Upload

Given a supported image, when the user selects it, the application
displays the image and begins analysis.

## AC2 --- EXIF

Given an image with EXIF, the application detects and displays EXIF
fields.

## AC3 --- C2PA

Given an image containing supported C2PA Content Credentials, the
application identifies the manifest and displays normalized provenance
information.

## AC4 --- AI Claim

Given a C2PA manifest containing an AI-generation assertion, the UI
explicitly identifies that claim.

## AC5 --- Cleaning

Given an image with removable metadata, selecting a metadata category
removes that category from the output where supported.

## AC6 --- Original Preservation

The original input remains unchanged.

## AC7 --- Verification

The generated output is automatically re-analyzed.

## AC8 --- Transparency

The application never reports "AI-free" solely because C2PA/EXIF/XMP was
removed.

## AC9 --- Privacy

In local mode, the image is not uploaded to an application server.

## AC10 --- Error Isolation

A failure in one parser does not prevent other supported analyses from
completing.

------------------------------------------------------------------------

# 46. MVP Release Plan

## Phase 0 --- Technical Spike

Duration: \~1 week

Validate:

-   browser image parsing;
-   EXIF extraction;
-   XMP extraction;
-   C2PA parsing;
-   C2PA removal feasibility;
-   output generation;
-   worker performance.

Deliverable:

**Proof-of-concept browser application.**

------------------------------------------------------------------------

## Phase 1 --- Core Inspector

Build:

-   landing page;
-   upload;
-   image preview;
-   metadata parser;
-   C2PA parser;
-   unified analysis model;
-   results dashboard.

Deliverable:

**Inspector MVP.**

------------------------------------------------------------------------

## Phase 2 --- Cleaner

Build:

-   cleaning controls;
-   metadata removal;
-   C2PA removal where supported;
-   output builder;
-   download;
-   verification.

Deliverable:

**Inspector + Cleaner MVP.**

------------------------------------------------------------------------

## Phase 3 --- Trust & Polish

Build:

-   metadata diff;
-   pixel/content comparison;
-   warnings;
-   detailed C2PA viewer;
-   accessibility;
-   error states;
-   performance optimization.

Deliverable:

**Public beta.**

------------------------------------------------------------------------

# 47. Suggested Technology Stack

## Frontend

**React + TypeScript**

Why:

-   mature ecosystem;
-   strong typing;
-   good component model;
-   easy browser-worker integration.

## Build

**Vite**

For a purely client-side application, Vite keeps the architecture
simple.

Next.js is also viable if SEO or a marketing site becomes important.

## Styling

-   Tailwind CSS
-   component library as desired

## Image Processing

Use specialized, maintained libraries rather than implementing image
parsing manually.

Potential categories:

-   EXIF parser
-   XMP parser
-   C2PA-compatible SDK
-   browser image APIs
-   WASM image tooling where necessary

The exact library choice should be finalized during the Phase 0
technical spike based on browser support, license, maintenance, format
support, and C2PA version compatibility.

## State Management

For MVP:

-   React state/context may be sufficient.

Use Zustand or another state library only if application state becomes
complex.

------------------------------------------------------------------------

# 48. Repository Structure

``` text
ai-provenance-cleaner/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── core/
│   │   ├── analysis/
│   │   ├── metadata/
│   │   ├── provenance/
│   │   ├── cleaning/
│   │   └── verification/
│   │
│   ├── workers/
│   ├── types/
│   ├── hooks/
│   ├── utils/
│   └── app/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   ├── architecture.md
│   ├── security.md
│   └── c2pa.md
│
├── package.json
├── tsconfig.json
└── README.md
```

------------------------------------------------------------------------

# 49. Architecture Decision Records

## ADR-001 --- Local-First Processing

**Decision:** Process images in the browser by default.

**Reason:**

-   privacy;
-   lower infrastructure cost;
-   no image storage;
-   simpler deployment;
-   stronger product differentiation.

**Trade-off:**

-   browser limitations;
-   WASM complexity;
-   memory constraints.

------------------------------------------------------------------------

## ADR-002 --- No LLM in the Core Pipeline

**Decision:** Do not use an LLM for image provenance detection or
cleaning.

**Reason:**

This is deterministic file processing. An LLM provides little value for:

-   EXIF parsing;
-   XMP parsing;
-   C2PA parsing;
-   metadata removal.

LLMs could be added later for optional explanations, but the underlying
analysis should remain deterministic.

------------------------------------------------------------------------

## ADR-003 --- Original File Is Immutable

**Decision:** Always generate a new output.

**Reason:**

-   user safety;
-   easy comparison;
-   avoids accidental destructive changes;
-   simplifies verification.

------------------------------------------------------------------------

## ADR-004 --- No "AI-Free" Claim

**Decision:** Product terminology will use precise provenance language.

**Reason:**

Absence of C2PA metadata does not establish absence of AI generation or
watermarking.

------------------------------------------------------------------------

# 50. Threat Model

Potential threats include:

### Malicious image

A crafted file attempts to exploit a parser.

Mitigation:

-   maintained libraries;
-   worker isolation;
-   resource limits;
-   safe parsing;
-   dependency updates.

### Metadata privacy leak

Application accidentally uploads metadata.

Mitigation:

-   local-first design;
-   network request auditing;
-   automated privacy tests.

### User misunderstanding

User interprets "C2PA removed" as "AI removed."

Mitigation:

-   precise UI language;
-   warnings;
-   documentation;
-   explicit distinction between metadata and pixel-level signals.

### False provenance

User modifies an image and claims original provenance is still valid.

Mitigation:

-   never preserve or display invalid signatures as valid;
-   clearly identify newly generated outputs.

------------------------------------------------------------------------

# 51. Product Metrics

## Adoption

-   images analyzed;
-   unique users;
-   repeat usage.

## Utility

-   percentage of analyses containing metadata;
-   percentage containing C2PA;
-   percentage of users performing cleaning;
-   cleaning completion rate.

## Performance

-   median analysis time;
-   median cleaning time;
-   parser failure rate;
-   browser compatibility failure rate.

## Trust

-   percentage of successful verification runs;
-   number of cleaning failures;
-   number of unsupported files.

Do not optimize for "number of AI tags removed" because that would
encourage misleading product behavior.

------------------------------------------------------------------------

# 52. Future Feature: Provenance Graph

A powerful advanced feature would visualize C2PA history.

``` text
Original Asset
      |
      v
AI Generation
      |
      v
Image Editor
      |
      v
Crop
      |
      v
Export
```

Each node could expose:

-   action;
-   timestamp;
-   issuer;
-   software;
-   ingredient;
-   signature status.

This turns the application from a simple cleaner into a **provenance
explorer**.

------------------------------------------------------------------------

# 53. Future Feature: Privacy Presets

``` text
QUICK CLEAN

Remove:
✓ GPS
✓ Camera/device
✓ Software
✓ EXIF
✓ XMP
```

``` text
PROVENANCE CLEAN

Remove:
✓ C2PA
✓ EXIF
✓ XMP
✓ IPTC
```

``` text
CUSTOM

Choose exactly what to remove.
```

------------------------------------------------------------------------

# 54. Future Feature: Batch Processing

``` text
100 images
      |
      v
Analyze
      |
      v
Select cleaning profile
      |
      v
Process locally
      |
      v
ZIP
      |
      v
Download
```

This would be especially useful for creators and developers.

------------------------------------------------------------------------

# 55. Future Feature: CLI

A future developer-focused CLI could look conceptually like:

``` bash
provenance inspect image.jpg
```

``` bash
provenance clean image.jpg \
  --remove-exif \
  --remove-xmp \
  --remove-c2pa
```

``` bash
provenance diff original.jpg cleaned.jpg
```

The CLI would share the same core processing engine where technically
feasible.

------------------------------------------------------------------------

# 56. Future Feature: Browser Extension

Right-click an image:

``` text
Inspect Image Provenance
Clean Image Metadata
Download Clean Copy
```

This would make the tool useful directly from:

-   image search;
-   content platforms;
-   documentation;
-   social websites.

------------------------------------------------------------------------

# 57. Monetization Possibilities

The core browser tool can remain free.

Potential premium features:

-   batch processing;
-   advanced provenance reports;
-   CLI;
-   API;
-   team tooling;
-   enterprise privacy controls;
-   automated provenance auditing;
-   developer SDK.

Avoid monetizing by storing user images unless the product explicitly
changes its privacy model.

------------------------------------------------------------------------

# 58. Competitive Differentiation

The strongest positioning is not:

> "We remove AI labels."

Instead:

> **"Understand and control image provenance --- privately."**

Differentiators:

1.  Client-side processing.
2.  C2PA-aware inspection.
3.  EXIF/XMP/IPTC inspection.
4.  Selective cleaning.
5.  Automatic verification.
6.  Metadata diff.
7.  Explicit distinction between metadata and pixel-level watermarking.
8.  No account required for basic use.

------------------------------------------------------------------------

# 59. Product Naming Ideas

Potential names:

-   CleanLens
-   Provenance Clean
-   MetaClean
-   ImageClean
-   Provenance Lens
-   ClearMeta
-   CleanFrame
-   MetaLens
-   Image Provenance Tool
-   Provenance Inspector

Recommended positioning:

**CleanLens --- Image Provenance Inspector & Cleaner**

------------------------------------------------------------------------

# 60. Final MVP Definition

The MVP is complete when a user can:

``` text
1. Open the application
        ↓
2. Drop a JPEG/PNG/WebP
        ↓
3. Analyze it locally
        ↓
4. See EXIF/XMP/IPTC information
        ↓
5. See C2PA status
        ↓
6. Understand AI-generation claims
        ↓
7. Select metadata/provenance to remove
        ↓
8. Generate a new image
        ↓
9. Automatically verify the output
        ↓
10. View the metadata diff
        ↓
11. Download the clean copy
```

And the product must clearly communicate:

> **Metadata/provenance cleaning is not equivalent to proving that an
> image was never AI-generated.**

------------------------------------------------------------------------

# 61. Recommended Development Order

``` text
                    PRODUCT
                       |
                       v
                ┌──────────────┐
                │ File Upload  │
                └──────┬───────┘
                       |
                       v
              ┌─────────────────┐
              │ File Validation │
              └────────┬────────┘
                       |
                       v
              ┌─────────────────┐
              │ Metadata Engine │
              └────────┬────────┘
                       |
                       +----------------+
                       |                |
                       v                v
                EXIF/XMP/IPTC          C2PA
                       |                |
                       +-------+--------+
                               |
                               v
                      Unified Analysis
                               |
                               v
                       Inspector UI
                               |
                               v
                       Cleaning Engine
                               |
                               v
                        Output Builder
                               |
                               v
                         Verification
                               |
                               v
                        Metadata Diff
                               |
                               v
                           Download
```

The most important engineering milestone is **not the UI**.

It is proving during the technical spike that the selected
browser-compatible libraries can reliably:

1.  parse the target formats;
2.  inspect C2PA manifests;
3.  extract the required assertions;
4.  remove supported metadata;
5.  generate valid output files;
6.  re-open and verify those files;
7.  perform acceptably in a browser worker.

Once that foundation works, the rest of the application is comparatively
straightforward.

------------------------------------------------------------------------

# 62. Definition of Done

The MVP can be considered production-ready when:

-   [ ] Supported image types are validated correctly.
-   [ ] Analysis happens in a Web Worker.
-   [ ] EXIF parsing works against the fixture corpus.
-   [ ] XMP parsing works against the fixture corpus.
-   [ ] IPTC parsing works where supported.
-   [ ] C2PA detection works against representative fixtures.
-   [ ] C2PA claims are normalized into the internal model.
-   [ ] C2PA signature status is represented accurately.
-   [ ] Cleaning operations are individually selectable.
-   [ ] Original files are never mutated.
-   [ ] Output files can be opened by standard image viewers.
-   [ ] Cleaned output is automatically re-analyzed.
-   [ ] Metadata diff is accurate.
-   [ ] Unsupported operations are clearly reported.
-   [ ] No "AI-free" claim is made.
-   [ ] No image data is sent to a backend in local mode.
-   [ ] Security limits are implemented.
-   [ ] Accessibility checks pass.
-   [ ] Browser compatibility is documented.
-   [ ] Error states are handled gracefully.
-   [ ] Representative regression fixtures are included.
-   [ ] C2PA implementation is tested against the version supported by
    the selected SDK.
-   [ ] Privacy/network behavior has been audited.

------------------------------------------------------------------------

# 63. Final Product Concept

The application should ultimately feel less like an "AI tag remover" and
more like a **developer-grade image provenance laboratory with a very
simple consumer UX**.

The core loop is:

``` text
             INSPECT
                ↓
            UNDERSTAND
                ↓
              CHOOSE
                ↓
              CLEAN
                ↓
             VERIFY
```

That distinction is important.

The product should not promise:

> "Make AI images undetectable."

It should promise:

> **"See what provenance and metadata your image contains, remove the
> supported information you choose, and verify the resulting file ---
> privately."**
