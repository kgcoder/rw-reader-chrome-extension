# RW Reader Chrome Extension — CLAUDE.md

## Project Overview

This extension allows you to explore the Reader's Web and view visible connections between web pages.

The **Reader's Web** (earlier called Static Web, Default Web or Web 1.1) is a part of the web where the reader, not the publisher, decides what pages look like. It uses three document formats — **HDOC** (text), **CDOC** (SVG collage), **CONDOC** (connections over a third-party page) — plus embedded variants that piggyback on regular HTML pages. Documents are linked by **visible connections** ("floating links" / "flinks" in the code).

The **RW Reader** Chrome extension (on the Chrome Web Store) is the primary client for these formats.

**Tech:** MV3, vanilla JS, ES modules, no build toolchain, no tests. Code lives in [extension/](extension/); the reader UI is in [extension/reader/](extension/reader/).

## Detailed docs

Read the relevant file before working in that area:

- [noinclude/claude/readers-web.md](noinclude/claude/readers-web.md) — the Reader's Web, document formats (standalone and embedded), visible connections, and the list of spec files in [noinclude/specs/](noinclude/specs/).
- [noinclude/claude/extension-architecture.md](noinclude/claude/extension-architecture.md) — extension files and their roles, the extension's host adapter.
- [noinclude/claude/persisted-settings.md](noinclude/claude/persisted-settings.md) — how to add a persisted, cross-tab-synced reader setting (theme, font size, ...). Required reading before adding any user-configurable setting.
- [extension/reader/CLAUDE.md](extension/reader/CLAUDE.md) and [extension/reader/docs/](extension/reader/docs/) — the reader's own rules, modules, global state (`g.*`), document subtype numbers and the `g.hostAdapter` interface ([host-adapter.md](extension/reader/docs/host-adapter.md)).

## Key Rules

- [extension/reader/](extension/reader/) is a git submodule ([kgcoder/rw-reader-ui](https://github.com/kgcoder/rw-reader-ui)) shared with the Reader's Web Publisher WordPress plugin. Reader changes are committed and pushed in the submodule (its own repo), then the pin is bumped here with `git add extension/reader`. The plugin's pin has to be bumped separately.
- The reader must stay host-agnostic. Anything extension-specific (`chrome.*`, `bridge.js` messaging, extension DOM ids) belongs in [extension/adapter/](extension/adapter/), not in `extension/reader/`.
- After cloning or switching branches, run `git submodule update --init` if `extension/reader/` is empty or out of date.
