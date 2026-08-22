/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from "./Globals.js"
import { getHeaderInfoFromXML, populateHeaderDiv } from "./HeaderMethods.js"
import { absolutizeUrls, applyMediaMappings, escapeHTML, getHeaderDivFrom, getPresentationDivFrom, getTextColumnWidth, parseCopyInfoFromElement, replaceMediaTagsWithLinksInDiv, sanitizeHtml, sanitizeUrl, scrollToIdInContainer, stickBottomLineRectToTheTopOne, stripHtmlTags } from "./helpers.js"
import { kDefaultFontSize, kMiddleGap, kMinDocWidthForDesktop } from "./PopupDocumentManager.js"



class NoteDivsManager{

    isLoadingMore = false


    populateDivWithTextFromDoc(div, xmlString, url = '', isRight = false) {
        let title = ''
        let base = ''
    //   let markdown = ''
        let html = ''
        let connectedDocUrls = []

        let isEditable = false
        let panels = null
        let headerInfo = null
       

        const result = this.getNoteTextFromSource(xmlString, url)

        if(!result)return null
        const {headerInfo:headerInfoFromFile, html: htmlFromFile, isHtml, panels: panelsData, title: titleFromFile,base:baseFromFile, flinksetUrls, isPlainText, lang, copyInfo } = result
        connectedDocUrls = flinksetUrls

    

    
        
    if (headerInfoFromFile) {
        title = headerInfoFromFile.h1Text || ''

    }
        base = baseFromFile
       // markdown = md
        html = isPlainText ? htmlFromFile : sanitizeHtml(htmlFromFile)
        isEditable = !isHtml
        panels = panelsData
        headerInfo = headerInfoFromFile
        

        const headerDiv = getHeaderDivFrom(div)
        headerDiv.className = "HeaderDiv"
        populateHeaderDiv(headerDiv,headerInfo)

       
        const notePresentationDiv = getPresentationDivFrom(div)
        if (url && !isPlainText) {
            html = absolutizeUrls(html,base,url)  
        }
        notePresentationDiv.innerHTML = isPlainText ? escapeHTML(html) : html


        if (isPlainText) {
            notePresentationDiv.style.wordWrap = 'break-word'
            notePresentationDiv.style.whiteSpace = 'pre-wrap' 
        } else {
            notePresentationDiv.style.wordWrap = ''
            notePresentationDiv.style.whiteSpace = ''
        }
      
      
        if (copyInfo && copyInfo.mediaMappings) {
            applyMediaMappings(notePresentationDiv, copyInfo.mediaMappings)
        }


     



        const images = notePresentationDiv.getElementsByTagName('img')


        const screenWidth = window.innerWidth

        let maxImageWidth
        if (g.readingManager.isFullScreen && !isRight && screenWidth > kMinDocWidthForDesktop) {
            maxImageWidth = g.readingManager.docWidth * 0.6
        } else {
            maxImageWidth = g.readingManager.docWidth - 20 - 30
        }
         

        let flinksData = null
        if(isRight){
            flinksData = g.readingManager.connections.find(data => data.url === url)
        }
         
        const iframes = notePresentationDiv.querySelectorAll('iframe')
        
        iframes.forEach(iframe => {
            const w = iframe.getAttribute('width')
            const h = iframe.getAttribute('height')
            iframe.style.width = '100%'
            iframe.style.height = 'auto'
            iframe.style.aspectRatio = (w && h) ? `${w} / ${h}` : '16 / 9'
        });
         

        replaceMediaTagsWithLinksInDiv(notePresentationDiv,'audio')
        replaceMediaTagsWithLinksInDiv(notePresentationDiv,'video')
         
         
         

         
            


        for(let i = 0; i < images.length; i++){
            const image = images.item(i)
            
            image['data-width'] = image.width
          
            if (image['data-width']) {
                image.style.width =  Math.min(image['data-width'] , maxImageWidth) + 'px'  
            } else {
                image.style.width = '100%'
            }
            image.style.height = 'auto'
            


            image.onload = () => g.readingManager.imageJustLoaded(flinksData)
            image.onerror = () => g.readingManager.imageJustLoaded(flinksData)

        }
         

        const iframePlaceholders = notePresentationDiv.getElementsByClassName('iframe-placeholder')


        for (let i = 0; i < iframePlaceholders.length; i++) {
            const placeholder = iframePlaceholders.item(i)
       
            const finalWidth = Math.min(placeholder['data-width'] , maxImageWidth)
            if (placeholder['data-width']) {
                placeholder.style.width =  finalWidth + 'px'  
            } else {
                placeholder.style.width = '100%'
            }
            placeholder.style.height = (finalWidth * placeholder['data-ratio']) + 'px'
        }


        const ulLists =  notePresentationDiv.getElementsByTagName('li')
        for(let i = 0; i < ulLists.length; i++){
            const item = ulLists.item(i)
            item.classList.replace("task-list-item", "my-task-list-item");
        }


        const figures = Array.from(notePresentationDiv.querySelectorAll('figure'));

        figures.forEach(fig => {
            fig.style.marginInlineStart = 0
            fig.style.marginInlineEnd = 0
            fig.style.marginBlockStart = 0
            fig.style.marginBlockEnd = 0
            // fig.style.margin = 0
            // fig.style.padding = 0
        })
      

        return {isEditable,panels,headerInfo,title,base,connectedDocUrls, lang, copyInfo}

    }


   




