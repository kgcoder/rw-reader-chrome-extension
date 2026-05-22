/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import g from "./Globals.js"
import { setTheme, showToastMessage } from "./helpers.js";
import IconsInfo from "./Icons.js";
import { parseStaticContent } from "./parsers/ParsingManager.js";
import { checkKey } from "./KeyboardManager.js";
import { getObjectFromLocalStorage } from "./LocalStorageManager.js";

let mainDocData
window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data;
        if (msg.type === "FLINK_THICKNESS_UPDATED") {
            const useThickLinks = msg.useThickLinks
            g.readingManager.flinkStyle = useThickLinks ? 'thick' : 'thin'
            g.readingManager.redrawFlinks()

      }
      if(msg.type === "DOWNLOAD_USER_SPECIFIED_PAGE"){

            const url = msg.url

            if(!url || !url.trim())return

            g.readingManager.downloadOnePage(url)

      }
});

window.addEventListener('initReader', async (e) => {
    const { url, contentString, useThickLinks, savedParsingRules } = e.detail;
    g.readingManager.flinkStyle = useThickLinks ? 'thick' : 'thin'
    mainDocData = e.detail
    
    const {dataObject,error} = await parseStaticContent(contentString,url, savedParsingRules)

    if(dataObject && !error){
        loadUIAndIcons()
    }


    if(!dataObject){
      setTimeout(() => {
        window.postMessage({ type: "RELOAD_PAGE" }, "*")
      },1000)
    }else if (dataObject.docType === 'c') {
        await g.pdm.loadCollage(dataObject)
    } else if(dataObject.docType === 'h'){
        await g.pdm.loadDocument(dataObject) 
    } else if (dataObject.docType === 'condoc') {
        g.pdm.showEmptyCondoc(dataObject)
    }


});


function loadUIAndIcons() {

    g.flinksCanvas = document.getElementById('flinks-canvas')
    g.flinksCtx = g.flinksCanvas.getContext("2d")
    g.iconsInfo = new IconsInfo()

    g.iconsInfo.loadAllIcons()
    g.pdm.loadUI()


    document.onkeydown = checkKey

    useSavedTheme()

}


async function useSavedTheme() {
    let { value: saved } = await getObjectFromLocalStorage('theme')
    if (!saved) {
        saved = "light"
    }
    setTheme(saved)
    g.currentTheme = saved
}



