/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { escapeXml, getBaseFromHtmlDoc, getBaseOuterXML, getXMlAndDataArrayFromJSONConnections, removeTitleFromContent, sanitizeHtml, showToastMessage, unescapeHTML } from "../helpers.js"
import { getXMLFromHeaderInfo } from "../HeaderMethods.js"


export function parseHtmlPageWithEmbeddedHDoc(httpPageUrl, contentString, hdocDataJSON) {
    const match = httpPageUrl.match(/(https?):\/\/(([^/]*)\/?.*?)$/i)
    if (!match) {
        showToastMessage('Parsing error')
        return null
    }


    const protocol = match[1]
    const domain = match[3]

 
    let additionalForbiddenTags = []

    
    const unsanitizedHtmlParser = new DOMParser();
    const unsanitizedHtmlDoc = unsanitizedHtmlParser.parseFromString(contentString, 'text/html');


    
    const panelsJSON = hdocDataJSON.panels

    let panelsString = ''
    if (panelsJSON) {
        let topPanelString = ''
        let sidePanelString = ''
        let bottomPanelString = ''

        
        const topPanelJSON = panelsJSON["top"]
        const sidePanelJSON = panelsJSON["side"]
        const bottomPanelJSON = panelsJSON["bottom"]
        
        
        if (topPanelJSON) {

            const siteNameJSON = topPanelJSON["site-name"]// ?? domain
            let siteName = domain
            let siteUrl = `${protocol}://${domain}`
            
            if (siteNameJSON) {
                if(siteNameJSON.text) siteName = siteNameJSON.text
                if(siteNameJSON.href) siteUrl = siteNameJSON.href
            }
            const siteLogo = topPanelJSON["site-logo"]
            
            let topLinksString = ''
            let topLinks = []
            const topLinksArrayFromJSON = topPanelJSON["links"]
            if (topLinksArrayFromJSON && Array.isArray(topLinksArrayFromJSON)) {
        
                topLinks = topLinksArrayFromJSON.filter(item => item.text && item.href).map(item => {
                    if (typeof item.text === "string" && item.text.trim() &&
                        typeof item.href === "string" && item.href.trim()) {
        
                        const href = item.href.trim()
                        return {href,text:item.text.trim()}
                    }
                })
                
            }
        

            let siteNameString = ''
            if (siteLogo && siteUrl) {
               siteNameString = `<logo src="${siteLogo}" href="${siteUrl}"/>` 
            } else if (siteName && siteUrl) {
                siteNameString = `<site-name href="${siteUrl}">${siteName}</site-name>`
            }
            
            topLinksString = topLinks.length ? '\n' + topLinks.map(({href,text}) => `<a href="${href}">${text}</a>`).join('\n') + '\n' : ''

            if (siteNameString || topLinksString) {
                topPanelString = `\n<top>${siteNameString}${topLinksString}</top>`    
            }

        }

        if (sidePanelJSON) {

            
            const isLeft = sidePanelJSON.left
            const ipage = sidePanelJSON.ipage
            
            const sideString = isLeft === 'true' ? ' left="true"' : ''
            const ipageString = ipage ? `\n<ipage>${ipage}</ipage>` : ''
            
            let commentsString = ''

            const comments = sidePanelJSON.comments
            if (comments) {
                const commentsUrl = comments.url
                const commentsTitle = comments.title
                const commentsEmptyMessage = comments.empty
                const leaveCommentUrl = comments['leave-comment-url']
                const replyLabel = comments['reply-label']
                const leaveLabel = comments['leave-comment-label']

                if (commentsUrl) {
                    commentsString = `\n<comments`
                        + (commentsTitle        ? ` title="${commentsTitle}"`                  : '')
                        + (commentsEmptyMessage ? ` empty="${commentsEmptyMessage}"`            : '')
                        + (leaveCommentUrl      ? ` leave-comment-url="${leaveCommentUrl}"`     : '')
                        + (replyLabel           ? ` reply-label="${replyLabel}"`                : '')
                        + (leaveLabel           ? ` leave-comment-label="${leaveLabel}"`        : '')
                        + `>${commentsUrl}</comments>`
                }

            }

            if (commentsString || ipageString) {
                sidePanelString = `<side${sideString}>${commentsString}${ipageString}\n</side>`  
            }
 
        }

        if (bottomPanelJSON) {

            const sections = bottomPanelJSON.sections
            const bottomMessage = bottomPanelJSON["bottom-message"]

            let bottomMessageString = bottomMessage ? `<bottom-message>${bottomMessage}</bottom-message>` : ''

            let sectionsString = ''

            if (sections && Array.isArray(sections) && sections.length) {
                sectionsString = sections.map(section => {
                    if (!section.links || !Array.isArray(section.links) || !section.links.length) return ''
                    
                    const linksString = section.links.map(link => {
                        if (!link.href || !link.text) return ''
                        if (typeof link.text === "string" && link.text.trim() &&
                            typeof link.href === "string" && link.href.trim()) {
                            const href = link.href.trim()
                            return `<a href="${href}">${link.text}</a>`
                        } else {
                            return ''
                        }
                    }).filter(item => !!item).join('\n')

                    if (linksString) {
                        return `<section${section.title ? ` title="${section.title}"` : ''}>\n${linksString}\n</section>`   
                    }
                    return ''
                }).filter(item => !!item).join('\n')

                
            }

            if (sectionsString || bottomMessageString) {
                bottomPanelString = `<bottom>${sectionsString}${bottomMessageString}</bottom>`   
            }
   
        }

        if (topPanelString || sidePanelString || bottomPanelString) {
            panelsString = `\n\n<panels>${topPanelString}${sidePanelString}${bottomPanelString}\n</panels>\n\n`     
        }
    }

    const headerInfo = {}


    const headerJSON = hdocDataJSON.header


    if (headerJSON) {
        const mainTitle = headerJSON.h1

        if (!mainTitle) {
            showToastMessage('Parsing error')
            return null
        }

        headerInfo.h1Text = unescapeHTML(mainTitle)

        const authorName = headerJSON["author"] ?? ''
        const publicationDate = headerJSON["date"] ?? ''

        if (authorName) {
            headerInfo.authorName = unescapeHTML(authorName)
        }

        if (publicationDate) {
            headerInfo.publicationDate = unescapeHTML(publicationDate)
        }
        
    }




    let {connectionsString, connectedDocsData} = getXMlAndDataArrayFromJSONConnections(hdocDataJSON)

    if(connectionsString)connectionsString = '\n\n' + connectionsString



    const removalSelectorsString = hdocDataJSON["removal-selectors"]
    if (removalSelectorsString && typeof removalSelectorsString === 'string') {
        additionalForbiddenTags = removalSelectorsString.split(',').map(item => item.trim())   
    }

    
    let contentHtml = sanitizeHtml(contentString, additionalForbiddenTags)


    const content = removeTitleFromContent(contentHtml,headerInfo.h1Text)


    let headerString = getXMLFromHeaderInfo(headerInfo)

    headerString = headerString ? `\n\n${headerString}\n\n` : '\n\n'


    const base = getBaseFromHtmlDoc(unsanitizedHtmlDoc)

    if (!connectionsString) connectionsString = '\n\n'
        
    const xmlString = `<hdoc>\n\n<metadata>\n<title>${escapeXml(document.title)}</title>\n${getBaseOuterXML(base)}</metadata>${panelsString}${headerString}<content>${content}</content>${connectionsString}</hdoc>`

    const dataObject = {html:content,headerInfo:headerInfo,base,xmlString,connectedDocsData,type:'text',docType:'h',url:httpPageUrl,docSubtype:2}

    return dataObject
}






export function getHdocJsonAndContentFromHtml(contentString) {
    const unsanitizedHtmlParser = new DOMParser();
    const unsanitizedHtmlDoc = unsanitizedHtmlParser.parseFromString(contentString, 'text/html');
    let hdocDataJSON = {}
    const dataScript = unsanitizedHtmlDoc.getElementById("hdoc-data");
    if (dataScript) {
        try {
            hdocDataJSON = JSON.parse(dataScript.textContent)  
        } catch (e) {
            console.error('JSON parse error',e)
        }
    }

    if (!hdocDataJSON) return false

    const headerJSON = hdocDataJSON.header

    if (!headerJSON)return false
    const mainTitle = headerJSON.h1

    if(!mainTitle || !mainTitle.trim())return false

    let contentEl = unsanitizedHtmlDoc.querySelector('.hdoc-content')

     
    if (!contentEl)return false


    return {hdocDataJSON, content:contentEl.innerHTML}
    

    
}