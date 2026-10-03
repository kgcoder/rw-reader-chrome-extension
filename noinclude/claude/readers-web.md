# The Reader's Web

The Reader's Web is a new part of the browsable web where reader, not the publisher decides what web pages look like. It is similar in philosophy to RSS — the site owner provides only the content, while the reader's software decides how to style and display it — but unlike RSS it is based on standalone documents that can show up in browser tabs, and it supports visible connections between pages.

Eearlier, the Reader's Web was also referred to as **Static Web**, **Default Web** or **Web 1.1**.

## Document Formats

There are three new standalone document formats and three equivalent embedded variants.

### Standalone Formats

| Format | Root element | Content | File extension |
|--------|-------------|---------|----------------|
| **HDOC** | `<hdoc>` | HTML or plain text (no scripts, no styles) | `.hdoc` |
| **CDOC** | `<cdoc>` | An SVG image (a collage) | `.cdoc` |
| **CONDOC** | `<condoc>` | A connection-only document that loads another site's page as the main doc | `.condoc` |

**HDOC** is the primary text document type. It is XML-based, script-free, style-free. Structure: `<metadata>`, `<header>`, `<fallback>`, `<content>` (HTML/text), `<panels>`, `<copy-info>`, `<connections>`.

**CDOC** content is an SVG image (a collage). Connections attach to specific coordinate points on the SVG.

**CONDOC** loads an external URL as the left-panel document and connects it with visible connections to pages on the right. It allows annotating any third-party page with connections without modifying it.

### Embedded Variants

Embedded versions **piggyback on regular HTML pages** — they serve both ordinary visitors and HDOC-aware clients from the same URL:

- **Embedded HDOC** — the HTML page contains a `<div class="hdoc-content">` with the main content and a `<script type="application/json" id="hdoc-data">` block with structured metadata (header, panels, connections, removal-selectors).
- **Embedded CDOC** — the reader template embeds the CDOC source in a `<script type="application/json" id="cdoc-source">` tag.
- **Embedded CONDOC** — same pattern, using `id="condoc-source"`.

### Visible Connections

Documents connect to each other using **visible connections** (called "floating links" or "flinks" in the code). A connection specifies:
- The **target document URL**
- The **source anchor** (a text range in an HDOC, or an x/y point in a CDOC)
- The **destination anchor** (text range in the target HDOC, or point in a target CDOC)

The main document is shown on the left; any connected documents open in tabs on the right (within the reader UI, not regular browser tabs).

## Specs

Spec files live in [noinclude/specs/](../specs/). Currently present:
- [HDOC_spec.md](../specs/HDOC_spec.md) — full HDOC format specification
- [CDOC_spec.md](../specs/CDOC_spec.md) — full CDOC format specification
- [Embedded_HDOC_spec.md](../specs/Embedded_HDOC_spec.md) — Embedded HDOC specification
- [Embedded_CDOC_spec.md](../specs/Embedded_CDOC_spec.md) — Embedded CDOC specification
- [Embedded_CONDOC_spec.md](../specs/Embedded_CONDOC_spec.md) — Embedded CONDOC specification
- [Static_comments_spec.md](../specs/Static_comments_spec.md) — comments JSON format

Not all document types have specs in this repo yet.
