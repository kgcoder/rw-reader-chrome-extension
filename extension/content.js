/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/


let parsingConfig = ''
let currentLocation
let hasFlinks = false


let hasEmbeddedHDOC = false

let fetchMode = 'strict'


let isShowingReader = false
let isShowingParsingRulesConstructor = false
let isUnforcedEmbeddedHDOC = false
    
    
document.addEventListener('DOMContentLoaded', onLoad);


document.onkeydown = onKeyPress
//chrome.storage.local.clear()

async function onKeyPress(e) {
      if(e.key === ']' && e.ctrlKey){
        
        const result = await chrome.storage.local.get('parsingRulesObject')
        if(!result || !result.parsingRulesObject)return

        const rules = await getSavedParsingRulesForLocation(currentLocation)


        if(rules){
            await chrome.storage.local.set({useSavedParsingRules:true})
            window.location.reload()
        }else{
            alert('There are no saved parsing rules for this website')
        }
        

       
    }
    
}


async function getSavedParsingRulesForLocation(locationString){
    const match = locationString.match(/^https?:\/\/([^/]+)\/?.*?$/)
    if(match){
        const domain = match[1]
        const result = await chrome.storage.local.get('parsingRulesObject')
        if(!result || !result.parsingRulesObject)return null
        const rulesString = result.parsingRulesObject[domain]
        return rulesString
    }
    return null
}

async function onLoad() {
    
    currentLocation = window.location.toString()

    if (currentLocation.includes('#')) {
        currentLocation = currentLocation.split('#')[0]
    }



    const result = await chrome.storage.local.get('justReloaded')
    const justReloaded = !!result.justReloaded

    if (justReloaded) {
        chrome.storage.local.set({ justReloaded: false });
    } else {
        showReaderOverlay()
        
    }

}



chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if(message === 'giveMePageMetadata'){
        
        sendPageMetadata()

    }else{
        const messageName = message.messageName

        if(messageName === 'DownloadConnectedPage'){
            const url = message.url
            window.postMessage({ type: "DOWNLOAD_USER_SPECIFIED_PAGE", url },"*");
        }

        if (messageName === 'ToggleThickLinks') {
            const useThickLinks = message.enabled
            saveFlinksThickness(useThickLinks)
            window.postMessage({ type: "FLINK_THICKNESS_UPDATED", useThickLinks },"*");
        }

        if (messageName === 'SetFetchMode') {
            const mode = message.fetchMode
            saveFetchMode(mode)
            fetchMode = mode
            window.postMessage({ type: "UPDATE_FETCH_MODE_CONFIG", mode }, "*")
        }

        if (messageName === 'OpenInParsingRulesConstructor') {


            showParsingRulesConstructor()

        }

    
        

    }
    

    return true

})



async function sendPageMetadata() {

    const areLinksThick = await getLinkThicknessFromStorage()
    const storedFetchMode = await getFetchModeFromStorage()

    chrome.runtime.sendMessage({
        type: 'pageMetadata',
        payload: {
            areLinksThick,
            fetchMode: storedFetchMode,
            isShowingReader,
            isShowingParsingRulesConstructor,
            currentLocation,
            isUnforcedEmbeddedHDOC
        }
    })

}






async function getLinkThicknessFromStorage() {
    const result = await chrome.storage.local.get('thickLinks')
    const isThick = result.thickLinks ?? false
    return isThick
}

async function saveFlinksThickness(isThick) {
    chrome.storage.local.set({ thickLinks:isThick })
}


async function getFetchModeFromStorage() {
    const result = await chrome.storage.local.get('fetchMode')
    return result.fetchMode ?? 'strict'
}

async function saveFetchMode(mode) {
    chrome.storage.local.set({ fetchMode: mode })
}


function addDocumentHostnames(contentString, hdocDataJSON, isCondoc) {
    function tryAdd(urlStr) {
        if (!urlStr) return
        try { documentHostnames.add(new URL(urlStr.trim()).hostname) } catch {}
    }
    if (hdocDataJSON) {
        for (const con of (hdocDataJSON.connections ?? [])) tryAdd(con.url)
        tryAdd(hdocDataJSON?.panels?.side?.comments?.url)
        return
    }
    for (const m of contentString.matchAll(/<doc\s[^>]*url="([^"]+)"/gi)) tryAdd(m[1])
    const cm = contentString.match(/<comments[^>]*>([^<]+)<\/comments>/i)
    if (cm) tryAdd(cm[1])
    if (isCondoc) {
        const mm = contentString.match(/<main[^>]*>([^<]+)<\/main>/i)
        if (mm) tryAdd(mm[1])
    }
}