    createIframePlaceholder(iframe,flinksData) {
      
        const allowsFullscreen = iframe.hasAttribute("allowfullscreen");
        const placeholder = document.createElement('div');
        placeholder.className = 'iframe-placeholder';

        const textColumnWidth = getTextColumnWidth()
        
        


        placeholder.style.width = textColumnWidth + 'px'; 


        const originalWidth = iframe.width.includes('%') ? textColumnWidth : parseInt(iframe.width,10)
        const originalHeight = parseInt(iframe.height,10)



        placeholder['data-width'] = originalWidth
        
        

        
        const ratio = originalHeight / originalWidth

        
        placeholder['data-ratio'] = ratio

      
        placeholder.style.height = `${Math.floor(textColumnWidth * ratio) }px`

  
        const iconSize = Math.floor(textColumnWidth * 0.15)

        const button = document.createElement('div');
        button.className = 'load-button';

        button.innerHTML = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M87.5 59.3747V79.6867C87.5 81.757 86.6758 83.7453 85.2109 85.2101C83.7461 86.6749 81.7578 87.4992 79.6875 87.4992H7.8125C3.4961 87.4992 0 84.0031 0 79.6867V59.3747C0 57.6481 1.3984 56.2497 3.125 56.2497C4.8516 56.2497 6.25 57.6481 6.25 59.3747V79.6867C6.25 80.1008 6.41406 80.4992 6.70703 80.7922C7 81.0852 7.39844 81.2492 7.81253 81.2492H79.6875C80.1016 81.2492 80.5 81.0852 80.793 80.7922C81.086 80.4992 81.2501 80.1008 81.2501 79.6867V59.3747C81.2501 57.6481 82.6485 56.2497 84.3751 56.2497C86.1017 56.2497 87.5 57.6481 87.5 59.3747ZM41.531 61.5935C42.1169 62.1833 42.9177 62.5193 43.7498 62.5193C44.5819 62.5193 45.3826 62.1833 45.9686 61.5935L64.7186 42.8435C65.9452 41.6169 65.9452 39.6326 64.7186 38.406C63.492 37.1794 61.5077 37.1794 60.2811 38.406L46.8751 51.844V3.125C46.8751 1.3984 45.4767 0 43.7501 0C42.0235 0 40.6251 1.3984 40.6251 3.125V51.844L27.2191 38.406C25.9925 37.1794 24.0082 37.1794 22.7816 38.406C21.555 39.6326 21.555 41.6169 22.7816 42.8435L41.531 61.5935Z" fill="currentColor"/></svg>`

        

        const loadingSpinner = document.createElement('div');
       loadingSpinner.className = 'iframe-loading-spinner';
      
        button.addEventListener('click', () => {

        const textColumnWidth = getTextColumnWidth()

            
            
          const newIframe = document.createElement('iframe');
           placeholder.style.borderWidth = 0
          
            
     

           loadingSpinner.style.display = 'block';

           button.style.display = 'none';

           newIframe.addEventListener('load', () => {
            loadingSpinner.style.display = 'none';
          });
  
          newIframe.addEventListener('error', () => {
            loadingSpinner.style.display = 'none';
            showToastMessage('Failed to load iframe content.');
          });


          newIframe.src = iframe.src;
          newIframe.width = textColumnWidth + 'px' 
          
          newIframe.height = Math.floor(textColumnWidth * placeholder['data-ratio']) + 'px'

          if(allowsFullscreen){
            newIframe.allowFullscreen = true
          }
      

          placeholder.innerHTML = '';
        placeholder.appendChild(newIframe);

        if(flinksData){

            flinksData.flinksUpdateNeeded = true

            if(g.readingManager.currentConnection === flinksData){
                g.readingManager.applyFlinksOnTheRight()
            }

        }else{
            g.readingManager.applyFlinksOnTheLeft()
        }
            
            
        });
      
        placeholder.appendChild(button);
        return placeholder;
    }



