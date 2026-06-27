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
import { copyDataToClipboard, getProtocolAndDomainFromUrl, replaceMediaTagsWithLinksInDiv, sanitizeHtml, showToastMessage, escapeXml, escapeHTML } from "./helpers.js";
import IconsInfo from "./Icons.js";
import { getObjectFromLocalStorage, saveObjectInLocalStorage } from "./LocalStorageManager.js";
import { getSelectorsFromConfigString, parseHtmlStringWithConfig } from "./parsers/HtmlPageParser.js";
import { populateHeaderDiv } from "./HeaderMethods.js";

const kNoSavedRulesMessage = 'There are no saved parsing rules for this website'
let originalContentString
let originalUrl

let finalUrl

let possibleContentSelectors = []
let possibleTitleSelectors = []

let currentPossibleContentSelectorIndex = 0
let currentPossibleTitleSelectorIndex = 0
let savedParsingRules = ''

let initialCondocTitle = ''
let condocTitleWasShownOnce = false


// List of selectors to try in order
const selectors = [
    
    //Wikipedia
    '.mw-body-content',

    // WordPress
    '.entry-content',
    '.post-content',
    '.post-body',
    '.content-area',
    '.hentry',
    '.content',
    '.main-content',
    '.supercontentwrapper',

    // Semantic
    'main',
    'article',
    '[role="main"]',

    // Joomla
    '.item-page',
    '.contentpane',
    '.blog-featured',
    '.com-content-article__body',

    // Drupal
    '.node__content',
    '.field--name-body',
    '.article-content',

    // Ghost
    '.gh-content',
    '.post-content',

    // Medium
    '.section-content',
    '.pw-post-body',
    '.meteredContent',
    
    

    // General fallbacks
    '.content',
    '.main-content',
    '.page-content',
    '.post',
    '.story-content',
    '.article-body',
    '.text',
    '.entry',
    '.read__content',
    '.content-wrapper',
    

    'body'

    
];


const headerSelectors = [
        'h1',                        // plain h1
        'header h1',                 // h1 inside a <header>
        '.entry-title',               // common WP class
        '.post-title'                // another common one                  
];




