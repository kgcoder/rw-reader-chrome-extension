/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { getXMLFromHeaderInfo } from "../HeaderMethods.js"
import { escapeXml, getBaseFromHtmlDoc, getBaseOuterXML, getH1TitleFromDoc, getProtocolAndDomainFromUrl, removeTitleFromContent, sanitizeHtml, showToastMessage, stripHtmlTags } from "../helpers.js"

export function getSelectorsFromConfigString(configString){
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

export function getActionsFromConfigString(configString){
    const actions = []
    const chunks = configString.split('/')
    if (chunks.length % 2 !== 0) {
        showToastMessage('Something is wrong with the parsing config of the URL')
        return false
    }

    while (chunks.length) {
        const actionName = chunks.shift()
        const actionText = chunks.shift()
        actions.push({ action: actionName.toLowerCase(), text: actionText})
    }
    

    const selector = actions.find(item => item.action === 'c')?.text
    
    if (!selector) {
        showToastMessage('Something is wrong with the parsing config of the URL')
        return false
    }


    return actions

}




export async function parseHtmlPage(htmlString,configString,cleanUrl) {
   
    const urlInfo = getProtocolAndDomainFromUrl(cleanUrl)
    if(!urlInfo){
        showToastMessage('Parsing error')
        return null
    }

    const {protocol, domain} = urlInfo
    
    return parseHtmlStringWithConfig(htmlString,configString,cleanUrl,protocol,domain)
   
}



export function parseHtmlStringWithConfig(htmlString,configString,cleanUrl,protocol,domain){


    let authorName
    let publicationDate


    const unsanitizedHtmlParser = new DOMParser();
    const unsanitizedHtmlDoc = unsanitizedHtmlParser.parseFromString(htmlString, 'text/html');






    const selectors = getSelectorsFromConfigString(configString)

    if(!selectors || !selectors.contentSelector){
        showToastMessage('Something is wrong with parsing rules (#pr=...) for this page')
        return null
    }
    const {contentSelector,titleSelector,removalSelectors,authorNameSelector,publicationDateSelector} = selectors


    if(authorNameSelector){
        try{
            const authorEl = unsanitizedHtmlDoc.querySelector(decodeURIComponent(authorNameSelector));
            if(authorEl)authorName = authorEl.textContent
        }catch(e){
            //invalid selector
        }
    }

    if(publicationDateSelector){
        try{
            const dateEl = unsanitizedHtmlDoc.querySelector(decodeURIComponent(publicationDateSelector));
            if (dateEl) publicationDate = dateEl.textContent
        }catch(e){
            //invalid selector
        }
    }



  
    
  
  
    let contentEl
    try{

        contentEl = unsanitizedHtmlDoc.querySelector(decodeURIComponent(contentSelector));
        
        if (!contentEl) {
            showToastMessage('Parsing error')
            return null
        }

    }catch(e){
        showToastMessage('Something is wrong with parsing rules (#pr=...) for this page')
        return null
    }

    
    let contentHtml = sanitizeHtml(contentEl.innerHTML, removalSelectors)

    const titleText = getH1TitleFromDoc(unsanitizedHtmlDoc, titleSelector) 
    

    const pageTitleFromHead = unsanitizedHtmlDoc.title ?? ''


    const content = removeTitleFromContent(contentHtml,titleText)

    const headerInfo = { h1Text: titleText }
    
    if (authorName) {
        headerInfo.authorName = authorName
    }

    if (publicationDate) {
        headerInfo.publicationDate = publicationDate
    }


    let headerString = getXMLFromHeaderInfo(headerInfo)

    headerString = headerString ? `\n\n${headerString}\n\n` : '\n\n'
        
    const base = getBaseFromHtmlDoc(unsanitizedHtmlDoc)

    
    const xmlString = `<hdoc>\n\n<metadata>\n<title>${escapeXml(pageTitleFromHead)}</title>\n${getBaseOuterXML(base)}</metadata>\n\n<panels>\n<top>\n<site-name href="${protocol}://${domain}">${domain}</site-name>\n</top>\n</panels>${headerString}<content>${content}</content>\n\n</hdoc>`

    if (headerInfo.h1Text) headerInfo.h1Text = stripHtmlTags(headerInfo.h1Text)
    if (headerInfo.authorName) headerInfo.authorName = stripHtmlTags(headerInfo.authorName)
    if (headerInfo.publicationDate) headerInfo.publicationDate = stripHtmlTags(headerInfo.publicationDate)


    const dataObject = {html:content,headerInfo,base,xmlString,connectedDocsData:[],type:'text',url:`${cleanUrl}#pr=${configString}`,docSubtype:3,docType:'h'}

    return dataObject
}