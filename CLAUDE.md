# RW Reader Chrome Extension — CLAUDE.md

## Project Overview

This extension allows you to explore the Reader's Web and view visible connections between web pages. 

## The Reader's Web

The Reader's Web is a new part of the browsable web where reader, not the publisher decides what web pages look like. It is similar in philosophy to RSS — the site owner provides only the content, while the reader's software decides how to style and display it — but unlike RSS it is based on standalone documents that can show up in browser tabs, and it supports visible connections between pages.

Eearlier, the Reader's Web was also referred to as **Static Web**, **Default Web** or **Web 1.1**.

### Document Formats

There are three new standalone document formats and three equivalent embedded variants.

#### Standalone Formats

| Format | Root element | Content | File extension |
|--------|-------------|---------|----------------|
| **HDOC** | `<hdoc>` | HTML or plain text (no scripts, no styles) | `.hdoc` |
| **CDOC** | `<cdoc>` | An SVG image (a collage) | `.cdoc` |
| **CONDOC** | `<condoc>` | A connection-only document that loads another site's page as the main doc | `.condoc` |

**HDOC** is the primary text document type. It is XML-based, script-free, style-free. Structure: `<metadata>`, `<header>`, `<fallback>`, `<content>` (HTML/text), `<panels>`, `<copy-info>`, `<connections>`.

**CDOC** content is an SVG image (a collage). Connections attach to specific coordinate points on the SVG.

**CONDOC** loads an external URL as the left-panel document and connects it with visible connections to pages on the right. It allows annotating any third-party page with connections without modifying it.

#### Embedded Variants

Embedded versions **piggyback on regular HTML pages** — they serve both ordinary visitors and HDOC-aware clients from the same URL:

- **Embedded HDOC** — the HTML page contains a `<div class="hdoc-content">` with the main content and a `<script type="application/json" id="hdoc-data">` block with structured metadata (header, panels, connections, removal-selectors).
- **Embedded CDOC** — the reader template embeds the CDOC source in a `<script type="application/json" id="cdoc-source">` tag.
- **Embedded CONDOC** — same pattern, using `id="condoc-source"`.

#### Visible Connections

Documents connect to each other using **visible connections** (called "floating links" or "flinks" in the code). A connection specifies:
- The **target document URL**
- The **source anchor** (a text range in an HDOC, or an x/y point in a CDOC)
- The **destination anchor** (text range in the target HDOC, or point in a target CDOC)

The main document is shown on the left; any connected documents open in tabs on the right (within the reader UI, not regular browser tabs).

### Specs

Spec files live in [noinclude/specs/](noinclude/specs/). Currently present:
- [noinclude/specs/HDOC_spec.md](noinclude/specs/HDOC_spec.md) — full HDOC format specification
- [noinclude/specs/CDOC_spec.md](noinclude/specs/CDOC_spec.md) — full CDOC format specification
- [noinclude/specs/Embedded_HDOC_spec.md](noinclude/specs/Embedded_HDOC_spec.md) — Embedded HDOC specification
- [noinclude/specs/Embedded_CDOC_spec.md](noinclude/specs/Embedded_CDOC_spec.md) — Embedded CDOC specification
- [noinclude/specs/Embedded_CONDOC_spec.md](noinclude/specs/Embedded_CONDOC_spec.md) — Embedded CONDOC specification
- [noinclude/specs/Static_comments_spec.md](noinclude/specs/Static_comments_spec.md) — comments JSON format

Not all document types have specs in this repo yet.

---

## The Browser Extension

The **RW Reader** Chrome extension (available on the Chrome Web Store) is the primary client that supports these document formats.

**Tech:** MV3, vanilla JS, ES modules, no build toolchain, no tests.

### Extension Architecture

| File | Role |
|------|------|
| `extension/content.js` | Content script injected on all pages. Detects page type, triggers reader or PR Constructor. |
| `extension/bridge.js` | Communication bridge between content script and page context. |
| `extension/background.js` | Service worker. Proxies `fetchWebPage` messages to bypass CORS. |
| `extension/popup.html` / `popup.js` | Extension action popup. |
| `reader/reader.html` | Main reader UI. Entry point: `readerStartUp.js`. |
| `reader/prconstructor.html` | Parsing Rules Constructor. Entry: `prConstructorStartup.js`. Lets users define CSS selectors to extract content from any website as a generated HDOC (subtype 3). |

### Reader (Frontend)

- **Core managers:** `PopupDocumentManager.js`, `ReadingManager.js`, `NoteDivsMethods.js`, `CollageViewer.js`, `CollageDataLoader.js`, `PageInfoManager.js`, `ExportPageManager.js`.
- **Parsers:** `parsers/HDOCParser.js`, `parsers/EmbHDOCParser.js`, `parsers/CDOCParser.js`, `parsers/CondocParser.js`, `parsers/HtmlPageParser.js`, `parsers/PlainTextParser.js`, `parsers/ParsingManager.js`.
- **Models:** `models/FloatingLink.js`, `models/FLEnd.js`, `models/FLTextEnd.js`, `models/FLPointEnd.js`, `models/Line.js`, `models/Crosshair.js`, `models/ImageView.js`, `models/Viewport.js`.
- **Utilities:** `helpers.js`, `constants.js`, `Globals.js`, `NetworkManager.js`, `KeyboardManager.js`, `HeaderMethods.js`, `MultipleLinksPopupManager.js`, `Icons.js`, `LocalStorageManager.js`.
- **Styles:** `reader.css`, `ExportPage.css`, `PageInfo.css`, `hdocStyles.css`, `themes/light.css`, `themes/dark.css`, `themes/sepia.css`, `themes/screenshot-theme.css`.
- **Third-party:** `dompurify/purify.es.mjs` (HTML sanitizer), `hashing/sha256-es/` (SHA-256 for floating link hashing).

Global state lives in [reader/Globals.js](reader/Globals.js): `g.pdm` (PopupDocumentManager), `g.readingManager`, `g.noteDivsManager`.

Document subtypes: `0`=local hdoc, `1`=standalone hdoc, `2`=embedded hdoc, `3`=generated hdoc (parsing rules), `4`=generated hdoc (Readability), `5`=cdoc, `6`=sdoc (not yet), `7`=condoc, `8`=embedded cdoc, `9`=embedded condoc.


---