async function showReaderOverlay() {

    let isEmbeddedCdoc = false
    let isEmbeddedCondoc = false

    const useThickLinks = await getLinkThicknessFromStorage()
    fetchMode = await getFetchModeFromStorage()



    let theTitle
    let contentEl = document.querySelector('.hdoc-content')

    let hdocDataJSON
  
    if (contentEl) {

        const dataScript = document.getElementById("hdoc-data");

        if (dataScript) {
            try {
                const rawJSON = dataScript.textContent.trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]$/, '')

                hdocDataJSON = JSON.parse(rawJSON)

                isUnforcedEmbeddedHDOC = !hdocDataJSON.forced

                if(isUnforcedEmbeddedHDOC)return

                const header = hdocDataJSON.header
                if (header) {
                    const title = header.h1
                    if (title && title.trim()) {
                        theTitle = title
                    }
                }

                addDocumentHostnames(null, hdocDataJSON, false)

            } catch (e) {
                console.log(e)
            }
        }
    }

    let contentString
    let savedParsingRules
    let isOnePre = false
    if (!theTitle || !contentEl) {

        contentString = document.body.innerHTML
        contentString = fixSelfClosingTags(contentString)

        const pres = document.querySelectorAll('pre')
        if(pres && pres.length === 1){

            const pre = pres[0]
      
            contentString = unescapeHTML(pre.innerHTML)
            contentString = fixSelfClosingTags(contentString)

            isOnePre = true
        }
   
        const collageMatch = contentString.match(/<cdoc\b[^>]*>([\s\S]*?)<\/cdoc>/im)
        const textViewMatch = contentString.match(/<hdoc\b[^>]*>([\s\S]*?)<\/hdoc>/im)
        const condocMatch = contentString.match(/<condoc\b[^>]*>([\s\S]*?)<\/condoc>/im)

        if (textViewMatch) addDocumentHostnames(textViewMatch[0], null, false)
        if (collageMatch)  addDocumentHostnames(collageMatch[0],  null, false)
        if (condocMatch)   addDocumentHostnames(condocMatch[0],   null, true)

        try {
            const embeddedCdocScript = document.querySelector('#cdoc-source')
            const source = JSON.parse(embeddedCdocScript.textContent).source;
            if(source){
                isEmbeddedCdoc = true
                addDocumentHostnames(source, null, false)
                contentString = '<html><body>' + document.body.innerHTML + '</body></html>'
                contentString = fixSelfClosingTags(contentString)

            }
        } catch {
            //do nothing
        }

        try {
            const embeddedCondocScript = document.querySelector('#condoc-source')
            const source = JSON.parse(embeddedCondocScript.textContent).source;
            if(source){
                isEmbeddedCondoc = true
                addDocumentHostnames(source, null, true)
                contentString = '<html><body>' + document.body.innerHTML + '</body></html>'
                contentString = fixSelfClosingTags(contentString)

            }
        } catch {
            //do nothing
        }
    

        if (!textViewMatch && !collageMatch && !condocMatch && !isEmbeddedCdoc && !isEmbeddedCondoc) {
            const result = await chrome.storage.local.get('useSavedParsingRules')
            if(result.useSavedParsingRules){
                await chrome.storage.local.set({useSavedParsingRules:false})

                savedParsingRules = await getSavedParsingRulesForLocation(currentLocation)

                if(!isOnePre) {
                    contentString = document.documentElement.outerHTML
                    contentString = fixSelfClosingTags(contentString)

                }

            }

            if(!savedParsingRules) return
        }
        


    }
        
    if(!contentString){
        contentString = document.documentElement.outerHTML
        contentString = fixSelfClosingTags(contentString)

    }



    if(savedParsingRules && savedParsingRules !== 'text'){
        const selectors = getSelectorsFromConfigString(savedParsingRules)

        const showParsingError = () => {
            alert('Something is wrong with the parsing rules for this site')
        }
        
        if(!selectors || !selectors.contentSelector){
            showParsingError()
            return
        }
        const {contentSelector} = selectors
        if(!contentSelector){
            showParsingError()
            return
        }

        const contentEl = document.querySelector(contentSelector)
        if(!contentEl){
            showParsingError()
            return
        }

        

    }

    const res = await fetch(chrome.runtime.getURL("reader/reader.html"));
    const html = await res.text();
    


    document.documentElement.innerHTML = `
  <head><title>${document.title}</title></head>
  <body><div id="my-reader">Loading...</div></body>
`;
    for (const script of document.scripts) {
        script.remove();
    }

    document.write = () => {};
    


    document.body.innerHTML = html;

    document.body.removeAttribute("class");

    isShowingReader = true

    const script = document.createElement('script');
    script.type = "module";
    script.src = chrome.runtime.getURL('reader/readerStartUp.js');
    script.onload = () => {
        window.dispatchEvent(new CustomEvent('initReader', {detail:{ contentString, url:currentLocation, useThickLinks, savedParsingRules }}));
    };
    pendingPortSend = true
    document.body.appendChild(script);




    const viewportMeta = document.createElement('meta')
    viewportMeta.name = 'viewport'
    viewportMeta.content = 'width=device-width, initial-scale=1.0'
    document.head.appendChild(viewportMeta)

    const cssLink = document.createElement('link')
    cssLink.href = chrome.runtime.getURL('reader/reader.css')
    cssLink.rel = "stylesheet"
    document.head.appendChild(cssLink)

    const pageInfoCSSLink = document.createElement('link')
    pageInfoCSSLink.href = chrome.runtime.getURL('reader/PageInfo.css')
    pageInfoCSSLink.rel = "stylesheet"
    document.head.appendChild(pageInfoCSSLink)

    const exportPageCSSLink = document.createElement('link')
    exportPageCSSLink.href = chrome.runtime.getURL('reader/exportPage.css')
    exportPageCSSLink.rel = "stylesheet"
    document.head.appendChild(exportPageCSSLink)

    const lightThemeLink = document.createElement('link')
    lightThemeLink.href = chrome.runtime.getURL('reader/themes/light.css')
    lightThemeLink.rel = "stylesheet"
    document.head.appendChild(lightThemeLink)

    const darkThemeLink = document.createElement('link')
    darkThemeLink.href = chrome.runtime.getURL('reader/themes/dark.css')
    darkThemeLink.rel = "stylesheet"
    document.head.appendChild(darkThemeLink)

    const sepiaThemeLink = document.createElement('link')
    sepiaThemeLink.href = chrome.runtime.getURL('reader/themes/sepia.css')
    sepiaThemeLink.rel = "stylesheet"
    document.head.appendChild(sepiaThemeLink)

    const hdocStylesLink = document.createElement('link')
    hdocStylesLink.href = chrome.runtime.getURL('reader/hdocStyles.css')
    hdocStylesLink.rel = "stylesheet"
    document.head.appendChild(hdocStylesLink)
}