window.addEventListener('initParsingRulesConstructor', async (e) => {

    console.log('initParsingRulesConstructor')
    const contentSelectorInput = document.getElementById("contentSelector")
    const titleSelectorInput = document.getElementById("titleSelector")
    const removeSelectorsTextarea = document.getElementById("removeSelectors")


    const parsingRulesInput = document.getElementById("parsingRulesInput")

    const applyChangesButton = document.getElementById("apply-changes-button")
    const applyParsingRulesFromOneFieldButton = document.getElementById("parsing-rules-apply-button")
    const saveParsingRulesButton = document.getElementById("save-parsing-rules-button")
    const applySavedParsingRulesButton = document.getElementById("apply-saved-parsing-rules-button")
    const deleteParsingRulesButton = document.getElementById("delete-parsing-rules-button")

    const savedParsingRulesSpan = document.getElementById("saved-parsing-rules-span")

    const allWebsitesParsingRulesButton = document.getElementById("parsing-rules-for-all-websites-button")

    const condocCreationButton = document.getElementById("create-condoc-button")
    

    const overlayDiv = document.getElementById("overlay")
    const allWebsitesPopup = document.getElementById("parsing-rules-list-popup")
    const allWebsitesTextArea = document.getElementById("parsing-rules-list-textarea")
    const allWebsitesCloseButton = document.getElementById("parsing-rules-list-close-button")
    const allWebsitesSaveButton = document.getElementById("parsing-rules-list-save-button")



    const condocPopup = document.getElementById("condoc-popup")
    const condocTitleInput = document.getElementById("condoc-title-input")
    const condocDefaultTitleButton = document.getElementById("condoc-default-title-button")
    const condocDescriptionInput = document.getElementById("condoc-description-input")

    const condocSourceCodeDiv = document.getElementById("condoc-source-code")

    const condocCloseButton = document.getElementById("condoc-close-button")
    const condocCopyButton = document.getElementById("condoc-copy-button")



    condocTitleInput.addEventListener('input',updateCondocSourceCode)
    condocDescriptionInput.addEventListener('input',updateCondocSourceCode)


    condocDefaultTitleButton.addEventListener('click',(e) => {
        e.preventDefault()
        condocTitleInput.value = initialCondocTitle
        updateCondocSourceCode()

    })
    condocCloseButton.addEventListener('click',(e) => {
        e.preventDefault()
        overlayDiv.style.display = 'none'
        condocPopup.style.display = 'none'
    })

    condocCopyButton.addEventListener('click',(e) => {
        e.preventDefault()

        const condocXml = condocSourceCodeDiv.innerText

        copyDataToClipboard(condocXml)

        showToastMessage('Source code was copied to clipboard') 
    })





    applySavedParsingRulesButton.style.display = 'none'
    deleteParsingRulesButton.style.display = 'none'


    const { url, contentString, } = e.detail;

    originalUrl = url.split('#')[0].replace(/\?$/,'')
    originalContentString = contentString


    const hostname = new URL(originalUrl).hostname



    savedParsingRules = await getParsingRulesForHostname(hostname)

    if(savedParsingRules){
        applySavedParsingRulesButton.style.display = 'flex'
        deleteParsingRulesButton.style.display = 'flex'
    }


    savedParsingRulesSpan.innerText = savedParsingRules ? savedParsingRules : kNoSavedRulesMessage







    loadUIAndIcons()

    const copyUrlButton = document.getElementById("copy-url-button")
    copyUrlButton.addEventListener('click',(e) => {
        e.preventDefault()
        copyDataToClipboard(finalUrl)
        showToastMessage('URL was copied to clipboard')  
    })


    allWebsitesParsingRulesButton.addEventListener('click', async (e) => {
        e.preventDefault()
        const array = await getListOfParsingRules()

        overlayDiv.style.display = 'flex'
        allWebsitesPopup.style.display = 'flex'

        allWebsitesTextArea.value = array.filter(item => !!item.trim()).join('\n')
    })

    condocCreationButton.addEventListener('click',(e) => {
        e.preventDefault()

        const titleEl = document.querySelector('div#pageHeader h1')
        const title = (titleEl ? titleEl.textContent : '').trim()
        initialCondocTitle = title

        if(!condocTitleInput.value.trim() && !condocTitleWasShownOnce){
            condocTitleInput.value = title
            condocTitleWasShownOnce = true
        }
        


        updateCondocSourceCode()
        
        overlayDiv.style.display = 'flex'
        condocPopup.style.display = 'flex'

    })


    allWebsitesCloseButton.addEventListener('click',() => {
        e.preventDefault()
        overlayDiv.style.display = 'none'
        allWebsitesPopup.style.display = 'none'
    })


    allWebsitesSaveButton.addEventListener('click',() => {
        e.preventDefault()

        const confirmed = confirm(`Parsing rules for all websites will be updated. If not careful you may loose some data. Are you sure you want to proceed?`)
        if (!confirmed)return


        const text = allWebsitesTextArea.value

        const lines = text.split('\n').filter(item => !!item.trim())
        const parsingRulesObject = {}

        for(const line of lines){
            const chunks = line.split(' ')
            if(chunks.length !== 2)continue
            const [key, value] = chunks

            parsingRulesObject[key] = value
        }


   
        saveObjectInLocalStorage('parsingRulesObject',parsingRulesObject)

        showToastMessage("Parsing rules are saved for all websites")
    })



    const result = guessParsingRules()

    if(result){

        const {contentSelectors,titleSelectors} = result 

        possibleContentSelectors = contentSelectors
        possibleTitleSelectors = titleSelectors

  
        const contenSelectorLabel = document.getElementById("content-selector-label")
        contenSelectorLabel.innerText = `Content selector (1/${possibleContentSelectors.length})`
        if(contentSelectors.length){
            contentSelectorInput.value = contentSelectors[0]

        }

        const titleSelectorLabel = document.getElementById("title-selector-label")
        titleSelectorLabel.innerText = `Title selector (1/${possibleTitleSelectors.length})`
        if(titleSelectors.length){
            titleSelectorInput.value = titleSelectors[0]

        }

        constructFullUrl()

        renderPage()

    }


    if(savedParsingRules){
        loadParsingRulesFromString(savedParsingRules)
    }



    const contentSelectorNextGuessButton = document.getElementById("content-next-guess-button")

    contentSelectorNextGuessButton.addEventListener('click',(e) => {
        e.preventDefault()

        currentPossibleContentSelectorIndex++
        if(currentPossibleContentSelectorIndex >= possibleContentSelectors.length){
            currentPossibleContentSelectorIndex = 0
        }

        const contentSelectorLabel = document.getElementById("content-selector-label")
        contentSelectorLabel.innerText = `Content selector (${currentPossibleContentSelectorIndex + 1}/${possibleContentSelectors.length})`


        const contentSelectorInput = document.getElementById("contentSelector")
        contentSelectorInput.value = possibleContentSelectors[currentPossibleContentSelectorIndex]


        constructFullUrl()

        renderPage()


        
    })


    const titleSelectorNextGuessButton = document.getElementById("title-next-guess-button")

    titleSelectorNextGuessButton.addEventListener('click',(e) => {
        e.preventDefault()

        currentPossibleTitleSelectorIndex++
        if(currentPossibleTitleSelectorIndex >= possibleTitleSelectors.length){
            currentPossibleTitleSelectorIndex = 0
        }

        const titleSelectorLabel = document.getElementById("title-selector-label")
        titleSelectorLabel.innerText = `Title selector (${currentPossibleTitleSelectorIndex + 1}/${possibleTitleSelectors.length})`


        const titleSelectorInput = document.getElementById("titleSelector")
        titleSelectorInput.value = possibleTitleSelectors[currentPossibleTitleSelectorIndex]

        constructFullUrl()
        renderPage()
    })


    applyChangesButton.addEventListener('click',(e) => {
        e.preventDefault()

        constructFullUrl()
        renderPage()
    })

    applyParsingRulesFromOneFieldButton.addEventListener('click',(e) => {
        e.preventDefault()

        const prString = parsingRulesInput.value.trim()

       loadParsingRulesFromString(prString)

    })

    saveParsingRulesButton.addEventListener('click',async(e) => {
        e.preventDefault()
        const hostname = new URL(finalUrl).hostname

        const [_,prString] = finalUrl.split('#pr=')

        await saveParsingRulesForHostname(hostname,prString)

        showToastMessage('Parsing rules are saved for this website')


        if(prString){
            applySavedParsingRulesButton.style.display = 'flex'
            deleteParsingRulesButton.style.display = 'flex'
        }


        savedParsingRulesSpan.innerText = prString ?? kNoSavedRulesMessage





     
    })
    applySavedParsingRulesButton.addEventListener('click',async (e) => {
        e.preventDefault()

        const hostname = new URL(finalUrl).hostname

        const prString = await getParsingRulesForHostname(hostname)

        loadParsingRulesFromString(prString)





     
    })
    deleteParsingRulesButton.addEventListener('click',async(e) => {
        e.preventDefault()

        const confirmed = confirm(`Are you sure you want to delete parsing rules for this website?`)
        if (!confirmed)return

        const hostname = new URL(finalUrl).hostname

        await saveParsingRulesForHostname(hostname,'')

        savedParsingRulesSpan.innerText = kNoSavedRulesMessage

        showToastMessage("Parsing rules were deleted for website " + hostname)



     
    })

 

});