    getNoteTextFromSource(xmlContent, url = '', forExport = false){
        let markdown
        let html


        let headerInfo
  
        const result = this.parseContentOfHdoc(xmlContent)
        if(!result)return null
        const {content:contentFromFile,headerInfo:headerInfoFromFile,isHtml,panels,title,base, markdownWithoutTitle, flinksetUrls, isPlainText, lang, copyInfo} = result
        

        if(forExport){
            const htmlMatch = content.match(/<content\b[^>]*>([\s\S]*)<\/content>/im)
            
            if(!!htmlMatch){
                const html = htmlMatch[1]
                return {html,isHtml:true}
            }
            // else {
            //     const markdown = markdownWithoutTitle ? markdownWithoutTitle :  contentFromFile
            //     const html = this.getNoteTextFromMarkdown(markdown)
            //     return {html,isHtml:false,title}

            // }


        }


        if(isHtml){
            
            headerInfo = headerInfoFromFile
            html = contentFromFile
            

            // if(trim && html.length > kMarkdownTextLimitForNote){
            //     html = trimHtml(html,kMarkdownTextLimitForNote) + '<p>See more in the reading mode</p>'
            // }
       

        
            
        }
        // else {
        //     markdown = markdownWithoutTitle ? markdownWithoutTitle : contentFromFile

        //     html = this.getNoteTextFromMarkdown(markdown, trim)
        //     if (title) {
        //         headerInfo = {h1Text:title}  
        //     }

        // }
        
        return {headerInfo,html,isHtml,panels,title,base,flinksetUrls,isPlainText, lang, copyInfo}
    }



    parseContentOfHdoc(content) {
        if (!content) return null
        let title = ''
        let html = ''
        let panelsInfo
        let flinksetUrls = []
        let headerInfo
        let base = ''
        const docContentMatch = content.trim().match(/^<hdoc\b([^>]*)>([\s\S]*?)<\/hdoc>$/im)
        if(!docContentMatch)return null

        const hdocAttrs = docContentMatch[1]
        const langMatch = hdocAttrs.match(/lang="([^"]*)"/)
        const lang = langMatch ? langMatch[1] : undefined

        const docContent = docContentMatch[2]


        const markdownMatch = docContent.match(/<markdown\b[^>]*>([\s\S]*?)<\/markdown>/im)
        if(markdownMatch){
            let markdown = markdownMatch[1]
            const chunks = splitMarkdown(markdown)
            const markdownWithoutTitle = chunks.markdownWithoutTitle
            title = stripHtmlTags(chunks.title)
            
            return {content:markdown,markdownWithoutTitle,title,isHtml:false, flinksetUrls}
        }
    
    
        const htmlMatch = docContent.match(/(<content\b[^>]*>)([\s\S]*?)<\/content>/im)
       
        if (!htmlMatch)return

        const contentFirstTag = htmlMatch[1]

        const isPlainText = contentFirstTag.includes('type="text"')

        html = htmlMatch[2]

        const xmlContent = docContent.replace(htmlMatch[0],'')


        const docmetaMatch = xmlContent.match(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/im)


