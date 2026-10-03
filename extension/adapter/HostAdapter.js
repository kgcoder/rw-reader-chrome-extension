/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from '../reader/Globals.js'
import { setFontSet } from "../reader/Fonts.js"
import { setTheme } from "../reader/helpers.js"
import { addListenersToContainer, applyAllSavedSettings, dispatchReaderReady, loadUIAndIcons } from '../reader/readerStartUp.js'
import { parseStaticContent } from '../reader/parsers/ParsingManager.js'


// _portReady resolves when the private port arrives from bridge.js via the VC_INIT handshake.
// fetchWebPage awaits this, so calls that arrive before the handshake completes are queued naturally.
// If the port never arrives (e.g. another script called stopImmediatePropagation on the VC_INIT
// event), the promise rejects after a timeout and fetches fail with a clear error.
let _port = null
const _portReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        window.removeEventListener('message', capturePort)
        reject(new Error('Reader failed to initialize. Please reload the page.'))
    }, 3000)

    function capturePort(e) {
        if (e.data && e.data.type === 'VC_INIT' && e.ports[0]) {
            clearTimeout(timeout)
            _port = e.ports[0]
            _port.start()  // required when using addEventListener instead of onmessage
            window.removeEventListener('message', capturePort)
            resolve()
        }
    }
    window.addEventListener('message', capturePort)
})

// Signal to bridge.js that this module is ready to receive the port.
window.postMessage({ type: 'READER_READY' }, '*')

export default class HostAdapter {

    allowFontResizing = true
    allowDynamicThemeChange = true

    mainDocumentTitleSpanId = "CurrentDocumentTitleSpan"
    mainDocumentInfoButtonId = "CurrentDocumentInfoButton"
    currentDocumentCloseButtonId = "CurrentDocumentCloseButton"

    shouldBlockCrossOriginCommentsRequests = false
    isPromotionalButtonSupported = false

    
    constructor(){
        this.initReader()
    }


    initReader(){
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
                    g.favorites = msg.favorites != null ? msg.favorites : []
            }
        });


        window.addEventListener('initReader', async (e) => {
            const { url, contentString, useThinLinks, savedParsingRules } = e.detail;
            g.readingManager.flinkStyle = useThinLinks ? 'thin' : 'thick'

            const {dataObject,error} = await parseStaticContent(contentString,url, savedParsingRules)


            if(dataObject && !error){
                await loadUIAndIcons()
                await applyAllSavedSettings()
           
            }


            

            const container = document.body

            addListenersToContainer(container)
        
            if(!dataObject){
            setTimeout(() => {
                g.hostAdapter.reloadPage()
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



    }

    getAssetsUrl(){
        return null
    }

    async fetchWebPage(url, options = {}) {
        await _portReady

        return new Promise((resolve) => {
            const id = Math.random().toString(36).slice(2)

            function handleResponse(event) {
                const msg = event.data
                if (msg.type === "FETCH_RESULT" && msg.id === id) {
                    _port.removeEventListener("message", handleResponse)
                    resolve({text: msg.html, error: msg.isError ? msg.html : null})
                }
            }

            _port.addEventListener("message", handleResponse)
            _port.postMessage({ type: "FETCH_WEB_PAGE", url, id, isUserSpecifiedUrl: options.isUserSpecifiedUrl })
        })
    }


    executeAfterOptionalDelay(func,delay = 500){
        //delay is only needed in the plugin
        func()  
    }

    getSetting(key) {
        return new Promise((resolve) => {
        const id = Math.random().toString(36).slice(2)

        function handleResponse(event) {
            if (event.source !== window) return
            const msg = event.data
            if (msg.type === "LOCAL_STORAGE_RESULT" && msg.id === id) {
                window.removeEventListener("message", handleResponse)
                resolve(msg.value)
            }
        }

        window.addEventListener("message", handleResponse)
        window.postMessage({ type: "GET_OBJECT_FROM_LOCAL_STORAGE", objectName: key, id }, "*")
    })
    }

    saveSetting(key, value) {
        window.postMessage({ type: "SAVE_OBJECT_IN_LOCAL_STORAGE", objectName: key, object: value }, "*")
    }



    
    getCurrentThemeName() {
        return g.currentTheme
    }
    
    reloadPage(){
        window.postMessage({ type: "RELOAD_PAGE" }, "*");
    }


    getOpenCommentsInNewTabLabel(){
        return ''
    }
}
