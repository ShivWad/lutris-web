---
name: My Game Library
description: A graphite archival interface for a unified local game collection.
colors:
  graphite: "#0e1010"
  graphite-raised: "#151817"
  graphite-soft: "#1c201e"
  rule: "#343936"
  parchment: "#f1eddf"
  parchment-muted: "#aba99f"
  archive-brass: "#d5ad5e"
  indexed-green: "#76c98e"
  error-red: "#e3695e"
typography:
  display:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.75rem)"
    fontWeight: 720
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 450
    lineHeight: 1.55
  label:
    fontFamily: "Archivo Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 680
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  control: "12px"
  surface: "14px"
  chip: "20px"
spacing:
  compact: "8px"
  control: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  field:
    backgroundColor: "{colors.graphite-soft}"
    textColor: "{colors.parchment}"
    rounded: "{rounded.control}"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.archive-brass}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.chip}"
    padding: "9px 14px"
---

# Design System: My Game Library

## Overview

**Creative North Star: "The Personal Game Archive"**

The interface treats cross-store ownership as a carefully indexed physical collection translated into a fast digital tool. It is dark because it is used beside games on a Linux desktop, but its warmth comes from parchment text and restrained brass registration marks rather than neon effects.

Dense contact sheets, accession numbers, source drawers, and metadata ledgers carry the archival idea. The interface stays operational: decoration is subordinate to search, comparison, and inspection.

**Key Characteristics:**

- Dense, cover-led browsing with one visibly selected record.
- Graphite tonal layering separated by fine rules.
- Brass reserved for active state and archive notation.
- Real cover art when available; tactile illustrated fallbacks when it is not.

## Colors

Graphite surfaces form the workspace; parchment carries readable content; brass marks selection and indexing. Provider colors appear only in tiny service identifiers.

**The Registration Ink Rule.** Archive brass is scarce: use it for the current location, active controls, and accession cues—not for large decorative fields.

## Typography

**Display Font:** Archivo Variable (sans-serif fallback)

**Body Font:** Manrope Variable (sans-serif fallback)

Archivo supplies compact, sturdy headings and data labels. Manrope keeps dense metadata and controls calm and legible. Light-on-dark text carries slightly more weight and leading; no functional copy drops below 11px.

### Hierarchy

- **Display** (720, responsive 28–44px, 0.95): page titles only.
- **Headline** (720–730, 29–31px, 1.03–1.05): selected game titles.
- **Title** (650–710, 14–22px): cover labels and section titles.
- **Body** (450–500, 14–15px, 1.5–1.7): controls, descriptions, and explanatory copy.
- **Metadata** (500–540, 11–13px, 1.35–1.55): dates, stores, status, and compact values.
- **Label** (680, 10–11px, 0.07–0.15em tracking): accession marks and structural labels.

**The Two-Face Rule.** Archivo organizes; Manrope explains. Do not add a third decorative face.

## Layout

Desktop uses a 224px persistent archive rail, a fluid contact sheet, and a 330–390px selected-record ledger. Cover cells use a 2:3 ratio and remain intact as columns reflow; titles can use two lines. Search and sorting occupy one toolbar row, with filters on a separate row. At 820px the rail becomes a four-item bottom navigation and an explicitly selected record occupies the viewport; the automatic desktop selection stays hidden. Filters scroll horizontally instead of shrinking below readable widths.

Sections follow compact internal spacing and larger 22–35px separations. The contact sheet prioritizes density without dropping below three columns on a 390px viewport.

## Elevation & Depth

The system is flat by default and relies on tonal layers and fine rules. Soft, offset shadows appear only under the primary refresh control, active navigation, lifted cover hover, and the mobile navigation dock.

**The Flat Archive Rule.** Resting content stays flush to the work surface; depth communicates state, not decoration.

## Shapes

Game artwork and data tables are square-edged archival objects. Interactive controls use gently curved 12–14px corners; small statuses use true pill shapes. Circular geometry is reserved for compact installed and close indicators.

## Components

### Buttons

Primary buttons use parchment on graphite with a 12px corner and strong Archivo/Manrope weight. Hover changes the surface to archive brass; focus uses a 2px brass outline. Disabled refresh controls reduce opacity and retain a wait cursor.

### Chips

Filter and status chips use dark tonal fills and 20px corners. Selected filters invert to brass with graphite text. Provider identities use a colored 7px dot beside a plain text label.

### Cards / Containers

Game cards are not rounded containers: a 1px graphite frame, paper-like accession footer, 2:3 artwork, and terse metadata define the unit. Hover lifts only the framed cover with a soft offset shadow. Selected frames use a double brass keyline.

### Inputs / Fields

Search and selects are 44px tall on graphite-soft surfaces with 12px corners and no resting border. Focus introduces a single inset brass keyline. Placeholder text remains muted but readable. Completed refreshes show a dismissible success message; the indexed timestamp uses the browser's locale after hydration.

### Navigation

Desktop navigation is a restrained archive rail with a solid brass active drawer and a separate service index. Mobile navigation becomes a raised bottom dock with the same active inversion.

### Selected Record Ledger

The ledger pairs an enlarged version of the chosen cover with an edition-aware ownership list, compact definition-list metadata, status chips, and a collapsible raw JSON record. It opens by default on desktop and only after explicit selection on mobile.

## Do's and Don'ts

### Do:

- **Do** keep source identity small and consistent through dot-and-label badges.
- **Do** preserve accession labels, cover ratios, and visible selection linkage.
- **Do** use real provider covers first and the illustrated sprite fallback second.
- **Do** let mobile controls scroll when their complete labels matter.
- **Do** place edition and DLC labels beside ownership evidence rather than folding them into an ambiguous duplicate count.

### Don't:

- **Don't** add launch, install, uninstall, or management actions to read-only surfaces.
- **Don't** replace the contact sheet with generic metric-card or bento layouts.
- **Don't** use neon glows, gradient text, ornamental glass, or rounded containers around every content group.
- **Don't** let an open ledger describe a game without a visibly selected cover.
