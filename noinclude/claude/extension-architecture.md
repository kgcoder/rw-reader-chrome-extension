# Extension Architecture

| File | Role |
|------|------|
| `extension/content.js` | Content script injected on all pages. Detects page type, triggers reader or PR Constructor. |
| `extension/bridge.js` | Communication bridge between content script and page context. |
| `extension/background.js` | Service worker. Proxies `fetchWebPage` messages to bypass CORS. |
| `extension/popup.html` / `popup.js` | Extension action popup. |
| `extension/adapter/reader.html` | Main reader UI markup. Entry script (injected by `content.js`): `extension/adapter/startup.js`. |
| `extension/prconstructor/prconstructor.html` | Parsing Rules Constructor. Entry: `prConstructorStartup.js`. Lets users define CSS selectors to extract content from any website as a generated HDOC (subtype 3). |

## Host adapter

The extension's implementation of the reader's `g.hostAdapter` interface lives in [extension/adapter/](../../extension/adapter/):

| File | Role |
|------|------|
| `HostAdapter.js` | Implements `g.hostAdapter`. `fetchWebPage` goes through a private `MessagePort` handed over by `bridge.js` (`READER_READY` → `VC_INIT` handshake) to `background.js`. `getSetting`/`saveSetting` use `chrome.storage.local` via `bridge.js`. `initReader()` starts the reader on the `initReader` window event dispatched by `content.js`, and handles the `THEME_CHANGED`/`FONT_SIZE_CHANGED`/`FONT_SET_CHANGED`/`FAVORITES_CHANGED`/`FLINK_THICKNESS_UPDATED`/`DOWNLOAD_USER_SPECIFIED_PAGE` messages. |
| `startup.js` | Module entry point: sets `g.hostAdapter = new HostAdapter()` and imports `reader/readerStartUp.js`. |
| `reader.html` | Reader DOM spliced into the page by `content.js`. |
| `reader.css` | Extension-specific reader styles. |

`popup.js` (font sets) and `prconstructor/` also import modules from `extension/reader/`.

## Reader (Frontend)

[extension/reader/](../../extension/reader/) is the shared [rw-reader-ui](https://github.com/kgcoder/rw-reader-ui) submodule. Its modules, global state (`g.*`) and document subtype numbers are documented in [extension/reader/docs/architecture.md](../../extension/reader/docs/architecture.md), and the adapter interface in [extension/reader/docs/host-adapter.md](../../extension/reader/docs/host-adapter.md).
