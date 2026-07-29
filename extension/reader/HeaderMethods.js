/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { createHtmlWrapper, escapeXml, getFirstElementOfArray, removeAllChildren, stripHtmlTags } from "./helpers.js"


export function getHeaderInfoFromXML(frontRoot) {
    let headerInfo = null

    if (frontRoot) {

        headerInfo = {}


        const title = getFirstElementOfArray(frontRoot.getElementsByTagName('h1'))

        const authorName = getFirstElementOfArray(frontRoot.getElementsByTagName('author'))
        const publicationDate = getFirstElementOfArray(frontRoot.getElementsByTagName('date'))

        if(title)headerInfo.h1Text = stripHtmlTags(title.textContent)
        if (authorName) headerInfo.authorName = stripHtmlTags(authorName.textContent)
        if(publicationDate) headerInfo.publicationDate = stripHtmlTags(publicationDate.textContent)

    }

    return headerInfo
}

export function getXMLFromHeaderInfo(headerInfo) {
    if(!headerInfo)return ''
    const titleText = headerInfo.h1Text
    const authorName = headerInfo.authorName
    const publicationDate = headerInfo.publicationDate

     const headerArray = [
        titleText ? `<h1>${escapeXml(titleText)}</h1>` : '',
        authorName ? `<author>${escapeXml(authorName)}</author>` : '',
        publicationDate ? `<date>${escapeXml(publicationDate)}</date>` : ''
    ].filter(item => !!item)

    const headerXMLString = headerArray.length ? 
`<header>
${headerArray.join('\n')}
</header>` : ''

    return headerXMLString
}





export function getHeaderDivHtml(headerInfoDict) {

    if (headerInfoDict) {

        const headerDiv = document.createElement('div')
        headerDiv.className = "HeaderDiv"
        populateHeaderDiv(headerDiv, headerInfoDict)
        return headerDiv.innerHTML



    }
    return ''
}

export function populateHeaderDiv(headerDiv, headerInfoDict) {
    removeAllChildren(headerDiv)
    if (headerInfoDict) {
        if (headerInfoDict.h1Text) {
            const h1 = document.createElement('h1')
            h1.textContent = headerInfoDict.h1Text
            headerDiv.appendChild(h1)
    
        }

        const authorNameEl = createHtmlWrapper(headerInfoDict.authorName,'span')
        const publicationDateEl = createHtmlWrapper(headerInfoDict.publicationDate,'span')

        const array = [authorNameEl,publicationDateEl].filter(item => !!item)

        if (array.length) {
            const rowDiv = document.createElement('div')
            rowDiv.className = "RowInHeaderDiv"
            headerDiv.appendChild(rowDiv)
            for (const item of array) {
                rowDiv.appendChild(item)
            }
        }


    }
}