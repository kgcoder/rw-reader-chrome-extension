/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { sanitizeUrl, stripHtmlTags } from "../helpers.js";
import FloatingLink from "../models/FloatingLink.js";




export function parseCondoc(url, fullContentString) {

    const fallbackReg = new RegExp(/<fallback\b[^>]*>[\s\S]*?<\/fallback>/,'mig')
    fullContentString = fullContentString.replace(fallbackReg,'')

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fullContentString, 'application/xml');

    const rootElement = xmlDoc.documentElement;

    const mainUrlTag = rootElement.querySelector('main')
    const externalDocUrl = mainUrlTag ? sanitizeUrl(mainUrlTag.textContent) : ''
    if (!externalDocUrl) return

    const connectionsRoot = rootElement.querySelector('connections')

    const connectedDocsData = []
    if(connectionsRoot){

      
        const flinkSets = connectionsRoot.getElementsByTagName('doc')
        

        if(flinkSets && flinkSets.length){
            for (let i = 0; i < flinkSets.length; i++) {
                const flinkSet = flinkSets[i];
                const flinkSetUrl = sanitizeUrl(flinkSet.getAttribute('url'))
                const flinkSetTitle = stripHtmlTags(flinkSet.getAttribute('title'))

                const lines = flinkSet.textContent.split('\n').filter(line => !!line)

                const flinks = []
                for(const line of lines){
                    const flink = FloatingLink.fromExportString(line)
                    if (flink) {
                        flinks.push(flink) 
                    }
                }

                if(flinkSetUrl){
                    connectedDocsData.push({url:flinkSetUrl,title:flinkSetTitle, flinks})
            
                }
            }
        }
      

  }






    return {
        url,
        docType:'condoc',
        xmlString:fullContentString,
        connectedDocsData,
        docSubtype: 7,
        needsMainDocWithUrl:externalDocUrl
    }

}