function updateCondocSourceCode(){
    const condocTitleInput = document.getElementById("condoc-title-input")
    const condocDefaultTitleButton = document.getElementById("condoc-default-title-button")

    const condocDescriptionInput = document.getElementById("condoc-description-input")

    const condocSourceCodeDiv = document.getElementById("condoc-source-code")



    const titleXml = condocTitleInput.value.trim() ? `\n\n<title>${escapeXml(condocTitleInput.value.trim())}</title>` : ''

    const desctiptionXml = condocDescriptionInput.value.trim() ? `\n\n<description>${escapeXml(condocDescriptionInput.value.trim())}</description>` : ''


    const xmlString = `<condoc>${titleXml}${desctiptionXml}\n\n<main>${escapeXml(finalUrl)}</main>\n\n</condoc>`

    condocSourceCodeDiv.innerText = xmlString


    condocDefaultTitleButton.style.display = condocTitleInput.value.trim() === initialCondocTitle.trim() ? 'none' : 'flex'

}



function loadParsingRulesFromString(prString){
    if(!prString)return


    const contentSelectorInput = document.getElementById("contentSelector")
    const titleSelectorInput = document.getElementById("titleSelector")
    const removeSelectorsTextarea = document.getElementById("removeSelectors")

    const authorSelectorInput = document.getElementById("authorSelector")
    const dateSelectorInput = document.getElementById("dateSelector")


    const selectors = getSelectorsFromConfigString(prString)


    if(!selectors){
        showToastMessage('Somtething is wrong with parsing rules')
        return
    }

    const {contentSelector,titleSelector,removalSelectors,authorNameSelector,publicationDateSelector} = selectors


    contentSelectorInput.value = contentSelector ?? ''
    titleSelectorInput.value = titleSelector ?? ''
    removeSelectorsTextarea.value = removalSelectors.join('\n')
    authorSelectorInput.value = authorNameSelector ?? ''
    dateSelectorInput.value = publicationDateSelector ?? ''


    constructFullUrl()
    renderPage()

}


function loadUIAndIcons() {
  
    g.iconsInfo = new IconsInfo()

    g.iconsInfo.loadAllIcons()




}


