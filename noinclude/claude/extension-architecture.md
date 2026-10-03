# Extension Architecture

| File | Role |
|------|------|
| `extension/content.js` | Content script injected on all pages. Detects page type, triggers reader or PR Constructor. |
| `extension/bridge.js` | Communication bridge between content script and page context. |
| `extension/background.js` | Service worker. Proxies `fetchWebPage` messages to bypass CORS. |
| `extension/popup.html` / `popup.js` | Extension action popup. |
| `extension/adapter/reader.html` | Main reader UI. Entry point: `extension/reader/readerStartUp.js`. |
| `extension/prconstructor/prconstructor.html` | Parsing Rules Constructor. Entry: `prConstructorStartup.js`. Lets users define CSS selectors to extract content from any website as a generated HDOC (subtype 3). |

## Reader (Frontend)

All paths below are relative to `extension/reader/`.

- **Core managers:** `PopupDocumentManager.js`, `ReadingManager.js`, `NoteDivsMethods.js`, `CollageViewer.js`, `CollageDataLoader.js`, `PageInfoManager.js`, `ExportPageManager.js`.
- **Parsers:** `parsers/HDOCParser.js`, `parsers/EmbHDOCParser.js`, `parsers/CDOCParser.js`, `parsers/CondocParser.js`, `parsers/HtmlPageParser.js`, `parsers/PlainTextParser.js`, `parsers/ParsingManager.js`.
- **Models:** `models/FloatingLink.js`, `models/FLEnd.js`, `models/FLTextEnd.js`, `models/FLPointEnd.js`, `models/Line.js`, `models/Crosshair.js`, `models/ImageView.js`, `models/Viewport.js`.
- **Utilities:** `helpers.js`, `constants.js`, `Globals.js`, `NetworkManager.js`, `KeyboardManager.js`, `HeaderMethods.js`, `MultipleLinksPopupManager.js`, `Icons.js`, `LocalStorageManager.js`.
- **Styles:** `reader.css`, `ExportPage.css`, `PageInfo.css`, `hdocStyles.css`, `themes/light.css`, `themes/dark.css`, `themes/sepia.css`.
- **Third-party:** `dompurify/purify.es.mjs` (HTML sanitizer), `hashing/sha256-es/` (SHA-256 for floating link hashing).

Global state lives in [extension/reader/Globals.js](../../extension/reader/Globals.js): `g.pdm` (PopupDocumentManager), `g.readingManager`, `g.noteDivsManager`.

Document subtypes: `0`=local hdoc, `1`=standalone hdoc, `2`=embedded hdoc, `3`=generated hdoc (parsing rules), `4`=generated hdoc (Readability), `5`=cdoc, `6`=sdoc (not yet), `7`=condoc, `8`=embedded cdoc, `9`=embedded condoc.
