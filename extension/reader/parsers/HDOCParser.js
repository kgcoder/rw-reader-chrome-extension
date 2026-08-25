/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { getHeaderInfoFromXML } from "../HeaderMethods.js"
import { getFirstElementOfArray, sanitizeHtml, sanitizeUrl, stripHtmlTags } from "../helpers.js"
import FloatingLink from "../models/FloatingLink.js"

export function parseHDOC(url,fullContentString){

    const fallbackReg = new RegExp(/<fallback\b[^>]*>[\s\S]*?<\/fallback>/,'mig')
    fullContentString = fullContentString.replace(fallbackReg,'')



    let contentReg = /(<content(\b[^>]*)>)([\s\S]*)<\/content>/m
    let contentMatch = fullContentString.match(contentReg)
    
    if (!contentMatch) return

    let htmlString = contentMatch[3]
    let firstContentTag = contentMatch[1]

    const isPlainText = firstContentTag.includes('type="text"')

  
    const newXMLContentStringWithHtmlPlaceholder = fullContentString.replace(contentReg,'<content_placeholder></content_placeholder>')


    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(newXMLContentStringWithHtmlPlaceholder, 'application/xml');
    


    const sanitizedHtml = isPlainText ? htmlString : sanitizeHtml(htmlString)

    const rootElement = xmlDoc.documentElement;

    let headerInfo
    const headerRoot = getFirstElementOfArray(rootElement.getElementsByTagName('header'))

    if (headerRoot) { 
        headerInfo = getHeaderInfoFromXML(headerRoot)
    }
   
    

    
    
  const connectionsRoot = rootElement.querySelector('connections')

    
  const connectedDocsData = []
  if(connectionsRoot){
      
    const flinkSets = connectionsRoot.querySelectorAll('doc')
    

    if(flinkSets && flinkSets.length){
        for (let i = 0; i < flinkSets.length; i++) {
            const flinkSet = flinkSets[i];
            const flinkSetUrl = sanitizeUrl(flinkSet.getAttribute('url'))
            const flinkSetTitle = stripHtmlTags(flinkSet.getAttribute('title'))

            const flinksString = flinkSet.textContent

            const flinks = flinksString ? flinksString.split('\n').map(line => FloatingLink.fromExportString(line.trim())).filter(flink => !!flink) : []

            if(flinkSetUrl){
                connectedDocsData.push({url:flinkSetUrl,title:flinkSetTitle,flinks})
        
            }
        }
    }
      

  }






    return {
        url,
        headerInfo,
        isPlainText,
        html:sanitizedHtml,
        xmlString:fullContentString,
        connectedDocsData,
        type: 'text',
        docType:'h',
        docSubtype:1
    }
}