async function showParsingRulesConstructor(){

    const contentString = document.documentElement.outerHTML


    const res = await fetch(chrome.runtime.getURL("reader/prconstructor.html"));
    const html = await res.text();
    


    document.documentElement.innerHTML = `
  <head><title>${document.title}</title></head>
  <body><div id="my-reader">Loading...</div></body>
`;
    for (const script of document.scripts) {
    script.remove();
    }
    document.write = () => {};
    
    document.body.innerHTML = html;

    document.body.removeAttribute("class");

    isShowingParsingRulesConstructor = true

    const script = document.createElement('script');
    script.type = "module";
    script.src = chrome.runtime.getURL('reader/prConstructorStartUp.js');
    script.onload = () => {
        window.dispatchEvent(new CustomEvent('initParsingRulesConstructor', {detail:{ contentString, url:currentLocation }}));
    };
    document.body.appendChild(script);

    const cssLink = document.createElement('link')
    cssLink.href = chrome.runtime.getURL('reader/prconstructor.css')
    cssLink.rel = "stylesheet"
    document.head.appendChild(cssLink)

    const hdocStylesLink = document.createElement('link')
    hdocStylesLink.href = chrome.runtime.getURL('reader/hdocStyles.css')
    hdocStylesLink.rel = "stylesheet"
    document.head.appendChild(hdocStylesLink)
} 

function unescapeHTML(html) {
    return new DOMParser()
        .parseFromString('<!doctype html><body>' + html, 'text/html')
        .body.textContent;
}

//==========
//methods duplicated in the Reader
function getSelectorsFromConfigString(configString){
    const actions = getActionsFromConfigString(configString)

    if(!actions)return null

    let contentSelector
    let titleSelector

    let removalSelectors = []


    let authorNameSelector
    let publicationDateSelector


    actions.forEach(a => {
        if(a.action === 'c'){
            contentSelector = decodeURIComponent(a.text.trim())
        }
        if (a.action === 'r') {
            const tags = decodeURIComponent(a.text.trim()).split(',').map(tag => tag.trim()).filter(tag => !!tag)
            removalSelectors.push(...tags)
        }
        if (a.action === 't') {
            titleSelector = decodeURIComponent(a.text.trim())
        }

        if (a.action === 'a') {
            authorNameSelector = decodeURIComponent(a.text.trim()) 
        }

        if (a.action === 'd') {
            publicationDateSelector = decodeURIComponent(a.text)
        }

    })

    return {contentSelector,titleSelector,removalSelectors,authorNameSelector,publicationDateSelector}
        

}

function getActionsFromConfigString(configString){
    const actions = []
    const chunks = configString.split('/')
    if (chunks.length % 2 !== 0) {
       
        return false
    }

    while (chunks.length) {
        const actionName = chunks.shift()
        const actionText = chunks.shift()
        actions.push({ action: actionName.toLowerCase(), text: actionText})
    }
    

    const selector = actions.find(item => item.action === 'c')?.text
    
    if (!selector) {
       
        return false
    }


    return actions

}

function fixSelfClosingTags(str) {
    const selfClosingTags = ['mapping', 'search', 'comment']
    for (const tag of selfClosingTags) {
        str = str.replace(new RegExp(`<\\/${tag}>`, 'gi'), '')
        str = str.replace(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'), `<${tag}$1/>`)
    }
    return str
}