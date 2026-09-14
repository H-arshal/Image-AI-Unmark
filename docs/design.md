# Image AI-Unmark --- Design System

## 1. Design Direction

Image AI-Unmark uses a **professional, light, privacy-focused utility
interface**.

The visual language is intentionally restrained:

-   Light background
-   White content surfaces
-   Dark navy/charcoal typography
-   Green as the primary action and privacy accent
-   Thin, subtle borders
-   **90° corners everywhere**
-   No rounded cards, pills, or excessive decoration
-   Compact spacing so the complete workflow remains visible on **one
    landscape screen**
-   Clear visual hierarchy over decorative elements

The interface should feel like a polished developer/privacy utility
rather than a consumer marketing page.

------------------------------------------------------------------------

## 2. Layout Principles

### Primary requirement

The entire application workflow should fit within a **single landscape
viewport** without requiring vertical scrolling at common desktop
resolutions.

Recommended design target:

-   Desktop width: `1280px – 1600px`
-   Desktop height: approximately `800px – 1000px`
-   Layout: landscape-first
-   Main content max-width: approximately `1480px`
-   Horizontal page padding: `24px – 40px`

### Page structure

``` text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Brand / Title                                      Local Status   Theme      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Intro / Description                                                          │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Upload Image                  │ Selected Image                               │
│                               │ Preview + file information                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ Detected Metadata                                                            │
│ ──────────────────────────────────────────────────────────────────────────── │
│ Type | Status | Details | Size | Remove                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ Removal Options                                                              │
│ Description                    Privacy Clean | Full Clean | Custom           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Reset       Remove Selected Metadata              Download Cleaned Image     │
└──────────────────────────────────────────────────────────────────────────────┘
```

The upload and selected-image sections are arranged **side-by-side** to
save vertical space.

------------------------------------------------------------------------

# 3. Color System

## Backgrounds

``` css
--color-page: #F7F9F8;
--color-surface: #FFFFFF;
--color-surface-muted: #F4F7F6;
--color-surface-hover: #F0F5F3;
```

The page should use an almost-white background rather than pure white.

Content panels use white.

------------------------------------------------------------------------

## Typography

``` css
--color-text-primary: #101827;
--color-text-secondary: #334155;
--color-text-muted: #64748B;
--color-text-disabled: #94A3B8;
```

Primary text should have strong contrast.

Secondary descriptions should be visibly softer but remain readable.

------------------------------------------------------------------------

## Borders

``` css
--color-border: #D7DEE2;
--color-border-strong: #BCC7CC;
--color-border-focus: #0B8F70;
```

Borders should remain thin and subtle.

Recommended:

``` css
border: 1px solid var(--color-border);
```

------------------------------------------------------------------------

## Green Accent

Green represents:

-   Privacy
-   Local processing
-   Successful detection
-   Selected actions
-   Primary CTA
-   Successful completion

``` css
--color-primary: #078B70;
--color-primary-dark: #06735E;
--color-primary-light: #E8F6F1;

--color-success: #0A8F70;
--color-success-soft: #E8F7F1;
```

Do not use green everywhere. Reserve it for meaningful actions and
states.

------------------------------------------------------------------------

## Warning / Detection Accent

C2PA detection uses a restrained orange accent:

``` css
--color-warning: #F59E0B;
--color-warning-soft: #FFF7E6;
```

The orange indicator communicates:

> Metadata was found.

It should not make the entire interface feel like an error state.

------------------------------------------------------------------------

# 4. Typography

Use a modern sans-serif font.

Recommended:

``` css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

### Suggested scale

  Element                 Size     Weight
  ----------------- ---------- ----------
  App name            22--26px        700
  Main heading        30--36px        700
  Section heading     17--20px        700
  Body                14--16px        400
  Metadata table          14px   400--600
  Small labels        12--13px        500
  Status text         13--14px        500

Keep line heights compact because the complete interface must fit in one
screen.

------------------------------------------------------------------------

# 5. Corners

## Critical rule

**Every component uses 90-degree corners.**

Do not use:

``` css
border-radius: 4px;
border-radius: 8px;
border-radius: 12px;
border-radius: 999px;
```

Use:

``` css
border-radius: 0;
```

This applies to:

-   Cards
-   Panels
-   Buttons
-   Upload areas
-   Inputs
-   Checkboxes
-   Image containers
-   Status containers
-   Navigation elements

The only exception is a tiny circular status indicator if a circular
indicator is needed semantically.

------------------------------------------------------------------------

# 6. Header

The header is compact and horizontal.

### Left

Display:

-   Small brand/icon
-   `Image AI-Unmark`

### Right

Display:

``` text
● Runs locally
  No upload · No server

