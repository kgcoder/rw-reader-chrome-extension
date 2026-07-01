/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import NoteDivsManager from "./NoteDivsMethods.js";
import PopupDocumentManager from "./PopupDocumentManager.js";
import ReadingManager from "./ReadingManager.js";

const Globals = {

    pdm: new PopupDocumentManager(),
    readingManager: new ReadingManager(),
    noteDivsManager: new NoteDivsManager()
}

export default Globals




/*
 doc subtypes
 0. local hdoc (with markdown)
 1. standalone hdoc
 2. embedded hdoc
 3. generated hdoc (using parsing rules)
 4. generated hdoc (using Readability)
 5. cdoc
 6. sdoc (doesn't exist yet)
 7. condoc
 8. embedded cdoc
 9. embedded condoc
*/