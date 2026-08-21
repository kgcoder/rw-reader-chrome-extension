/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from "./Globals.js"
import { addScrollEndListener, setTheme, showToastMessage } from "./helpers.js";
import { setFontSet } from "./Fonts.js";
import IconsInfo from "./Icons.js";
import { parseStaticContent } from "./parsers/ParsingManager.js";
import { checkKey } from "./KeyboardManager.js";
import { getObjectFromLocalStorage } from "./LocalStorageManager.js";

let mainDocData
window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const msg = event.data;
        if (msg.type === "FLINK_THICKNESS_UPDATED") {
            const useThinLinks = msg.useThinLinks
            g.readingManager.flinkStyle = useThinLinks ? 'thin' : 'thick'
            g.readingManager.redrawFlinks()

      }
      if(msg.type === "DOWNLOAD_USER_SPECIFIED_PAGE"){

            const url = msg.url

            if(!url || !url.trim())return

            g.readingManager.downloadOnePage(url, false, true)

      }
      if (msg.type === "THEME_CHANGED") {
            const newTheme = msg.theme
            // shouldSave is hardcoded false: receiving a broadcast must never re-trigger
            // a storage write — only the user-initiated Ctrl+[ path in KeyboardManager.js saves.
            if (newTheme && newTheme !== g.currentTheme) {
                setTheme(newTheme, false)
            }
      }
      if (msg.type === "FONT_SIZE_CHANGED") {
            const newFontSize = msg.fontSize
            if (newFontSize && newFontSize !== g.pdm.fontSize) {
                g.pdm.setFontSize(newFontSize)
            }
      }
      if (msg.type === "FONT_SET_CHANGED") {
            const newFontSet = msg.fontSet
            // shouldSave-equivalent: broadcasts never re-trigger a storage write,
            // only the user-initiated popup selection saves.
            if (newFontSet !== undefined && newFontSet !== g.currentFontSet) {
                setFontSet(newFontSet, false)
            }
      }
      if (msg.type === "FAVORITES_CHANGED") {
            g.favorites = msg.favorites ?? []
      }
});

window.addEventListener('initReader', async (e) => {
    const { url, contentString, useThinLinks, savedParsingRules } = e.detail;
    g.readingManager.flinkStyle = useThinLinks ? 'thin' : 'thick'
    mainDocData = e.detail

    const {dataObject,error} = await parseStaticContent(contentString,url, savedParsingRules)


    if(dataObject && !error){
        await loadUIAndIcons()
    }


    

    const container = document.body
    //snapping
    container.addEventListener('scroll',() => {
        if (g.pdm.isFlinksListOpen) {
            g.pdm.toggleFlinksList()
        }
    })

    const snapToNearestEdge = () => {
        const halfway = container.scrollWidth / 4;

        if (container.scrollLeft > halfway) {
            container.scrollTo({
                left: container.scrollWidth,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        }
    };

    addScrollEndListener(container, snapToNearestEdge);


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


    dispatchReaderReady(url)



});


async function loadUIAndIcons() {

    g.flinksCanvas = document.getElementById('flinks-canvas')
    g.flinksCtx = g.flinksCanvas.getContext("2d")
    g.iconsInfo = new IconsInfo()

    g.iconsInfo.loadAllIcons()
    g.pdm.loadUI()


    document.onkeydown = checkKey

    await useSavedTheme()
    await useSavedFontSize()
    await useSavedFontSet()
    await useSavedFavorites()

}


async function useSavedTheme() {
    let { value: saved } = await getObjectFromLocalStorage('theme')
    if (!saved) {
        saved = "light"
    }
    setTheme(saved)
    g.currentTheme = saved
}


async function useSavedFontSet() {
    const { value: saved } = await getObjectFromLocalStorage('fontSet')
    await setFontSet(saved, false)
}


async function useSavedFavorites() {
    const { value: saved } = await getObjectFromLocalStorage('favorites')
    g.favorites = saved ?? []
}


async function useSavedFontSize() {
    const { value: saved } = await getObjectFromLocalStorage('fontSize')
    if (saved) {
        g.pdm.fontSize = saved
    }
}



function dispatchReaderReady(url) {
    if (window.swpReaderReadyFired) return
    window.swpReaderReadyFired = true
    document.dispatchEvent(new CustomEvent('swpReaderReady', { detail: { url } }))
}