☼
```

The privacy status should be immediately visible.

Example:

``` text
Runs locally
No upload · No server
```

Use green for the small status dot.

### Header styling

``` css
height: 64px;
border-bottom: 1px solid var(--color-border);
background: var(--color-surface);
```

Avoid a large navigation bar.

------------------------------------------------------------------------

# 7. Intro Section

Use a compact introductory block.

Small eyebrow:

``` text
CLEAN IMAGES. STAY PRIVATE.
```

Main heading:

``` text
Image AI-Unmark
```

Description:

``` text
Inspect declared metadata, then strip the parts you don’t want.
Verify the result — privately, in your browser.
```

The heading should be visually dominant, but the intro should not
consume excessive vertical space.

------------------------------------------------------------------------

# 8. Upload + Selected Image

These are the two most important panels after the header.

Use a two-column grid:

``` css
grid-template-columns: 1fr 1fr;
gap: 12px;
```

------------------------------------------------------------------------

## Upload Panel

Panel title:

``` text
Drop an image here
```

Supporting text:

``` text
or click to choose a file

Supports: .jpg .jpeg .png .webp
```

Primary button:

``` text
Choose Image
```

The drop zone uses a dashed border.

``` css
border: 2px dashed #A8C5BC;
background: #FBFDFC;
```

The upload icon should use the primary green.

### Important

The upload area should feel interactive but not oversized.

------------------------------------------------------------------------

# 9. Selected Image Panel

Panel title:

``` text
Selected Image
```

Top-right button:

``` text
Change
```

The panel contains:

1.  Image preview
2.  File name
3.  File size
4.  Dimensions
5.  MIME type

Example:

``` text
sample-image.png

1.73 MB | 1920 × 1349 | image/png
```

Then a compact information list:

``` text
File name       sample-image.png
File type       image/png
Dimensions      1920 × 1349
File size       1.73 MB
```

Use horizontal dividers rather than cards for each property.

------------------------------------------------------------------------

# 10. Metadata Inspection

This section should occupy the full content width.

Panel header:

``` text
Detected Metadata
```

Supporting description:

``` text
Metadata and additional information found in this image.
```

Right side:

``` text
PNG  ·  1.73 MB
```

------------------------------------------------------------------------

## Table

Columns:

``` text
Type
Status
Details
Size
Remove
```

Recommended proportions:

``` css
Type     12%
Status   18%
Details  50%
Size     12%
Remove    8%
```

Rows:

``` text
EXIF      Not found
XMP       Not found
IPTC      Not found
ICC       Not found
C2PA      Found
Comment   Not found
Text      Not found
```

------------------------------------------------------------------------

## Status Design

### Not found

Use:

-   Small muted gray indicator
-   Muted text

``` text
●  Not found
```

### Found

Use:

-   Small orange indicator
-   Stronger status text

``` text
●  Found
```

The indicator should be small enough not to dominate the table.

------------------------------------------------------------------------

## C2PA Row

The C2PA row is the active detection example.

Details:

``` text
JUMBF/Content Credentials container — structure detected
```

Size:

``` text
21.3 KB
```

The remove checkbox is selected.

Selected checkbox:

``` text
✓
```

Use the primary green.

------------------------------------------------------------------------

# 11. Removal Options

Section title:

``` text
Removal Options
```

Supporting text:

``` text
Choose the metadata you want to strip from the image.
```

Place the three options horizontally.

``` text
Privacy clean
Remove common metadata

Full clean
Remove everything found