        if (docmetaMatch) {
            
            const parser = new DOMParser()
            const metadataDoc = parser.parseFromString(docmetaMatch[0], 'application/xml');
            const rootElement = metadataDoc.documentElement;
            const titleEl = rootElement.querySelector('title')
            if (titleEl) {
                title = stripHtmlTags(titleEl.textContent)
            }
            const baseEl = rootElement.querySelector('base')
            if (baseEl) {
                base = sanitizeUrl(baseEl.getAttribute('href'))
            }




        }

        const frontMatch = xmlContent.match(/<header\b[^>]*>([\s\S]*?)<\/header>/im)
        if (frontMatch) {
            headerInfo = {}
            const headerInfoString = frontMatch[0]

            const parser = new DOMParser()
            const headerDoc = parser.parseFromString(headerInfoString, 'application/xml');

            headerInfo = getHeaderInfoFromXML(headerDoc)

        }


        const panelsMatch = xmlContent.match(/<panels\b[^>]*>([\s\S]*?)<\/panels>/im)
        if(panelsMatch){


                let topPanelInfo = null
                let commentsPanelInfo = null
                let bottomPanelInfo = null
                let commentsUrl = ''
                let commentsTitle = ''
                let noCommentsMessage = ''
                let leaveCommentUrl = ''
                let commentsReplyLabel = ''
                let commentsLeaveLabel = ''
                let commentsLoadMoreLabel = ''
                const panelsString = panelsMatch[0]

                const parser = new DOMParser()

                const xmlDoc = parser.parseFromString(panelsString, 'application/xml');

                const rootElement = xmlDoc.documentElement;

        
                const topPanels = rootElement.getElementsByTagName('top')

                if(topPanels && topPanels.length){
                    let topPanelLogoUrl = ''
                    let mainLinkUrl = ''
                    let mainTitle = ''
                    const topPanel = topPanels[0]
                    const topPanelLinksInfo = []
                    for(const childNode of topPanel.childNodes){
                        if (childNode.nodeType !== Node.ELEMENT_NODE) continue
                        const tagName = childNode.nodeName.toLowerCase()
                        
                        if(tagName === 'logo'){
                            const logoImageUrl = sanitizeUrl(childNode.getAttribute('src'))
                            const logoHRef = sanitizeUrl(childNode.getAttribute('href'))
                            
                    
                            mainLinkUrl = logoHRef
                            topPanelLogoUrl = logoImageUrl


                        }else if(tagName === 'site-name'){
                            const title = stripHtmlTags(childNode.textContent)
                            const titleHRef = sanitizeUrl(childNode.getAttribute('href'))


                            mainLinkUrl = titleHRef
                            mainTitle = title


                        }else if(tagName === 'a'){

                            const text = stripHtmlTags(childNode.textContent)
                            const linkAddress = sanitizeUrl(childNode.getAttribute('href'))

                            topPanelLinksInfo.push({text,url:linkAddress})

                        }

                        

                    }


                    topPanelInfo = {mainUrl:mainLinkUrl,logo:topPanelLogoUrl,title:mainTitle,links:topPanelLinksInfo}
                    
            }


                





                let postNavPanelInfo = null
                const postNavPanels = rootElement.getElementsByTagName('post-nav')
                if (postNavPanels && postNavPanels.length) {
                    const postNavEl = postNavPanels[0]
                    const prevEl = postNavEl.querySelector('prev')
                    const nextEl = postNavEl.querySelector('next')
                    postNavPanelInfo = {}
                    if (prevEl) postNavPanelInfo.prev = {href: sanitizeUrl(prevEl.getAttribute('href')), title: stripHtmlTags(prevEl.textContent)}
                    if (nextEl) postNavPanelInfo.next = {href: sanitizeUrl(nextEl.getAttribute('href')), title: stripHtmlTags(nextEl.textContent)}
                }

                let directCommentsPanel = null
                for(const childNode of rootElement.childNodes){
                    if (childNode.nodeType !== Node.ELEMENT_NODE) continue
                    if(childNode.nodeName.toLowerCase() === 'comments'){
                        directCommentsPanel = childNode
                        break
                    }
                }

                if(directCommentsPanel){
                    commentsUrl = sanitizeUrl(directCommentsPanel.textContent)
                    commentsTitle = stripHtmlTags(directCommentsPanel.getAttribute('title'))
                    noCommentsMessage = stripHtmlTags(directCommentsPanel.getAttribute('empty'))
                    leaveCommentUrl = sanitizeUrl(directCommentsPanel.getAttribute('leave-comment-url'))
                    commentsReplyLabel = stripHtmlTags(directCommentsPanel.getAttribute('reply-label'))
                    commentsLeaveLabel = stripHtmlTags(directCommentsPanel.getAttribute('leave-comment-label'))
                    commentsLoadMoreLabel = stripHtmlTags(directCommentsPanel.getAttribute('load-more-label'))

                    commentsPanelInfo = {commentsUrl, commentsTitle, noCommentsMessage,
                                     leaveCommentUrl, commentsReplyLabel, commentsLeaveLabel, commentsLoadMoreLabel}
                }


                const bottomPanels = rootElement.getElementsByTagName('bottom')

                if(bottomPanels && bottomPanels.length){
                    const bottomPanel = bottomPanels[0]
                    const sections = bottomPanel.getElementsByTagName('section')
                    const sectionsArray = []
                    for(const section of sections){
                        

                        const sectionTitle = stripHtmlTags(section.getAttribute('title'))

                        const links = []
                        for(const childNode of section.childNodes){
                            if (childNode.nodeType !== Node.ELEMENT_NODE)continue
                            const tagName = childNode.nodeName.toLowerCase()

                            if(tagName === 'a'){
                                const text = stripHtmlTags(childNode.textContent)
                                const linkAddress = sanitizeUrl(childNode.getAttribute('href'))

                                links.push({text,url:linkAddress})
                            }


                        }

                        const sectionData = {title:sectionTitle,links}

                        sectionsArray.push(sectionData)
                    }


                    const test = bottomPanel.getElementsByTagName('bottom-message')
                    const bottomMessage = test && test.length ? stripHtmlTags(test[0].textContent) : ''

                    bottomPanelInfo = {sections:sectionsArray,bottomMessage}



                }


                let sidebarPanelInfo = null
                const sidebarPanels = rootElement.getElementsByTagName('sidebar')
                if (sidebarPanels && sidebarPanels.length) {
                    const sidebarEl = sidebarPanels[0]
                    const sidebarSide = sidebarEl.getAttribute('side') || 'right'

                    const sidebarItems = []
                    for (const child of sidebarEl.children) {
                        const tag = child.nodeName.toLowerCase()
                        if (tag === 'search') {
                            sidebarItems.push({
                                type: 'search',
                                action: sanitizeUrl(child.getAttribute('action')),
                                placeholder: stripHtmlTags(child.getAttribute('placeholder')),
                                target: stripHtmlTags(child.getAttribute('target'))
                            })
                        } else if (tag === 'links') {
                            const items = [...child.querySelectorAll('a')].map(a => ({
                                href: sanitizeUrl(a.getAttribute('href')),
                                text: stripHtmlTags(a.textContent),
                                target: stripHtmlTags(a.getAttribute('target')),
                                rel: stripHtmlTags(a.getAttribute('rel'))
                            }))
                            sidebarItems.push({type: 'links', title: stripHtmlTags(child.getAttribute('title')), items})
                        } else if (tag === 'recent-comments') {
                            const comments = [...child.querySelectorAll('comment')].map(c => ({
                                postHref: sanitizeUrl(c.getAttribute('post-href')),
                                postTitle: stripHtmlTags(c.getAttribute('post-title')),
                                author: stripHtmlTags(c.getAttribute('author')),
                                excerpt: stripHtmlTags(c.getAttribute('excerpt'))
                            }))
                            sidebarItems.push({
                                type: 'recent-comments',
                                title: stripHtmlTags(child.getAttribute('title')),
                                format: stripHtmlTags(child.getAttribute('format')),
                                comments
                            })
                        }
                    }

                    sidebarPanelInfo = {side: sidebarSide, items: sidebarItems}
                }

                panelsInfo = {
                    topPanel:topPanelInfo,
                    postNavPanel:postNavPanelInfo,
                    sidebarPanel:sidebarPanelInfo,
                    commentsPanel:commentsPanelInfo,
                    bottomPanel:bottomPanelInfo
                }

            }
            


