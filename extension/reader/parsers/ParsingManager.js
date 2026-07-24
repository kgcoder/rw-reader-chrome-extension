/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { showToastMessage } from "../helpers.js";
import { fetchWebPage } from "../NetworkManager.js";
import { parseCDOC } from "./CDOCParser.js";
import { parseCondoc } from "./CondocParser.js";
import { getHdocJsonAndContentFromHtml, parseHtmlPageWithEmbeddedHDoc } from "./EmbHDOCParser.js";
import { parseHDOC } from "./HDOCParser.js";
import { parseHtmlPage } from "./HtmlPageParser.js";
import { parsePlainTextPage } from "./PlainTextParser.js";



export async function loadStaticContentFromUrl(originalUrl, isUserSpecifiedUrl = false, muteErrorMessage = false){


    const urlToCall = originalUrl.split('#')[0].replace(/\?$/,'')
    


    const result = await fetchWebPage(urlToCall, isUserSpecifiedUrl)

    if (!result) {
        if (!muteErrorMessage) {
            showToastMessage('Something went wrong')
        }
        return null
    }

    const {text,error} = result


    if(error){
       
        if (!muteErrorMessage) {
            showToastMessage(error)    
        }
        
        return
    }








    const {dataObject,error:parsingErrorMessage} = await parseStaticContent(text,originalUrl)
    


    if(dataObject){
        if(dataObject.type === 'text'){
            const {html,xmlString,connectedDocsData} = dataObject
    
            if(html.includes('<parsererror')){
                showToastMessage('Error while parsing HTML')
                return
            }
    
            if(xmlString.includes('<parsererror')){
                showToastMessage('Error while parsing XML')
                return
            }
    
            if(connectedDocsData.includes('<parsererror')){
                showToastMessage('Error while parsing connected documents data')
                return
            }
    
        }

        if(dataObject.docSubtype === 7 && !dataObject.needsMainDocWithUrl){
            showToastMessage('Something is wrong with the URL of the main document in this CONDOC')
            return
        }

        return dataObject //if HDOC, Embedded HDOC, CDOC, or CONDOC then ignore parsing rules
      
    }


    const configMatch = originalUrl.match(/^([^#]+)#pr=(.*?)$/)

    if (configMatch) {

        //const allowedKeys = ['c','t','r','a','d']

        const cleanUrl = configMatch[1]
        
        let configString = configMatch[2]

  
        if (configString === 'text') {
            const dataObject = await parsePlainTextPage(text, cleanUrl)
            if (dataObject) return dataObject
            return
        }


    

    
        const dataObject = await parseHtmlPage(text,configString,cleanUrl)
         
        if (dataObject) return dataObject
        return

    }else{
        showToastMessage(parsingErrorMessage)
    
    }

 


    

    return null
    


}


export async function parseStaticContent(contentString, originalUrl, savedParsingRules) {
    const condocMatch = contentString.match(/<condoc\b[^>]*>([\s\S]*?)<\/condoc>/im)
    const collageMatch = contentString.match(/<cdoc\b[^>]*>([\s\S]*?)<\/cdoc>/im)
    const hdocMatch = contentString.match(/<hdoc\b[^>]*>([\s\S]*?)<\/hdoc>/im)

    const htmlMatch = contentString.match(/<html\b[^>]*>([\s\S]*?)<\/html>/im)

    if (condocMatch) {
        contentString = condocMatch[0]
        const dataObject = parseCondoc(originalUrl, contentString)
        return {dataObject, error:!dataObject ? 'Something is wrong with the CONDOC' : null}
    }else if  (!collageMatch && hdocMatch) {
        contentString = hdocMatch[0]
        const dataObject = parseHDOC(originalUrl, hdocMatch[0])
        return {dataObject, error:!dataObject ? 'Something is wrong with the HDOC' : null}
    } else if (collageMatch && !hdocMatch) {
        contentString = collageMatch[0]
        const dataObject =  await parseCDOC(originalUrl, collageMatch[0])
        return {dataObject, error:!dataObject ? 'Something is wrong with the CDOC' : null}
    } else if (htmlMatch) {
        
        const dataFromEmbeddedHDOC = getHdocJsonAndContentFromHtml(contentString)
        if (dataFromEmbeddedHDOC) {
            const {hdocDataJSON,content} = dataFromEmbeddedHDOC
            const dataObject = parseHtmlPageWithEmbeddedHDoc(originalUrl, content, hdocDataJSON)  
            return {dataObject, error:!dataObject ? 'Something is wrong with the embedded HDOC' : null}          
        }


        const unsanitizedHtmlParser = new DOMParser();
        const unsanitizedHtmlDoc = unsanitizedHtmlParser.parseFromString(contentString, 'text/html');
        
        try {
    
            const embeddedCdocScript = unsanitizedHtmlDoc.querySelector('#cdoc-source')
            const cdocSource = JSON.parse(embeddedCdocScript.textContent).source;
            if(cdocSource){
                const dataObject =  await parseCDOC(originalUrl, cdocSource)
                if(dataObject)dataObject.docSubtype = 8
                return {dataObject, error:!dataObject ? 'Something is wrong with the embedded CDOC' : null}          
            }

        } catch {
            //do nothing
        }

        try{
            const embeddedCondocScript = unsanitizedHtmlDoc.querySelector('#condoc-source')
            const condocSource = JSON.parse(embeddedCondocScript.textContent).source;
            if(condocSource){
                const dataObject =  await parseCondoc(originalUrl, condocSource)
                if(dataObject)dataObject.docSubtype = 9
                return {dataObject, error:!dataObject ? 'Something is wrong with the embedded CONDOC' : null}          
            }
        } catch {
            //do nothing
        }



        if(savedParsingRules){

            const cleanUrl = originalUrl.split('#')[0]
            
            let configString = savedParsingRules
    
            const dataObject = await parseHtmlPage(contentString,configString,cleanUrl)
            return {dataObject,error:!dataObject ? 'Something is wrong with the saved parsing rules' : null}
        }



        return {dataObject:null,error:'Wrong document format'}

    }else if(savedParsingRules === 'text'){
        const cleanUrl = originalUrl.split('#')[0]
        const dataObject = await parsePlainTextPage(contentString, cleanUrl)
        return {dataObject,error:!dataObject ? 'Something is wrong with the saved parsing rules' : null}
    }else if(!collageMatch && !hdocMatch) {
        return {dataObject:null,error:'Wrong document format'}
    }   

    return {dataObject:null,error:'Something is wrong'}
}