Custom
Use the checkboxes above
```

------------------------------------------------------------------------

## Privacy Clean

Purpose:

Remove common privacy-sensitive metadata.

Style:

-   White background
-   Standard border
-   Neutral state

------------------------------------------------------------------------

## Full Clean

Purpose:

Remove all detected metadata.

Style:

-   White background
-   Standard border
-   Neutral state

------------------------------------------------------------------------

## Custom

Purpose:

Allow manual checkbox selection.

This is the selected state in the finalized design.

``` css
border: 2px solid var(--color-primary);
background: var(--color-primary-light);
```

The selected checkmark uses green.

------------------------------------------------------------------------

# 12. Bottom Action Bar

This is the final interaction row.

Use a three-column layout:

``` text
Reset | Remove selected metadata | Download cleaned image
```

Recommended proportions:

``` css
grid-template-columns: 140px 1fr 320px;
gap: 12px;
```

------------------------------------------------------------------------

## Reset

Secondary button.

``` text
Reset
```

White background with a thin border.

------------------------------------------------------------------------

## Remove Selected Metadata

This is the primary action.

``` text
✦  Remove selected metadata
```

Use:

``` css
background: var(--color-primary);
color: white;
border: 1px solid var(--color-primary);
```

It should be the strongest visual element on the page.

Hover:

``` css
background: var(--color-primary-dark);
```

------------------------------------------------------------------------

## Download Cleaned Image

Secondary success-oriented action.

``` text
↓  Download cleaned image
```

Use a pale green background with green border/text.

Disabled state should reduce contrast and interaction affordance.

------------------------------------------------------------------------

# 13. Spacing System

Use a compact spacing scale.

``` css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
```

Recommended section spacing:

``` text
Header → Intro       16–20px
Intro → Upload       16px
Upload → Metadata    12px
Metadata → Options   12px
Options → Actions    12px
```

Avoid excessive whitespace.

The objective is **density with clarity**, not a spacious marketing
layout.

------------------------------------------------------------------------

# 14. Panels

All major sections use the same visual treatment.

``` css
.panel {
  background: #FFFFFF;
  border: 1px solid #D7DEE2;
  border-radius: 0;
}
```

Optional very subtle shadow:

``` css
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
```

Do not use large shadows.

------------------------------------------------------------------------

# 15. Icons

Use simple line icons.

Recommended icon style:

-   1.5--2px stroke
-   Minimal detail
-   Consistent visual weight
-   No colorful illustrations

Useful icons:

-   Image
-   Upload
-   File
-   Shield/lock
-   Brush/clean
-   Download
-   Reset
-   Sun/theme

Icons should support text rather than replace it.

------------------------------------------------------------------------

# 16. Responsive Behavior

Desktop is the primary target.

### Desktop

``` css
.upload-selected {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

### Tablet

Switch to:

``` css
grid-template-columns: 1fr;
```

only when the available width becomes too narrow.

### Mobile

The interface can become vertically stacked, but the desktop experience
must remain landscape-first.

The single-screen requirement applies to the primary desktop design.

------------------------------------------------------------------------

# 17. Accessibility

Maintain:

-   WCAG-friendly text contrast
-   Visible keyboard focus
-   Proper button labels
-   Semantic table markup
-   Accessible checkbox labels
-   `aria-live` for metadata inspection results
-   Clear disabled states
-   No information communicated by color alone

Example focus:

``` css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

------------------------------------------------------------------------

# 18. Interaction States

Every interactive component should have:

### Default

White surface, subtle border.

### Hover

Slight background change and stronger border.

### Focus

Visible green outline.

### Active

Primary green or selected green state.

### Disabled

Reduced contrast without making the element disappear.

------------------------------------------------------------------------

# 19. Privacy Messaging

Privacy is a core product feature and should remain visible.

Primary message:

``` text
Runs locally
No upload · No server
```

Secondary message:

``` text
Nothing leaves this browser tab.
```

Do not make privacy claims more specific than the actual implementation
supports.

The UI should communicate local processing clearly without looking like
a security warning screen.

------------------------------------------------------------------------

# 20. Content Hierarchy

Priority order:

1.  `Image AI-Unmark`
2.  Upload/select image
3.  Selected image
4.  Detected metadata
5.  Removal selection
6.  Remove metadata
7.  Download result
8.  Privacy status

The primary user journey should be obvious:

``` text
Choose image
      ↓
Inspect metadata
      ↓
Select what to remove
      ↓
Remove metadata
      ↓
Download cleaned image
```

------------------------------------------------------------------------

# 21. Visual Personality

The finalized interface should feel:

-   Professional
-   Technical
-   Trustworthy
-   Private
-   Minimal
-   Clean
-   Developer-oriented
-   Functional

Avoid:

-   Glassmorphism
-   Heavy gradients
-   Neon colors
-   Excessive rounded corners
-   Floating cards
-   Large illustrations
-   Decorative blobs
-   Excessive animations
-   Dark theme
-   Pill-shaped controls

------------------------------------------------------------------------

# 22. Final Design Checklist

Before implementation, verify:

-   [x] Light theme
-   [x] Landscape desktop layout
-   [x] All major content visible on one screen
-   [x] Upload and selected image side-by-side
-   [x] Metadata table full width
-   [x] Removal options in one horizontal row
-   [x] Bottom actions in one horizontal row
-   [x] 90° corners everywhere
-   [x] Green primary action
-   [x] Orange C2PA detection indicator
-   [x] Subtle gray borders
-   [x] Compact vertical spacing
-   [x] Professional typography
-   [x] Local-processing privacy message
-   [x] Clear visual hierarchy
-   [x] No unnecessary decoration
