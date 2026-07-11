/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { getXMLFromHeaderInfo } from "../HeaderMethods.js"
import { escapeXml, getProtocolAndDomainFromUrl, showToastMessage, stripHtmlTags } from "../helpers.js"

export async function parsePlainTextPage(content,cleanUrl) {
  

    const urlInfo = getProtocolAndDomainFromUrl(cleanUrl)
        if(!urlInfo){
            showToastMessage('Parsing error')
            return null
        }
    
    const {protocol, domain} = urlInfo
    

    let headerInfo = {}


    const titleMatch = content.match(/^Title: (.*?)$/im)
    if (titleMatch) {
        headerInfo.h1Text = titleMatch[1]
    }


    const finalUrl = `${cleanUrl}#pr=text`


    let headerString = getXMLFromHeaderInfo(headerInfo)

    headerString = headerString ? `\n\n${headerString}\n\n` : '\n\n'

    
    const xmlString = `<hdoc>\n\n<metadata>\n<title>${escapeXml(headerInfo.h1Text != null ? headerInfo.h1Text : '')}</title>\n</metadata>\n\n<panels>\n<top>\n<site-name href="${protocol}://${domain}">${domain}</site-name>\n</top>\n</panels>${headerString}<content type="text">${content}</content>\n\n</hdoc>`

    if (headerInfo.h1Text) headerInfo.h1Text = stripHtmlTags(headerInfo.h1Text)

    const dataObject = {html:content,headerInfo,xmlString,connectedDocsData:[],type:'text',url:finalUrl,docSubtype:3,docType:'h',isPlainText:true}

    return dataObject
    
   
}


