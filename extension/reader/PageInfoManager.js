/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { createOneIconComponent, createOneSVGIconComponent, formatFileSize, getBoundingRectForGenericElement, getDataFromCondocXML, isoToHumanReadableDate, unescapeHTML } from "./helpers.js"
import g from './Globals.js'


class PageInfoManager {


    renderData = async () => {
        const infoDiv = document.getElementById("CurrentDocumentInfo")

        while (infoDiv.firstChild) {
            infoDiv.removeChild(infoDiv.firstChild)
        }


        const remoteUrl = g.readingManager.mainDocData.url
        const size = g.readingManager.mainDocData.xmlString.length

        const connections = g.readingManager.mainDocData.connectedDocsData
        
        const isCondoc = g.readingManager.mainDocData.docSubtype === 7 || g.readingManager.mainDocData.docSubtype === 8

        const isEmbeddedDocDownloaded = !!g.readingManager.embeddedDocData

        this.addTitle(infoDiv, isCondoc ? 'CONDOC info' : 'Page info', 0)
        
        let embeddedDocUrl = ''

        if (isCondoc) {
            const {mainPageUrl, condocTitle, condocDescription} = getDataFromCondocXML(g.readingManager.mainDocData.xmlString)

            embeddedDocUrl = mainPageUrl
            
            if (condocTitle) {
                this.addLink(infoDiv,'Title',condocTitle, true)
            }

            if (condocDescription) {
                this.addLink(infoDiv,'Description',condocDescription, true)
            }

        }


        if (remoteUrl) {
            this.addLink(infoDiv, 'Page URL', remoteUrl, true)
        }
        if (size) {
            this.addLink(infoDiv, 'Size', formatFileSize(size), true)
        }

        if (isCondoc) {
            this.addTitle(infoDiv, 'Embedded page info', 30)

            this.addLink(infoDiv,'Embedded page URL',embeddedDocUrl, isEmbeddedDocDownloaded ? true : false, true)

            if (isEmbeddedDocDownloaded) {
                this.addLink(infoDiv,'Size',formatFileSize(g.readingManager.embeddedDocData.xmlString.length),true) 
            }

         }

         if(connections){
            const originalConnections = connections.filter(con => !!con.isOriginal)
            if (originalConnections.length) {
            
                this.addTitle(infoDiv, 'Connected documents', 30)
          
                for (const desiredConnection of originalConnections) {
                    
                    desiredConnection.title = unescapeHTML(desiredConnection.title)
    
                    this.addLink(infoDiv, desiredConnection.title, desiredConnection.url)
                }
    
            }
         }




    }

    addTitle(parentDiv, title, marginTop) {
        const titleDiv = document.createElement('div')
        titleDiv.className = "InfoTitle"
        titleDiv.style.marginTop = marginTop + 'px'
        titleDiv.innerText = title
        parentDiv.appendChild(titleDiv)
    }

    addLink = (parentDiv, title, url, hideDownloadButton = false, isMainDocLink = false) => {
        
        const containerDiv = document.createElement('div')
        containerDiv.className = "InfoLinkContianer"
        const titleDiv = document.createElement('div')
        titleDiv.className = "InfoLinkTitle"
        titleDiv.innerText = title
        containerDiv.appendChild(titleDiv)

        const rowDiv = document.createElement('div')
        rowDiv.className = "InfoLinkRowDiv"
        containerDiv.appendChild(rowDiv)

        const urlDiv = document.createElement('div')
        urlDiv.className = "InfoLinkUrlDiv"
        urlDiv.innerText = url
        rowDiv.appendChild(urlDiv)

     

        if (!hideDownloadButton) {
            const downloadButtonDiv = document.createElement('div')
            downloadButtonDiv.className = "InfoLinkDownloadButtonDiv"
            rowDiv.appendChild(downloadButtonDiv)
            const iconDiv = createOneSVGIconComponent(rowDiv, g.iconsInfo.svgIcons.downloadButton, '', 'PageInfo-OneIconComponent')
            const that = this
            iconDiv.addEventListener('click', async function () {
                
                if (isMainDocLink && !g.readingManager.embeddedDocData) {
                    g.pdm.downloadMainDocInCondoc(url, 
                        that.renderData
                        //iconDiv.style.display = 'none'
                    )
                } else {
                    const existingNoteDataIndex = g.readingManager.getNoteIndexByUrl(url)
    
                    if (existingNoteDataIndex !== -1) {
                        g.pdm.showTab(existingNoteDataIndex,false)
                        g.readingManager.redrawFlinks()
                        
                    } else {
                        
                        g.readingManager.downloadOnePage(url)
                        
                    }
                    
                }


            })
        }

        parentDiv.appendChild(containerDiv)
    }



}


export default PageInfoManager