function constructFullUrl(){
    const contentSelectorInput = document.getElementById("contentSelector")
    const titleSelectorInput = document.getElementById("titleSelector")
    const removeSelectorsTextarea = document.getElementById("removeSelectors")
    const authorSelectorInput = document.getElementById("authorSelector")
    const dateSelectorInput = document.getElementById("dateSelector")


    const contentSelector = contentSelectorInput.value
    const titleSelector = titleSelectorInput.value
    const authorSelector = authorSelectorInput.value
    const dateSelector = dateSelectorInput.value

    const removalSelectors = removeSelectorsTextarea.value.split('\n').filter(sel => !!sel.trim())


    let titleURLPart = ''
    if (titleSelector !== 'h1' && titleSelector.trim().length) {
        titleURLPart = `/t/${encodeURIComponent(titleSelector.trim())}`
    }


    let authorUrlPart = ''
    if(authorSelector.trim()){
        authorUrlPart = `/a/${encodeURIComponent(authorSelector.trim())}`
    }
   
    let dateUrlPart = ''
    if(dateSelector.trim()){
        dateUrlPart = `/d/${encodeURIComponent(dateSelector.trim())}`
    }



    
    let removedTagsURLPart = ''



    if (removalSelectors.length) {
        removedTagsURLPart = `/r/${removalSelectors.map(item=>encodeURIComponent(item)).join(',')}`
    }

    finalUrl = `${originalUrl}#pr=c/${encodeURIComponent(contentSelector)}${titleURLPart}${removedTagsURLPart}${dateUrlPart}${authorUrlPart}`

    const fullUrlSpan = document.getElementById("full-url-span")
    fullUrlSpan.innerText = finalUrl




}

function guessParsingRules(){
    const match = originalUrl.match(/^(?<protocol>https?):\/\/(?<domain>[^/]+)\/?(?<rest>.*?)$/)

    if (!match) return null




 




    const sanitizedHtml = sanitizeHtml(originalContentString)


    const htmlParser = new DOMParser();
    const htmlDoc = htmlParser.parseFromString(sanitizedHtml, 'text/html');


    let contentEl = null;

    // Try each selector until one matches
    let selectorsThatWorked = []
    for (const sel of selectors) {
        contentEl = htmlDoc.querySelector(sel);
        if (contentEl) {
            selectorsThatWorked.push(sel)
        }
    }


    if (!contentEl) return;



    // Try multiple possible selectors for the page/post title
  

    let headerEl = null;

    const titleSelectorsThatWorked = []
    for (const sel of headerSelectors) {
        headerEl = htmlDoc.querySelector(sel);
        if (headerEl) {
            titleSelectorsThatWorked.push(sel)
        }
    }


    return {isText:false,contentSelectors:selectorsThatWorked,titleSelectors:titleSelectorsThatWorked}


}



function renderPage(){

    const [cleanUrl, configString] = finalUrl.split('#pr=')

    const urlInfo = getProtocolAndDomainFromUrl(cleanUrl)
    if(!urlInfo){
        showBlankPage()
        showToastMessage('Parsing error')
        return
    }


    const {protocol, domain} = urlInfo


    const dataObject = parseHtmlStringWithConfig(originalContentString,configString,cleanUrl,protocol,domain)

    if(!dataObject){
        showBlankPage()
        return
    }


    const pageDiv = document.getElementById("pageDiv")
   
    pageDiv.innerHTML = dataObject.html
    

    const headerDiv = document.getElementById("pageHeader")
    populateHeaderDiv(headerDiv,dataObject.headerInfo)
    
  
    pageDiv.style.wordWrap = ''
    pageDiv.style.whiteSpace = ''
    



    replaceMediaTagsWithLinksInDiv(pageDiv,'audio')
    replaceMediaTagsWithLinksInDiv(pageDiv,'video')

}



function showBlankPage(){
    const headerDiv = document.getElementById("pageHeader")
    headerDiv.innerHTML = ''
    const pageDiv = document.getElementById("pageDiv")
    pageDiv.innerHTML = ''

}


async function getListOfParsingRules() {
    const {value:result} = await getObjectFromLocalStorage('parsingRulesObject')
    const parsingRulesObject = result ?? {}

    const array = Object.entries(parsingRulesObject)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key} ${value}`);


    return array  
}


async function getParsingRulesForHostname(hostname) {
    const {value:result} = await getObjectFromLocalStorage('parsingRulesObject')
    const parsingRulesObject = result ?? {}
    return parsingRulesObject[hostname] ?? ''
}


async function saveParsingRulesForHostname(hostname, prString) {
    const {value:result} = await getObjectFromLocalStorage('parsingRulesObject')

    const parsingRulesObject = result ?? {}
   
    if (!prString) {
        delete parsingRulesObject[hostname]
    } else {
        parsingRulesObject[hostname] = prString
    }
    
    saveObjectInLocalStorage('parsingRulesObject',parsingRulesObject)

}