            const connectionsMatch = xmlContent.match(/<connections\b[^>]*>([\s\S]*?)<\/connections>/im)
            if (connectionsMatch) {
                const connectionsString = connectionsMatch[0]

                const parser = new DOMParser();

                const xmlDoc = parser.parseFromString(connectionsString, 'application/xml');

                const rootElement = xmlDoc.documentElement;

                const flinkSets = rootElement.getElementsByTagName('doc')

                if (flinkSets) {
                    
    
                    for (let i = 0; i < flinkSets.length; i++) {
                        const flinkSet = flinkSets[i];
                        const flinkSetUrl = sanitizeUrl(flinkSet.getAttribute('url'))
                        if (flinkSetUrl) {
                            flinksetUrls.push(flinkSetUrl)
                        }
                    }
                    
                }


            }


            const copyInfoMatch = xmlContent.match(/<copy-info\b[^>]*>[\s\S]*?<\/copy-info>/im)
            let copyInfo = null
            if (copyInfoMatch) {
                const copyInfoParser = new DOMParser()
                const copyInfoDoc = copyInfoParser.parseFromString(copyInfoMatch[0], 'application/xml')
                copyInfo = parseCopyInfoFromElement(copyInfoDoc.documentElement)
            }

            const result = { content: html, title, base, markdownWithoutTitle:'', headerInfo, isHtml: true, flinksetUrls, isPlainText }
            if (lang) result.lang = lang
            if (panelsInfo) result.panels = panelsInfo
            if (copyInfo) result.copyInfo = copyInfo
            return result
            

        
    
    }


    interceptClickEvent(e) {


            let  target = e.target || e.srcElement;
            // if (target.type === 'checkbox') {
            //     return true
            // }
          //  e.preventDefault();

        


            while (target && target.tagName.toLowerCase() !== 'a') {
                target = target.parentElement;
            }
       

         
            if (target && target.tagName.toLowerCase() === 'a') {
                let href = target.getAttribute('href');
                             
                if (href) {

                    if (href.includes('#')) {
                        const chunks = href.split('#')
                        const cleanUrlInLink = chunks[0]
                        const idToScrollTo = decodeURIComponent(chunks[1])

                        let currentPageUrl
                        let divToScroll
                        let docTopOffset
                        if (this.mainDocData) {
                            docTopOffset = g.pdm.getCurrentDocTopOffset() + (g.pdm.currentDocTopPanelShowing ? 50 : 0)
                            currentPageUrl = this.mainDocData.needsMainDocWithUrl ? this.mainDocData.needsMainDocWithUrl : this.mainDocData.url
                            divToScroll = document.getElementById('CurrentDocument')
                        } else {
                            const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
                            currentPageUrl = noteData.url
                            divToScroll = noteData.scrollDiv
                            docTopOffset = g.pdm.getRightDocTopOffset(this) + (this.currentDocTopPanelShowing ? 50 : 0)
                        }


                        const currentPageCleanUrl = currentPageUrl.split('#')[0]

                        const isOnTheSamePage = currentPageCleanUrl === cleanUrlInLink

                        if (isOnTheSamePage) {
                            e.preventDefault()
                            scrollToIdInContainer(divToScroll,idToScrollTo,docTopOffset)
                            return
                        }
                    }
                    
               
                }

                return true
        
            }

            return true

        }




    addEventListenersToNote(div, listenersOwner, docId){
        if(!div){
            return
        }

        const notePresentationDiv = getPresentationDivFrom(div)

        


        
      //  listenersOwner.scrollListener = this.scrollEvent
        listenersOwner.linkEventListener = this.interceptClickEvent.bind(listenersOwner)
       // listenersOwner.linkHoverEventListener = this.onHoverOverLink
       // listenersOwner.linkMouseOutListener = this.onMouseOut
      //  listenersOwner.doubleClickEventListener = this.onDoubleClick

     //   notePresentationDiv.addEventListener("scroll",this.scrollEvent);

        notePresentationDiv.addEventListener('click', listenersOwner.linkEventListener);
       // notePresentationDiv.addEventListener('dblclick', onDoubleClick);
     //   notePresentationDiv.addEventListener('mouseover', this.onHoverOverLink);
     //   notePresentationDiv.addEventListener('mouseout', this.onMouseOut);





        

    }

    removeEventListenersFromNote(div, listenersOwner){
       // if(!note)return
     //  
        if(!div){
            listenersOwner.checkboxEventListeners = []
            return
        }
        
        const notePresentationDiv = getPresentationDivFrom(div)

        if(listenersOwner.scrollListener){
            notePresentationDiv.removeEventListener('scroll',listenersOwner.scrollListener)
            listenersOwner.scrollListener = null
            
        }

        if(listenersOwner.linkEventListener){
            notePresentationDiv.removeEventListener('click',listenersOwner.linkEventListener)
            listenersOwner.linkEventListener = null
            
        }

        if(listenersOwner.linkHoverEventListener){
            notePresentationDiv.removeEventListener('mouseover',listenersOwner.linkHoverEventListener)
            listenersOwner.linkHoverEventListener = null
        }

        if(listenersOwner.linkMouseOutListener){
            notePresentationDiv.removeEventListener('mouseout',listenersOwner.linkMouseOutListener)
            listenersOwner.linkMouseOutListener = null
        }

        if(listenersOwner.doubleClickEventListener){
            notePresentationDiv.removeEventListener('dblclick',listenersOwner.doubleClickEventListener)
            listenersOwner.doubleClickEventListener = null

        }


        const checkboxes = notePresentationDiv.getElementsByTagName('input')
 
        let indexOfCheckbox = 0
        
        if (!listenersOwner.checkboxEventListeners) {
            listenersOwner.checkboxEventListeners = []
        }
         for(let node of checkboxes){
             if(node.type === 'checkbox'){
 
                 let eventHandler
                 if(indexOfCheckbox < listenersOwner.checkboxEventListeners.length){
                     eventHandler = listenersOwner.checkboxEventListeners[indexOfCheckbox]
                 }
 
                 if(eventHandler){
                     
                     node.removeEventListener('change',eventHandler)
                 }
 
                 indexOfCheckbox++
             }
         }
 
         listenersOwner.checkboxEventListeners = []

    }


    calculateHighlightPosition(notePresentationDiv,textNodesArray,startIndex,highlightLength,divX, divY, padding, rightX){
   
       
        const divWidthWithoutScrollBar = notePresentationDiv.clientWidth



      
     
        let totalTextLength = 0
        let didFindRange = false
        let indexOfCharacterInHighlight = 0
        const lineRects = []

        let atLeastOneRectIsInsidePre = false
        for(let i = 0; i < textNodesArray.length; i++){
            if(didFindRange && highlightLength === 1)break
            const nodeText = textNodesArray[i].textContent
            const nextLength = totalTextLength + nodeText.length
            if(startIndex >= nextLength){
                totalTextLength = nextLength
                continue
            }


            const range = document.createRange();

            let currentIndex = didFindRange ? 0 : startIndex - totalTextLength
            didFindRange = true

            let firstRect = null
            
            let lastRect = null
            let j = 0

            while(1){
          
                if(currentIndex >= nodeText.length){
                    const lineRect = {left:firstRect.left,top:firstRect.top,height:firstRect.height,width:lastRect.left - firstRect.left + lastRect.width}
                    lineRects.push(lineRect)
                    break
                }

             
                range.setStart(textNodesArray[i], currentIndex);
                range.setEnd(textNodesArray[i], currentIndex + 1);


                if(!atLeastOneRectIsInsidePre){
                    atLeastOneRectIsInsidePre = textNodesArray[i].parentElement.closest('code, pre, blockquote') !== null;
                }
              
            
                const rawRect = range.getBoundingClientRect();
              
           


               


                const rect = {left:rawRect.left,top:rawRect.top + notePresentationDiv.scrollTop,width:rawRect.width,height:rawRect.height}

                if(!firstRect){

                    firstRect = rect
                    lastRect = rect
                    if(highlightLength === 1){
                        lineRects.push(rect)
                        didFindRange = true
                        break
                    }
                }

                

                if(rect.top != firstRect.top){
                    const lineRect = {left:firstRect.left,top:firstRect.top,height:firstRect.height,width:lastRect.left - firstRect.left + lastRect.width}
                    lineRects.push(lineRect)
                    firstRect = rect
                    lastRect = rect
                  
                }else{
                    lastRect = rect
                }



                    
                currentIndex++

                
                indexOfCharacterInHighlight++

                if(indexOfCharacterInHighlight > highlightLength - 1){
                    const lineRect = {left:firstRect.left,top:firstRect.top,height:firstRect.height,width:lastRect.left - firstRect.left + lastRect.width}
                    lineRects.push(lineRect)
                    break
                }
                    
            }

            totalTextLength = nextLength


            if(indexOfCharacterInHighlight > highlightLength - 1){
                break
            }



         
                    
         
        }
      

        let lastRectTop = -1
        let lastLeft = 0
        let lastWidth = 0
        let lastHeight = 0
        const mergedLineRects = []
        for(let i = 0;i < lineRects.length;i++){
            const rect = lineRects[i]
            if( Math.abs(rect.top - lastRectTop) > g.pdm.fontSize / 4.0){

                if(i !== 0){
                    mergedLineRects.push({left:lastLeft,top:lastRectTop,width:lastWidth,height:lastHeight})
                }

                lastRectTop = rect.top
                lastLeft = rect.left
                lastWidth = rect.width
                lastHeight = rect.height
            }else{
                lastWidth = rect.left + rect.width - lastLeft
            }


        }

        mergedLineRects.push({left:lastLeft,top:lastRectTop,width:lastWidth,height:lastHeight})

  
        let finalLineRects = mergedLineRects.filter(rect => rect.width != 0 && rect.height != 0)
        
        finalLineRects = finalLineRects.map((rect,index) => {
            const isFirst = index === 0
            const isLast = index === finalLineRects.length - 1
            
            let left
            let width


        
            const leftOffset = g.pdm.getMainLeftOffset()


            if (isFirst && isLast) {
                left = rect.left - divX - leftOffset
                width = rect.width    
            } else if (!isFirst && !isLast) {
                if (g.readingManager.isFullScreen) {
                    left = padding 
                    width = rightX - left
                } else {
                    left = 0
                    width = divWidthWithoutScrollBar 
                }
            }else if(isFirst){
                left = rect.left - divX - leftOffset
                if (g.readingManager.isFullScreen) { 
                    width = rightX - left
                } else {
                    width = divWidthWithoutScrollBar - left    
                }
            } else if (isLast) {
                if (g.readingManager.isFullScreen) {
                    left = padding

                    width = rect.left - left + rect.width - divX

                } else {
                    left = 0
                    width = rect.left - divX + rect.width - leftOffset
                    
                }
            }


            const newRect = {
                top: rect.top - divY,
                left,
                height:rect.height,
                width
            }


            
            return newRect
        })

    //    
        if(finalLineRects.length === 0)return {rects:finalLineRects,isInsidePre:atLeastOneRectIsInsidePre}

        if(finalLineRects.length === 1)return {rects:finalLineRects,isInsidePre:atLeastOneRectIsInsidePre}


        if(finalLineRects.length === 2){
            const [firstLineRect,secondLineRect] = finalLineRects

            stickBottomLineRectToTheTopOne(firstLineRect,secondLineRect)


            return {rects:finalLineRects,isInsidePre:atLeastOneRectIsInsidePre}
        }

        const firstLineRect = finalLineRects[0]
        const firstMiddleLineRect = finalLineRects[1]
        const lastMiddleLineRect = finalLineRects[finalLineRects.length - 2]

        const lastLineRect = finalLineRects[finalLineRects.length - 1]

     //   
        const height =  lastMiddleLineRect.top - firstMiddleLineRect.top + lastMiddleLineRect.height

        firstMiddleLineRect.height = height
        stickBottomLineRectToTheTopOne(firstLineRect,firstMiddleLineRect)
        stickBottomLineRectToTheTopOne(firstMiddleLineRect,lastLineRect)

        finalLineRects = [firstLineRect,firstMiddleLineRect,lastLineRect]

     //   





        return {rects:finalLineRects,isInsidePre:atLeastOneRectIsInsidePre}
    }



}
export default NoteDivsManager