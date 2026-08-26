# Test corpus

A versioned set of Reader's Web test documents, consumed two ways:

- **`standalone/` + `hostile-standalone/`** → mirrored via `deploy-standalone.sh` into a
  WordPress site's `static-documents/test-corpus/` folder, served at `/static/...`.
- **`embedded/` + `hostile-embedded/`** → mirrored via `deploy-embedded.sh` into a
  separate, independently configured location (`EMBEDDED_DEPLOY_PATH`), since embedded
  HDOC/CDOC/CONDOC piggyback on arbitrary HTML pages and don't require WordPress at all.
- **`posts/` + `hostile-posts/`** → turned into WordPress pages (with meta) via
  `deploy-posts.sh`.

Re-running `deploy-all.sh` is safe and idempotent: editing a fixture and re-deploying
updates the same WP page / mirrored file in place — no duplicate pages, no manual cleanup.
`generate-toc.sh` (run last, automatically via `deploy-all.sh`) (re)builds a single
table-of-contents page linking to everything just deployed.

## Setup

```sh
cp config.sh.example config.sh
# edit config.sh: WP_PATH, EMBEDDED_DEPLOY_PATH, EMBEDDED_BASE_URL, SAFE_URL_PATTERN
./scripts/deploy-all.sh
```

**wp-cli environment:** for a Local by Flywheel site, `wp` is only pre-configured (correct
PHP version + correct per-site MySQL socket) inside that site's own **Site Shell** — open
it from the Local app (click the site → the terminal/"Open Site Shell" icon) and run the
deploy scripts from there, not from a regular Terminal window.

**Shortcuts:** `~/.bash_profile` has `rw-*` aliases pointing at these scripts, so from any
directory (including Local's Site Shell) you can just run:

```sh
rw-deploy-all          # deploy-standalone.sh + deploy-embedded.sh + deploy-posts.sh + generate-toc.sh, in order
rw-deploy-standalone    # standalone/ + hostile-standalone/ -> static-documents/
rw-deploy-embedded      # embedded/ + hostile-embedded/ -> EMBEDDED_DEPLOY_PATH
rw-deploy-posts         # posts/ + hostile-posts/ -> WP pages
rw-generate-toc         # rebuild the table-of-contents page (run after the others)
```

Requires `wp-cli`, `rsync`, and `jq` on PATH. Deploys refuse to run unless the target
site's URL matches `SAFE_URL_PATTERN` (default `.local`) — see `scripts/lib/safety-check.sh`.

## What each fixture exercises

Smoke case numbers refer to `Testing_roadmap.md` §3 (plugin repo, `noinclude/`).

### `standalone/`
- `basic.hdoc` — minimal valid HDOC; served at `/static/...` (smoke case #8).
- `collage-basic.cdoc` — minimal valid CDOC collage.
- `condoc-basic.condoc` — minimal valid CONDOC wrapping an external page.

### `hostile-standalone/`
- `broken-xml.hdoc` — malformed XML outside `<content>`; must surface a `<parsererror`
  rather than crash the reader.
- `script-in-content.hdoc` — script/event-handler injection inside `<content>`; must be
  stripped by DOMPurify.
- `svg-with-script.cdoc` — script injection inside the SVG; must be stripped by
  `sanitizeCdocSvg`.

### `embedded/`
- `basic-embedded-hdoc.html` — a raw HTML page piggybacking a normal-looking article with
  `.hdoc-content` + `#hdoc-data` JSON.
- `forced-embedded-hdoc.html` — same shape with `"forced": true`, so it renders as HDOC
  even as the main left-side document.

### `hostile-embedded/`
- `missing-h1-embedded-hdoc.html` — valid markup but no `header.h1` in the JSON;
  `EmbHDOCParser` must fail closed (toast, not a throw or broken render).
- `script-in-content-embedded-hdoc.html` — script/event-handler injection inside
  `.hdoc-content`; must be stripped by `sanitizeHtml`.

### `posts/`
- `basic-post` — typical HDOC page, default display mode, with an example connection to
  `standalone/basic.hdoc` (smoke case #7's mechanics, without a reciprocal fixture yet).
- `cdoc-post` — CDOC page (smoke case #5).
- `condoc-post` — CONDOC page (smoke case #6).
- `embedded-hdoc-post`, `embedded-hdoc-forced-post`, `doc-in-reader-post`,
  `standalone-doc-post` — identical body content, one per `_hdoc_display_mode` value
  (smoke cases #1–4), isolating that one variable.

### `hostile-posts/`
- `hostile-connections-post` — injection payload in the `_static_web_connections_info`
  meta value; the plugin's own `wp_kses` sanitization must strip it before the reader ever
  parses it (distinct from a hostile *file's* connections block).
- `hostile-cdoc-svg-post` — script injection in the `_cdoc_svg` meta value; the plugin's
  own SVG sanitizer must strip it independently of the extension's `sanitizeCdocSvg`.

## Not yet covered (add as needed)

Two posts connected to each other (reciprocal flink), full/hostile inventory beyond the
starter set, comment fixtures, proxy SSRF cases — see `Testing_roadmap.md` §2 in the
plugin repo for the fuller inventory.
