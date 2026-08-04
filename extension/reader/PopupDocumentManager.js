/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from './Globals.js'
import { cleanConnectedDocURL, createOneIconComponent, createOneSVGIconComponent, getDataFromCondocXML, getDesiredConnectionsFromHdocDataJson, getHeaderDivFrom, getPresentationDivFrom, getTextColumnWidth, getTextFromDiv, hideUrlInTheCorner, isDotInsideFrame, isoToHumanReadableDate, removeAllChildren, sanitizeHtml, sanitizeUrl, showToastMessage, showUrlInTheCorner, stripHtmlTags } from './helpers.js'
import PageInfoManager from './PageInfoManager.js'
import CollageViewer from './CollageViewer.js'
import { kColorsForFlinks, kSidebarWidthToScreenWidthRatio } from './constants.js'
import { fetchWebPage } from './NetworkManager.js'
import ExportPageManager from './ExportPageManager.js'
import { loadStaticContentFromUrl } from './parsers/ParsingManager.js'
import { hideMultipleLinksPopup } from './MultipleLinksPopupManager.js'

export const kMiddleGap = 50
export const kMinDocWidthForDesktop = 430
export const kLeftDivTop = 60
export const kRightDocsTabRowHeight = 20
export const kRightDivTopBarHeight = 20
export const kDefaultFontSize = 18.0

export const kVerticalPanelInFullscreenWidth = 400


export const kDefaultPadding = 20

let docWidth


window.onresize = () => {
    if(!g.readingManager.isReading)return
    g.pdm.updateDocumentWidth()
    g.pdm.updateConnectedDocumentsVisibility()
    const collectionDiv = document.getElementById("RightDocumentCollectionContainer")
    collectionDiv.style.width = `${g.readingManager.docWidth}px`
    const columns = collectionDiv.querySelectorAll('#AllRightDocumentsContainer .DocumentColumn')
    columns.forEach(columnDiv => {
        columnDiv.style.width = `${g.readingManager.docWidth}px`
    })

    g.readingManager.applyFlinksOnTheLeft()
    g.readingManager.applyFlinksOnTheRight()


    g.readingManager.redrawAllTabs()
    if (g.pdm.isFlinksListOpen) {
        g.pdm.toggleFlinksList()
    }

    const canvasTopDiv = document.getElementById('middle-canvas-topDiv')
    canvasTopDiv.style.left = `${g.readingManager.docWidth}px`

    const middleSpaceDiv = document.getElementById("middle-space-div")

    middleSpaceDiv.style.left = `${g.readingManager.docWidth}px`
    middleSpaceDiv.style.top = '60px'
    middleSpaceDiv.style.width = `${kMiddleGap}px`
    middleSpaceDiv.style.bottom = 0

    
    if (g.readingManager.mainCollageViewer) {
        g.readingManager.mainCollageViewer.updateCanvasSize(g.readingManager.docWidth, kLeftDivTop, 0)
        g.readingManager.mainCollageViewer.changesExist = true
    }
    
    
    const leftX = g.readingManager.docWidth + kMiddleGap
    for (const noteData of g.readingManager.rightNotesData) {
        if (!noteData.collageViewer) continue
        noteData.collageViewer.updateCanvasSize(g.readingManager.docWidth, kLeftDivTop, leftX)
        noteData.collageViewer.changesExist = true
    }
}

class PopupDocumentManager{

    fontSize = kDefaultFontSize
    current3DDoc = null
    isLeftEditing = false
    isRightEditing = false
    //isFullScreen = false
    rightNotesData = []

    topPanelListeners = []

    sortInRightDoc = false

    infoManager = null

    isShowingLeftDropdownMenu = false

    leftSearchIdlnessTimer = null
    leftSearchHeighlightObjects = []
    leftSearchIndex = 0

    rightSearchIdlnessTimer = null
    rightSearchHeighlightObjects = []
    rightSearchIndex = 0

    currentDocTopPanelShowing = false
    currentDocBottomPanelShowing = false

    isLeftExporting = false

    isLeftSourceCodeShowing = false
    isRightSourceCodeShowing = false

    isPaddingOn = true


    isShowingInfo = false

    isFlinksListOpen = false

    mainDocTitle = ''

    constructor(){

        
        
    }
    
    
    loadUI = () => {     
        const allDocumentsContainer = document.getElementById("AllDocumentsContainer")
        allDocumentsContainer.style.width = `${window.innerWidth}px`
    
        const iconPaths = g.iconsInfo.iconPaths
      

        const downloadLink = document.getElementById("MainDocDownloadLink")
        downloadLink.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()

            this.downloadMainDocInCondoc(g.readingManager.mainDocData.needsMainDocWithUrl)
            
        })
    
      
    
        const closeButton = document.getElementById("CurrentDocumentCloseButton")
        this.createOneSVGIconComponent(closeButton,g.iconsInfo.svgIcons.closeIcon,'Reader-CloseButton')

        closeButton.addEventListener('click', (e) => {
            e.stopPropagation()
            window.postMessage({ type: "RELOAD_PAGE" }, "*");
        })
    
        const leftSandwichButtonDiv = document.getElementById("LeftSandwichButton")
    
        leftSandwichButtonDiv.addEventListener('click',this.toggleLeftDropDownMenu)
    


    
        const infoButton = document.getElementById("CurrentDocumentInfoButton")
        this.createOneSVGIconComponent(infoButton,g.iconsInfo.svgIcons.infoIcon,'Reader-InfoButton')
        infoButton.addEventListener('click', this.infoButtonPressed)
        
        const downloadAllButton = document.getElementById("CurrentDocumentDownloadAllDocsButton")


        this.createOneSVGIconComponent(downloadAllButton,g.iconsInfo.svgIcons.downloadAll,'Reader-DownloadAllButton')
        downloadAllButton.addEventListener('click',g.readingManager.downloadAllPages)
    
        const fullScreenButton = document.getElementById("CurrentDocumentFullScreenButton")
        this.createOneSVGIconComponent(fullScreenButton,g.iconsInfo.svgIcons.fullscreenOffIcon,'Reader-FullscreenButton')

        fullScreenButton.addEventListener('click', this.fullScreenButtonPressed)
        fullScreenButton.style.display = 'none'
    
        const exportButton = document.getElementById("CurrentDocumentExportButton")
        this.createOneSVGIconComponent(exportButton,g.iconsInfo.svgIcons.exportIcon,'Reader-ExportButton')

        exportButton.addEventListener('click', this.exportButtonPressed)
        exportButton.style.display = 'none'

        const sourceCodeButton = document.getElementById("CurrentDocumentSourceCodeButton")
        this.createOneSVGIconComponent(sourceCodeButton,g.iconsInfo.svgIcons.sourceCode,'Reader-SourceCodeButton')

        sourceCodeButton.addEventListener('click', this.sourceCodeButtonPressed)
        
        const centerCollageButton = document.getElementById("CurrentDocumentCenterCollageButton")
        this.createOneSVGIconComponent(centerCollageButton,g.iconsInfo.svgIcons.frameIcon,'Reader-CenterCollageButton')

        centerCollageButton.addEventListener('click',this.leftDocCenterCollagePressed)
        centerCollageButton.style.display = 'none'

        const currentDocumentCopyButton = document.getElementById("CurrentDocumentCopyButton")
        this.createOneSVGIconComponent(currentDocumentCopyButton,g.iconsInfo.svgIcons.copyIcon)
        currentDocumentCopyButton.addEventListener('click', this.leftCopyButtonPressed)

        currentDocumentCopyButton.style.display = 'none'

        const currentDocumentEmbeddingSymbol = document.getElementById("CurrentDocumentEmbeddingSymbol")
        this.createOneSVGIconComponent(currentDocumentEmbeddingSymbol,g.iconsInfo.svgIcons.exclamationIcon)

        currentDocumentEmbeddingSymbol.style.display = 'none'
    

        const saveCurrentlyPressedLinkIfNeeded = (link) => {
            if(!link)return

            let shouldPreventDefault = false
                
            const mainDocDiv = document.getElementById("CurrentDocumentMainDiv")

            if(mainDocDiv.contains(link)){
                shouldPreventDefault = true
                this.currentLink = link
            }else if(!g.readingManager.isFullScreen){

                const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
                if(noteData.docType === 'h'){
                    const secondDiv = noteData.scrollDiv
                    const secondPresentationDiv = getPresentationDivFrom(secondDiv)
                    if(secondPresentationDiv.contains(link)){
                        shouldPreventDefault = true
                        this.currentLink = link
                    }

                }
            }

            return shouldPreventDefault
            
        }
    
        allDocumentsContainer.addEventListener('mousedown', e => {
            this.currentLink = null
            this.isDragging = false;
            this.startX = e.pageX;
            this.startY = e.pageY;

            const element = document.elementFromPoint(
                e.clientX,
                e.clientY
            );


            const link = element.closest("a");

            if(saveCurrentlyPressedLinkIfNeeded(link)){
                e.preventDefault()
            }

        });

        allDocumentsContainer.addEventListener('click', e => {
            const element = document.elementFromPoint(
                e.clientX,
                e.clientY
            );


            const link = element.closest("a");

            if(saveCurrentlyPressedLinkIfNeeded(link)){
                e.preventDefault()
            }

        })


        allDocumentsContainer.addEventListener('mousemove', e => {
            this.currentLink = null
            if(this.isMultiplePopupOpen){
                hideMultipleLinksPopup(300)
            }
            const dx = e.pageX - this.startX;
            const dy = e.pageY - this.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { // threshold in pixels
                this.isDragging = true;
            }

            this.movementEvent = e


            const {pageX,pageY} = e

            const docWidth = g.readingManager.docWidth
    
            const leftOffset = this.getMainLeftOffset()

            let leftSidebarWidth = 0

            if(g.readingManager.isFullScreen && !g.isMobileMode && g.readingManager.mainDocPanels && g.readingManager.mainDocPanels.sidebarPanel && g.readingManager.mainDocPanels.sidebarPanel.side === 'left'){
                leftSidebarWidth = window.innerWidth * kSidebarWidthToScreenWidthRatio
            }
            const relativeX = pageX - leftOffset - leftSidebarWidth
            
            if(g.readingManager.isFullScreen || relativeX < docWidth){
                if( pageY > kLeftDivTop){
                    const showPointer = g.readingManager.isFlinkUnderMouseInMainDoc(relativeX,pageY)
                    
                    if(g.readingManager.mainCollageViewer){
                        g.readingManager.mainCollageViewer.showPointerForFlink = showPointer
                    }else{
                        allDocumentsContainer.style.cursor = showPointer ? 'pointer' : 'default'
                    }
                    
                }
            }else if(relativeX > docWidth + kMiddleGap){
                const rightTop = 50
                if(pageY > rightTop){
                    const showPointer = g.readingManager.isFlinkUnderMouseInRightDoc(relativeX,pageY)
                    
                    const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
                    if(noteData.collageViewer){
                        noteData.collageViewer.showPointerForFlink = showPointer

                    }else{
                        allDocumentsContainer.style.cursor = showPointer ? 'pointer' : 'default'
                    }
                }
            }




        });


        

        allDocumentsContainer.addEventListener('mouseup',(e)=>{
            if (this.isDragging) return
            if(this.isLeftSourceCodeShowing || this.isLeftExporting || this.isShowingInfo)return
     
            const {pageX,pageY} = e
    
            const docWidth = g.readingManager.docWidth
    
            const leftOffset = this.getMainLeftOffset()


            if (this.isFlinksListOpen) {
                const flinksListDiv = document.getElementById("LinksListContainerDiv")
                const rect = flinksListDiv.getBoundingClientRect()
                
                const { x, y, height, width } = rect

                const frame = {minX:x,minY:y,maxX:x + width,maxY:y + height}

                const isClickInsideFlinksPopup = isDotInsideFrame(pageX, pageY, frame)
                


                const flinksListOpenButton = document.getElementById("LinksOpenButton")
                const buttonRect = flinksListOpenButton.getBoundingClientRect()

                let isClickInsideButton
                {
                    const { x, y, height, width } = buttonRect
                    isClickInsideButton = isDotInsideFrame(pageX, pageY, {minX:x,minY:y,maxX:x + width,maxY:y + height})

                }



                if (isClickInsideFlinksPopup || isClickInsideButton) return
                g.pdm.closeFlinksList()
            
            }

            let leftSidebarWidth = 0

            if(g.readingManager.isFullScreen && !g.isMobileMode && g.readingManager.mainDocPanels && g.readingManager.mainDocPanels.sidebarPanel && g.readingManager.mainDocPanels.sidebarPanel.side === 'left'){
                leftSidebarWidth = window.innerWidth * kSidebarWidthToScreenWidthRatio
            }
            const clickX = pageX - leftOffset - leftSidebarWidth
            
            if(g.readingManager.isFullScreen || clickX < docWidth){
                if( pageY > kLeftDivTop){
                    
                    g.readingManager.handleTouchInMainDoc(clickX,pageY,this.currentLink)
                }
            }else if(clickX > docWidth + kMiddleGap){
                const rightTop = 50//kRightDocsTabRowHeight + (this.rightNotesData.length > 1 ? kRightDivTopBarHeight : 0)
                if(pageY > rightTop){
                    g.readingManager.handleTouchInRightDoc(clickX,pageY,this.currentLink)
                }
            }else{
                
                g.readingManager.handleTouchInMiddleGap(clickX,pageY)
            }
            
    
        })
    
        const flinksOpenButton = document.getElementById("LinksOpenButton")
        this.createOneSVGIconComponent(flinksOpenButton,g.iconsInfo.svgIcons.flinksButton,'Reader-FlinksOpenButton')
        flinksOpenButton.addEventListener('click', (e) => {
            e.stopPropagation()
            this.toggleFlinksList()
        })
    

        const showOriginalLinksButton = document.getElementById("LinksListOriginalLinksButton")
        showOriginalLinksButton.addEventListener('click', (e) => {
            e.stopPropagation()
            g.readingManager.revertToOriginalFlinks()
            this.openFlinksList()

            g.readingManager.applyFlinksOnTheLeft()
            g.readingManager.applyFlinksOnTheRight()


            this.updateCurrentDocExportButton()
        })

        
        const fixFlinksButton = document.getElementById("LinksListFixButton")
        fixFlinksButton.addEventListener('click', (e) => {
            e.stopPropagation()
            this.fixBrokenFlinks()
            this.openFlinksList()
            this.updateCurrentDocExportButton()
        })
    
        const flinksCloseButton = document.getElementById("LinksListCloseButton")
        flinksCloseButton.addEventListener('click', (e) => {
            e.stopPropagation()
            this.closeFlinksList()
        })
    
    
    
        const rightDocumentSourceCodeButton = document.getElementById("RightDocumentSourceCodeButton")
        this.createOneSVGIconComponent(rightDocumentSourceCodeButton,g.iconsInfo.svgIcons.sourceCode,'Reader-RightDocSourceCodeButton')
        rightDocumentSourceCodeButton.addEventListener('click',this.rightDocumentSourceCodeButtonPressed)
    

        const rightDocumentCenterCollageButton = document.getElementById("RightDocumentCenterCollageButton")
        this.createOneSVGIconComponent(rightDocumentCenterCollageButton,g.iconsInfo.svgIcons.frameIcon,'Reader-rightDocumentCenterCollageButton')

        rightDocumentCenterCollageButton.addEventListener('click', this.rightDocCenterCollagePressed)
        rightDocumentCenterCollageButton.style.display = 'none'
    
        
    
  
    

        const rightDocumentCopyButton = document.getElementById("RightDocumentCopyButton")
        this.createOneSVGIconComponent(rightDocumentCopyButton,g.iconsInfo.svgIcons.copyIcon)
        rightDocumentCopyButton.addEventListener('click', this.rightCopyButtonPressed)

        rightDocumentCopyButton.style.display = 'none'
   

  
    }


    updateFontSize = (diff) => {
        this.fontSize += diff
   
        this.applyFontSizeToPresentationDivs()

        g.readingManager.applyFlinksOnTheLeft()
        g.readingManager.applyFlinksOnTheRight()

        if(diff != 0){
            showToastMessage(`Font size: ${this.fontSize}${this.fontSize === 18 ? ' (default)' : ''}`)
        }
    }


    applyFontSizeToPresentationDivs = () => {
        const mainDiv = document.getElementById('CurrentDocumentMainDiv')
        mainDiv.style.fontSize = `${this.fontSize}px`
        const mainDocHeader = document.getElementById('CurrentDocumentHeader')
        mainDocHeader.style.fontSize = `${this.fontSize}px`


        if(!g.readingManager.isFullScreen){

            for (const noteData of g.readingManager.rightNotesData) {
                if (noteData.scrollDiv) {
                    const presentationDiv = getPresentationDivFrom(noteData.scrollDiv)
                    presentationDiv.style.fontSize = `${this.fontSize}px`
                    const headerDiv = getHeaderDivFrom(noteData.scrollDiv)
                    headerDiv.style.fontSize = `${this.fontSize}px`
                }
            }
        }
    }




  



    showTab = (index) => {
        g.readingManager.showTab(index)

        const noteData = g.readingManager.rightNotesData[index]
        if (noteData.isShowingDropdownMenu) {
            g.pdm.toggleRightDropDownMenu()   
        }


        const fullScreenButton = document.getElementById("CurrentDocumentFullScreenButton")
        fullScreenButton.style.display = 'flex'


        const rightDocumentTitleLink = document.getElementById("RightDocumentTitleLink")

        let url


        let originalUrl
        if(noteData.copyInfo){
            originalUrl = noteData.copyInfo.original
        }

        if(originalUrl){
            url = originalUrl
        }else{
            url = noteData.url.split('#')[0]
        }


        rightDocumentTitleLink.href = url
        rightDocumentTitleLink.title = url

        rightDocumentTitleLink.target = '_blank'

        const rightDocumentCenterCollageButton = document.getElementById("RightDocumentCenterCollageButton")
        rightDocumentCenterCollageButton.style.display = noteData.docType === 'c' ? 'flex' : 'none'


        const rightDocumentCopyButton = document.getElementById("RightDocumentCopyButton")
        
        rightDocumentCopyButton.style.display = noteData.copyInfo ? 'flex' :'none'
        
    



        const optionalTitleSpan = document.getElementById("RightDocumentOptionalTitleSpan")
        if(g.readingManager.rightNotesData.length === 1){

            optionalTitleSpan.innerText = noteData.title ?? ''
           
            optionalTitleSpan.style.display = 'flex'
        }else{
            optionalTitleSpan.style.display = 'none'
        }


        const titleSpan = document.getElementById("RightDocumentTitleSpan")


        let title = originalUrl ? originalUrl : (noteData.url != null ? noteData.url : '')
     
        titleSpan.innerText = title
        

    }


      async showEmptyCondoc(dataObject) {
        
        this.prepareConnectionsForDocument(dataObject)

        const currentDocumentEmbeddingSymbol = document.getElementById("CurrentDocumentEmbeddingSymbol")
        currentDocumentEmbeddingSymbol.style.display = 'flex'


        const screenWidth = window.innerWidth
        g.readingManager.docWidth = (screenWidth - kMiddleGap) / 2
        const {condocTitle, condocDescription, mainPageUrl} = getDataFromCondocXML(dataObject.xmlString)
        
        g.readingManager.mainDocData = dataObject

        this.mainDocTitle = condocTitle
        this.mainDocType = 'condoc'


        const optionalTitle = document.getElementById("CurrentDocumentOptionalTitleSpan")
        optionalTitle.innerText = this.mainDocTitle

        const titleSpan = document.getElementById("CurrentDocumentTitleSpan")
        titleSpan.innerText = mainPageUrl

        const leftTitleLink = document.getElementById("CurrentDocumentTitleLink")
        leftTitleLink.href = mainPageUrl.split('#')[0]
        leftTitleLink.title = mainPageUrl.split('#')[0]
        leftTitleLink.target = '_blank'
        leftTitleLink.classList.add('onHoverUnderlineDecoration')
        leftTitleLink.style.cursor = 'pointer'




        const mainDiv = document.getElementById("AllDocumentsContainer")

        mainDiv.style.display = 'flex'

        this.updateDocumentWidth()
          

        const {count,total } = this.configureConnectionsCountOnInfoButton()

        const downloadAllButton = document.getElementById("CurrentDocumentDownloadAllDocsButton")

        downloadAllButton.style.display = count < total ? 'flex' : 'none'


        this.downloadMainDocInCondoc(mainPageUrl)
       

    }


    async downloadMainDocInCondoc(mainPageUrl, successCallback) {
         g.pdm.showMainDocSpinner()
        const embeddedDataObject = await loadStaticContentFromUrl(mainPageUrl)
        g.pdm.hideMainDocSpinner()
        

        if (embeddedDataObject) {
            if (![1,2,3,5].includes(embeddedDataObject.docSubtype)) {
                showToastMessage('Wrong format of the embedded document')
                return
            }
            if (embeddedDataObject.docType === 'h') {
                this.loadDocument(embeddedDataObject, true)
            } else if (embeddedDataObject.docType === 'c') {
                this.loadCollage(embeddedDataObject, true)
            } 

            if(successCallback)successCallback()
        } else {
        
            const downloadLink = document.getElementById("MainDocDownloadLink")
            downloadLink.href = mainPageUrl
            downloadLink.style.display = 'flex'
            
        }
    }



    async loadCollage(dataObject, isEmbedded = false){

        if (!isEmbedded) {
            const leftTitleLink = document.getElementById("CurrentDocumentTitleLink")
            leftTitleLink.removeAttribute("href"); 
        }
    
        this.hidePanelsOfCurrentDocument()
      

        const screenWidth = window.innerWidth

        g.readingManager.docWidth = screenWidth
      
       
   
        if (!isEmbedded) {
            this.prepareConnectionsForDocument(dataObject)       
        }


       
        
        const mainDiv = document.getElementById("AllDocumentsContainer")
        const mainPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
        mainPresentationDiv.style.display = 'none'
        const mainCollageDiv = document.getElementById("CurrentDocumentMainCollageDiv")
        mainDiv.style.display = 'flex'
        mainCollageDiv.style.display = 'flex'
        
      
        const canvas = document.getElementById("CurrentDocumentMainCollageCanvas")

        
        g.readingManager.mainCollageViewer = new CollageViewer(dataObject.xmlString,dataObject.url,-1,'main',canvas,0,kLeftDivTop,window.innerWidth, this.collageLoadedCallback)

        this.updateDocumentWidth()


       


        

        const headerDiv = document.getElementById("CurrentDocumentHeader")
        removeAllChildren(headerDiv)


        

        if (isEmbedded) {
             g.readingManager.embeddedDocData = dataObject 
        } else {
            g.readingManager.mainDocData = dataObject  
        }


        g.readingManager.mainDocType = 'c'

        
        g.readingManager.isReading = true



        // g.readingManager.frame()

        

    }

    collageLoadedCallback = async () => {

        if (!g.readingManager.mainCollageViewer?.content) return
        
        const titleSpan = document.getElementById("CurrentDocumentTitleSpan")
        const optionalTitleSpan = document.getElementById("CurrentDocumentOptionalTitleSpan")

        const collageContent = g.readingManager.mainCollageViewer.content
        if(collageContent){
            optionalTitleSpan.innerText = collageContent.title
            optionalTitleSpan.style.display = 'block'
            titleSpan.style.display = 'none'
        }
        if (collageContent && collageContent.copyInfo) {
            const copyInfo = collageContent.copyInfo
            const currentDocumentCopyButton = document.getElementById("CurrentDocumentCopyButton")
            currentDocumentCopyButton.style.display = 'flex'
            if (copyInfo.original) {
                titleSpan.innerText = copyInfo.original
                const leftTitleLink = document.getElementById("CurrentDocumentTitleLink")
                leftTitleLink.href = copyInfo.original
                leftTitleLink.target = '_blank'
                leftTitleLink.classList.add('onHoverUnderlineDecoration')
                leftTitleLink.style.cursor = 'pointer'
                optionalTitleSpan.style.display = 'block'
                titleSpan.style.display = 'block'
            }
            g.readingManager.mainDocCopyInfo = copyInfo
        }


        const currentDocumentSourceCodeButton = document.getElementById("CurrentDocumentSourceCodeButton")
        currentDocumentSourceCodeButton.style.display = 'flex'


        const {count,total } = this.configureConnectionsCountOnInfoButton()

        const downloadAllButton = document.getElementById("CurrentDocumentDownloadAllDocsButton")

        downloadAllButton.style.display = count < total ? 'flex' : 'none'
      

        setTimeout(() => {
            g.readingManager.drawFlinksOnTheLeftOnly()  
        
            if (!g.readingManager.isFullScreen) {
                g.readingManager.applyFlinksOnTheRight(false)
            }
        },10)


        this.showMiddleCanvas()
        
        g.readingManager.addListenerToLeftDoc()

        g.readingManager.frame()

        const centerCollageButton = document.getElementById("CurrentDocumentCenterCollageButton")
        centerCollageButton.style.display = 'flex'



    }

  

    async loadDocument(dataObject, isEmbedded = false){

        if (!isEmbedded) {
            const leftTitleLink = document.getElementById("CurrentDocumentTitleLink")
            leftTitleLink.removeAttribute("href"); 
        }

   
        if (isEmbedded) {
             g.readingManager.embeddedDocData = dataObject 
        } else {
            g.readingManager.mainDocData = dataObject  
        }
        
        g.readingManager.mainDocType = 'h'


        this.updateDocumentWidth()
        

        const div = document.getElementById("CurrentDocument")

             

        const result = g.noteDivsManager.populateDivWithTextFromDoc(div,dataObject.xmlString,dataObject.url)
        if (!result) {
            
            showToastMessage('Something is wrong with this page')
            return 
        }
        const {panels,title, lang, copyInfo} = result
        

        if(copyInfo){
            const currentDocumentCopyButton = document.getElementById("CurrentDocumentCopyButton")
            currentDocumentCopyButton.style.display = 'flex'
        }
      
        if (!isEmbedded) {
            this.prepareConnectionsForDocument(dataObject)       
        }
    
        this.mainDocTitle = title

        
        const {count,total } = this.configureConnectionsCountOnInfoButton()

        const downloadAllButton = document.getElementById("CurrentDocumentDownloadAllDocsButton")

        downloadAllButton.style.display = count < total ? 'flex' : 'none'
        
  
        const titleSpan = document.getElementById("CurrentDocumentTitleSpan")

        const optionalTitleSpan = document.getElementById("CurrentDocumentOptionalTitleSpan")

      
        if(copyInfo){
            if(copyInfo.original){
                optionalTitleSpan.innerText = title
                titleSpan.innerText = copyInfo.original
                const leftTitleLink = document.getElementById("CurrentDocumentTitleLink")
                leftTitleLink.href = copyInfo.original
                leftTitleLink.target = '_blank'
                leftTitleLink.classList.add('onHoverUnderlineDecoration')
                leftTitleLink.style.cursor = 'pointer'
            }else{
                optionalTitleSpan.innerText = title
                titleSpan.style.display = 'none'
            }

            g.readingManager.mainDocCopyInfo = copyInfo


        }else if(isEmbedded){
            optionalTitleSpan.innerText = title
            titleSpan.innerText = dataObject.url
        }else{
            optionalTitleSpan.innerText = title
            optionalTitleSpan.style.display = 'block'
            titleSpan.style.display = 'none'

        }

        optionalTitleSpan.style.display = 'block'



        //======panels
        if (!panels) {
            this.hidePanelsOfCurrentDocument()
        } else {
            
            const topPanelDiv = document.getElementById("CurrentDocumentTopPanel")
            const bottomPanelDiv = document.getElementById("CurrentDocumentBottomPanel")
            const topPanelLogoLink = document.getElementById("CurrentDocumentTopPanelLogoLink")
            const topPanelLogoImage = document.getElementById("CurrentDocumentTopPanelLogo")
            const topPanelTitleSpan = document.getElementById("CurrentDocumentTopPanelTitle")
            const bottomPanelRowDiv = document.getElementById("CurrentDocumentBottomPanelRow")
            const topPanelOptionsRow = document.getElementById("CurrentDocumentTopPanelOptionsRow")
            const bottomMessageDiv = document.getElementById("CurrentDocumentBottomPanelBottomMessage")
            const dropdownMenuDiv = document.getElementById("CurrentDocumentDropDownMenu") 
            const sandwichButtonDiv = document.getElementById("LeftSandwichButton")
            const documentSidebar = document.getElementById("CurrentDocumentSidebar")
            const documentBottomBar = document.getElementById("CurrentDocumentBottomBar")
    
            const postNavBar = document.getElementById("CurrentDocumentPostNavBar")
            const belowContentCommentsDiv = document.getElementById("CurrentDocumentBelowContentComments")

      
            const allDivs = {
                topPanelDiv,topPanelLogoLink,topPanelLogoImage,topPanelTitleSpan,
                bottomPanelDiv,bottomPanelRowDiv,topPanelOptionsRow,bottomMessageDiv,
                dropdownMenuDiv,sandwichButtonDiv,
                documentSidebar, documentBottomBar,
                postNavBar, belowContentCommentsDiv
                
            }

            g.readingManager.mainDocPanels = panels
            this.populatePanels(panels,allDivs,this,false)





        }    


        this.updateSidebarVisibility()
        
        const mainDiv = document.getElementById("AllDocumentsContainer")
        const mainPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
        
        const mainCollageDiv = document.getElementById("CurrentDocumentMainCollageDiv")
        mainDiv.style.display = 'flex'
        mainCollageDiv.style.display = 'none'
        mainPresentationDiv.style.display = 'block'

        this.updateDocumentWidth()

        this.applyFontSizeToPresentationDivs()


        g.readingManager.isReading = true


        setTimeout(() => {
            g.readingManager.drawFlinksOnTheLeftOnly()  
         
            if (!g.readingManager.isFullScreen) {
                g.readingManager.applyFlinksOnTheRight(false)
            }

        },10)
    


       
        
        g.readingManager.addListenerToLeftDoc()

        g.readingManager.frame()


    }



    openCopyInfoPopup = (copyInfo) => {
      
        const overlay = document.createElement('div')
        overlay.className = 'swp-comment-popup-overlay'

        const dialog = document.createElement('div')
        dialog.className = 'open-original-in-new-tab-dialog'

        const msg = document.createElement('p')
        msg.className = 'open-original-in-new-tab-dialog__message'
        if(copyInfo.original){
            msg.textContent = 'This document is a copy of another document: ' + copyInfo.original
        }else{
            msg.textContent = 'This document is a copy of another document but the link to the original document was not provided.'
        }

        const actions = document.createElement('div')
        actions.className = 'open-original-in-new-tab-dialog__actions'

        if(copyInfo.original){
            const openBtn = document.createElement('button')
            openBtn.className = 'open-original-in-new-tab-dialog__btn open-original-in-new-tab-dialog__btn--open'
            openBtn.textContent = 'Open the original in the new tab'
            openBtn.addEventListener('click', () => {
                window.open(copyInfo.original, '_blank')
                overlay.remove()
            })
            actions.appendChild(openBtn)

        }

        const cancelBtn = document.createElement('button')
        cancelBtn.className = 'open-original-in-new-tab-dialog__btn open-original-in-new-tab-dialog__btn--cancel'
        cancelBtn.textContent = 'Cancel'
        cancelBtn.addEventListener('click', () => overlay.remove())

        actions.appendChild(cancelBtn)
        dialog.appendChild(msg)
        dialog.appendChild(actions)
        overlay.appendChild(dialog)
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
        document.body.appendChild(overlay)
    }

    
    prepareConnectionsForDocument(dataObject = null) {
        if(dataObject){
            g.readingManager.connections = dataObject.connectedDocsData
            g.readingManager.connections.forEach(con => con.isOriginal = true)
        }

        let j = 0
        for (let i = 0; i < g.readingManager.connections.length; i++){
            const connection = g.readingManager.connections[i]
            connection.color = kColorsForFlinks[j]
            j++
            if(j >= kColorsForFlinks.length)j = 0
        }

    }


 
    configureConnectionsCountOnInfoButton() {

        const connections = g.readingManager.connections.filter(con => !!con.isOriginal)

        let count = 0

        const finalUrls = new Set()
        for (const flinksData of connections) {
            finalUrls.add(flinksData.url)
            const noteData = g.readingManager.getNoteDataByUrl(flinksData.url)
            if (noteData) {
                count++
            }
        }

        const total = finalUrls.size




        const countDiv = document.getElementById("CurrentDocumentInfoButtonCountDiv")
        if (total) {
  

            countDiv.classList.remove('CurrentDocumentInfoButtonCountDivComplete')
            countDiv.classList.remove('CurrentDocumentInfoButtonCountDivIncomplete')
            countDiv.classList.remove('CurrentDocumentInfoButtonCountDivSelected')
            if (this.isShowingInfo) {
                countDiv.classList.add('CurrentDocumentInfoButtonCountDivSelected')   
            } else {
                countDiv.classList.add(count === total ? 'CurrentDocumentInfoButtonCountDivComplete' : 'CurrentDocumentInfoButtonCountDivIncomplete')   
            }
            countDiv.textContent = `${count}/${total}`
        } else {
            countDiv.textContent = ''
        }

        countDiv.style.display = total > 0 ? 'flex' : 'none'

        return {count,total}
    }


    populatePanelsOfOneRightDoc(){

        if(!g.readingManager.rightNotesData.length)return
        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]

        if(noteData.docType !== 'h' || !noteData.panels){
            return
        }

        
        

        const docId = noteData.docId
        const topPanelDiv = document.getElementById('DocumentTopPanel' + docId)
        

        const topPanelLogoLink = document.getElementById("DocumentTopPanelLogoLink" + docId)
        const topPanelLogoImage = document.getElementById("DocumentTopPanelLogo" + docId)
        const topPanelTitleSpan = document.getElementById("DocumentTopPanelTitle" + docId)
        const topPanelOptionsRow = document.getElementById("DocumentTopPanelOptionsRow" + docId)

        const bottomPanelDiv = document.getElementById('DocumentBottomPanel' + docId)
        const bottomPanelRowDiv = document.getElementById('DocumentBottomPanelRow' + docId)


        const bottomMessageDiv = document.getElementById("DocumentBottomPanelBottomMessage" + docId)
        



        const sandwichButtonDiv = document.getElementById("SandwichButton" + docId)
        const dropdownMenuDiv = document.getElementById("DocumentDropDownMenu" + docId)

        const documentBottomBar = document.getElementById("RightDocumentBottomBar" + docId)

        const postNavBar = document.getElementById("RightDocumentPostNavBar" + docId)
        const belowContentCommentsDiv = document.getElementById("RightDocumentBelowContentComments" + docId)

        const allDivs = {
            topPanelDiv,topPanelLogoLink,topPanelLogoImage,topPanelTitleSpan,
            bottomPanelDiv,bottomPanelRowDiv,topPanelOptionsRow,bottomMessageDiv,
            sandwichButtonDiv,dropdownMenuDiv,
            documentSidebar:null, documentBottomBar,
            postNavBar, belowContentCommentsDiv
        }

        this.populatePanels(noteData.panels,allDivs,noteData,true)
    }


    updateSidebarVisibility = () => {
        const sidebar = document.getElementById("CurrentDocumentSidebar")
        const bottomBar = document.getElementById("CurrentDocumentBottomBar")


        if(!g.readingManager.mainDocPanels || !g.readingManager.mainDocPanels.sidebarPanel){
            sidebar.style.display = 'none'
            bottomBar.style.display = 'none'
            return
        }

        if(!g.readingManager.isFullScreen || g.isMobileMode){
            sidebar.style.display = 'none'
            bottomBar.style.display = 'flex'
        }else{

            if(g.readingManager.mainDocPanels.sidebarPanel.side === 'left'){
                const row = document.getElementById("CurrentDocumentInnerRow")
                row.style.flexDirection = 'row-reverse'
            }


            sidebar.style.display = 'flex'
            bottomBar.style.display = 'none'





        }
    }

    populatePanels(panelsInfo,allDivs,dataObject,isRight = false){

        const {
            topPanelDiv,topPanelLogoLink,topPanelLogoImage,topPanelTitleSpan,
            bottomPanelDiv,bottomPanelRowDiv,topPanelOptionsRow,bottomMessageDiv,
            sandwichButtonDiv,dropdownMenuDiv,
            documentSidebar, documentBottomBar,
            postNavBar, belowContentCommentsDiv
        } = allDivs


        if(panelsInfo.sidebarPanel){
            if(documentSidebar){
                this.populateSidebar(documentSidebar, panelsInfo.sidebarPanel)
            }
            if(documentBottomBar){
                this.populateSidebar(documentBottomBar, panelsInfo.sidebarPanel)
            }
        }

        if(panelsInfo.postNavPanel){
            this.populatePostNavPanel(postNavBar, panelsInfo.postNavPanel)
        }
      


        while(topPanelOptionsRow.firstChild){
            topPanelOptionsRow.removeChild(topPanelOptionsRow.firstChild)
        }





        while(bottomPanelRowDiv.firstChild){
            bottomPanelRowDiv.removeChild(bottomPanelRowDiv.firstChild)
        }

        

        const {topPanel,bottomPanel,commentsPanel,style} = panelsInfo

        if(belowContentCommentsDiv){
            const hasComments = !!(commentsPanel && commentsPanel.commentsUrl)
            belowContentCommentsDiv.style.display = hasComments ? 'block' : 'none'
            if(hasComments){
                this.getComments(belowContentCommentsDiv, commentsPanel.commentsUrl, commentsPanel.commentsTitle,
                    commentsPanel.noCommentsMessage, dataObject, commentsPanel.leaveCommentUrl,
                    commentsPanel.commentsReplyLabel, commentsPanel.commentsLeaveLabel, 1, commentsPanel.commentsLoadMoreLabel)
            }else{
                this.cleanCommentsDiv(belowContentCommentsDiv)
            }

            const mainPadding = g.pdm.getMainDocumentPadding()

            belowContentCommentsDiv.style.paddingLeft = `${mainPadding}px`
            belowContentCommentsDiv.style.paddingRight = `${mainPadding}px`

            this.updateMainDocumentCommentsSectionMargins()
          
        }


        let topTextColor = 'black'
        let topBackgroundColor = 'white'
        let bottomTextColor = 'black'
        let bottomBackgroundColor = 'white'
    

        if(style){
            const {textColor,backgroundColor} = style
            if(textColor){
                topTextColor = textColor
                bottomTextColor = textColor
            }
            if(backgroundColor){
                topBackgroundColor = backgroundColor
                bottomBackgroundColor = backgroundColor
            }
           
        }

       

        if(topPanel && (topPanel.logo || topPanel.title || (topPanel.links && topPanel.links.length))){
            
            dataObject.currentDocTopPanelShowing = true

            if(topPanel.style){
                if(style){
                    const {textColor,backgroundColor} = topPanel.style
                    if(textColor){
                        topTextColor = textColor
                    }
                    if(backgroundColor){
                        topBackgroundColor = backgroundColor
                    }
                }
            }

            topPanelLogoImage.style.display = 'none'
            topPanelTitleSpan.style.display = 'none'
            if(topPanel.logo || topPanel.title){
                let {isMainLinkStatic,logo:imageUrl,mainUrl:link,title} = topPanel
                if(imageUrl){
                    topPanelLogoImage.src = imageUrl
                    topPanelLogoImage.width = '150px'
                    topPanelLogoImage.height = '50px'
                    topPanelLogoImage.style.width = '150px'
                    topPanelLogoImage.style.height = '50px'
                    topPanelLogoImage.style.display = 'flex'
                    topPanelTitleSpan.style.display = 'none'
                }else if(title){
                    topPanelTitleSpan.textContent = title
                    topPanelLogoImage.style.display = 'none'
                    topPanelTitleSpan.style.display = 'flex'
                   //topPanelTitleSpan.style.color = topTextColor
                }else{
                    topPanelLogoImage.style.display = 'none'
                    topPanelTitleSpan.style.display = 'none'
                }

                if(!dataObject.topPanelListeners){
                    dataObject.topPanelListeners = []
                }

                for(const item of dataObject.topPanelListeners){
                    const {type,handler} = item
                    topPanelLogoLink.removeEventListener(type,handler)
                }

                dataObject.topPanelListeners = []

                if(link){

                    const clickHandler = () => {
                        g.wn.openUrl(link, isMainLinkStatic)
                    }
                    topPanelLogoLink.href = link

                   // topPanelLogoLink.addEventListener('click',clickHandler)
                   // dataObject.topPanelListeners.push({type:'click',handler:clickHandler})
    
                    // const mouseOverHandler = () => {
                    //  //   showUrlInTheCorner(link)
                    // }
                  //  topPanelLogoLink.addEventListener('mouseover',mouseOverHandler)
                 //   dataObject.topPanelListeners.push({type:'mouseover',handler:mouseOverHandler})



                    // const mouseOutHandler = () => {
                    //  //   hideUrlInTheCorner()
                    // }

                   // topPanelLogoLink.addEventListener('mouseout',mouseOutHandler)
                   // dataObject.topPanelListeners.push({type:'mouseout',handler:mouseOutHandler})


                  

                }
                topPanelLogoLink.style.cursor = !!link ? 'pointer' : 'default'


            }

    

         dataObject.docTopPanelTextColor = topTextColor
         dataObject.docTopPanelBackgroundColor = topBackgroundColor
         dataObject.docTopPanelLinks = topPanel.links


            
        }




        if(bottomPanel){

            if(bottomPanel.style){
                if(style){
                    const {textColor,backgroundColor} = bottomPanel.style
                    if(textColor){
                        bottomTextColor = textColor
                    }
                    if(backgroundColor){
                        bottomBackgroundColor = backgroundColor
                    }
                }
            }

            if(bottomPanel.sections && bottomPanel.sections.length){
                dataObject.currentDocBottomPanelShowing = true

                for(const section of bottomPanel.sections){
                    const sectionDiv = document.createElement('div')
                    sectionDiv.className = "FooterSection"
    
                    if(!section.title && (!section.links || !section.links.length))continue
    
                    if(section.title){
                        const h2 = document.createElement('h2')
                        h2.className = "FooterSectionTitle"
                        h2.textContent = section.title
                        //h2.style.color = bottomTextColor
                        sectionDiv.appendChild(h2)
    
                    }
    
                    let isFirst = true
                    for(const link of section.links){
                        const linkNode = document.createElement('a')
                        linkNode.className = "FooterOptionLink"
                        linkNode.href = link.url
                        linkNode.textContent = link.text
                        //linkNode.style.color = bottomTextColor
                        if(isFirst){
                            if(!section.title){
                                linkNode.style.marginTop = '20px'
                            }
                            isFirst = false
                        }

                        sectionDiv.appendChild(linkNode)

                     
                    }
    
                    
    
                    bottomPanelRowDiv.appendChild(sectionDiv)
                }

            }

            if(bottomPanel.bottomMessage){
                dataObject.currentDocBottomPanelShowing = true
                bottomMessageDiv.textContent = bottomPanel.bottomMessage
             //   bottomMessageDiv.style.color = bottomTextColor

            }

            bottomMessageDiv.style.display = bottomPanel.bottomMessage ? 'flex' : 'none'


          
        }




      //  topPanelDiv.style.backgroundColor = topBackgroundColor
      //  bottomPanelDiv.style.backgroundColor = bottomBackgroundColor

        topPanelDiv.style.display = dataObject.currentDocTopPanelShowing ? 'flex' : 'none'
        bottomPanelDiv.style.display = dataObject.currentDocBottomPanelShowing ? 'flex' : 'none'
        

        if(topPanel && topPanel.links && topPanel.links.length){
   
            const allDivs = {topPanelDiv,topPanelLogoLink,topPanelOptionsRow,dropdownMenuDiv,sandwichButtonDiv}



            
            
            
            
            this.addLinksToTopPanel(topPanel.links,topTextColor,allDivs,dataObject,isRight)
        }

    }


    populateSidebar(div, sidebarInfo) {
        removeAllChildren(div)

        for (const item of sidebarInfo.items) {
            if (item.type === 'search') {
                const widget = document.createElement('div')
                widget.className = 'SideBarWidget'

                const form = document.createElement('div')
                form.className = 'SideBarSearchForm'

                const input = document.createElement('input')
                input.type = 'search'
                input.className = 'SideBarSearchInput'
                input.placeholder = item.placeholder || 'Search…'

                input.addEventListener('keydown', (event) => {
                    if (event.key !== 'Enter') return
                    const query = encodeURIComponent(input.value.trim())
                    if (!query) return
                    const url = item.action.replace('%s', query)
                    window.open(url, item.target || '_self')
                })

                form.appendChild(input)
                widget.appendChild(form)
                div.appendChild(widget)

            } else if (item.type === 'links') {
                const widget = document.createElement('div')
                widget.className = 'SideBarWidget'

                if (item.title) {
                    const title = document.createElement('p')
                    title.className = 'SideBarWidgetTitle'
                    title.textContent = item.title
                    widget.appendChild(title)
                }

                const ul = document.createElement('ul')
                ul.className = 'SideBarLinks'

                for (const link of item.items) {
                    const li = document.createElement('li')
                    const a = document.createElement('a')
                    a.href = link.href
                    a.textContent = link.text
                    if (link.target) a.target = link.target
                    if (link.rel) a.rel = link.rel
                    li.appendChild(a)
                    ul.appendChild(li)
                }

                widget.appendChild(ul)
                div.appendChild(widget)

            } else if (item.type === 'recent-comments') {
                const widget = document.createElement('div')
                widget.className = 'SideBarWidget'

                if (item.title) {
                    const title = document.createElement('p')
                    title.className = 'SideBarWidgetTitle'
                    title.textContent = item.title
                    widget.appendChild(title)
                }

                const format = item.format || '{author} on {post}'

                for (const comment of item.comments) {
                    const entry = document.createElement('div')
                    entry.className = 'SideBarCommentItem'

                    const header = document.createElement('span')
                    header.className = 'SideBarCommentHeader'
                    for (const part of format.split(/(\{author\}|\{post\})/g)) {
                        if (part === '{author}') {
                            const authorSpan = document.createElement('span')
                            authorSpan.className = 'SideBarCommentAuthor'
                            authorSpan.textContent = comment.author
                            header.appendChild(authorSpan)
                        } else if (part === '{post}') {
                            const postLink = document.createElement('a')
                            postLink.href = comment.postHref
                            postLink.textContent = comment.postTitle
                            header.appendChild(postLink)
                        } else if (part) {
                            header.appendChild(document.createTextNode(part))
                        }
                    }

                    entry.appendChild(header)
                    if (comment.excerpt) {
                        const excerpt = document.createElement('span')
                        excerpt.className = 'SideBarCommentExcerpt'
                        excerpt.textContent = comment.excerpt
                        entry.appendChild(excerpt)
                    }
                    widget.appendChild(entry)
                }

                div.appendChild(widget)
            }
        }
    }


    populatePostNavPanel(div, postNavPanelInfo) {
        removeAllChildren(div)
        if(!postNavPanelInfo)return

        const leftDiv = document.createElement('div')
        leftDiv.className = 'PostNavBarSide'
        leftDiv.style.justifyContent = 'flex-start'
        div.appendChild(leftDiv)

        const rightDiv = document.createElement('div')
        rightDiv.className = 'PostNavBarSide'
        rightDiv.style.justifyContent = 'flex-end'

        div.appendChild(rightDiv)


        if(postNavPanelInfo.prev){
            const leftArrowIconDiv = document.createElement('div')
            leftArrowIconDiv.style.width = '24px'
            leftArrowIconDiv.style.height = '24px'
            this.createOneSVGIconComponent(leftArrowIconDiv,g.iconsInfo.svgIcons.arrowLeft)
            leftDiv.appendChild(leftArrowIconDiv)

            const leftLink = document.createElement('a')
            leftLink.href = postNavPanelInfo.prev.href
            leftLink.innerText = postNavPanelInfo.prev.title
            leftDiv.appendChild(leftLink)
        }

        if(postNavPanelInfo.next){

            const rightLink = document.createElement('a')
            rightLink.href = postNavPanelInfo.next.href
            rightLink.innerText = postNavPanelInfo.next.title
            rightDiv.appendChild(rightLink)

            const rightArrowIconDiv = document.createElement('div')
            rightArrowIconDiv.style.width = '24px'
            rightArrowIconDiv.style.height = '24px'
            this.createOneSVGIconComponent(rightArrowIconDiv,g.iconsInfo.svgIcons.arrowRight)
            rightDiv.appendChild(rightArrowIconDiv)
            
            
        }

        div.style.display = postNavPanelInfo.prev || postNavPanelInfo.next ? 'flex' : 'none'



    }


    addLinksToTopPanel(linksData,topTextColor,allDivs,dataObject,isRight){
        const {topPanelDiv,topPanelLogoLink,topPanelOptionsRow,dropdownMenuDiv} = allDivs
        let sandwichButtonDiv = allDivs.sandwichButtonDiv

        
        
        

            let availableWidth = topPanelDiv.offsetWidth - topPanelLogoLink.offsetWidth - 200
            let usedWidth = 0
            

            while(topPanelOptionsRow.firstChild){
                topPanelOptionsRow.removeChild(topPanelOptionsRow.firstChild)
            }


            let showSandwich = false


            while(dropdownMenuDiv.firstChild){
                dropdownMenuDiv.removeChild(dropdownMenuDiv.firstChild)
            }



            for(let link of linksData){
                let linkNode = document.createElement('a')
                linkNode.className = 'TopPanelOptionLink'
                linkNode.href = link.url
                linkNode.textContent = link.text
                //linkNode.style.color = topTextColor

                topPanelOptionsRow.appendChild(linkNode)

                const linkWidth = linkNode.offsetWidth + 20
                
                if (usedWidth + linkWidth <= availableWidth) {
                  usedWidth += linkWidth;
                  
                } else {
                    showSandwich = true
                  linkNode.style.display = "none"; // Hide link
                  const clone = linkNode.cloneNode(true);
                  clone.style.display = 'flex'
                  clone.style.marginLeft = 0
                  clone.style.marginBottom = '5px'
                  linkNode = clone
                  dropdownMenuDiv.appendChild(clone); 
                }

            }


          //    if(showSandwich){
                

            //    const color =  dataObject.docTopPanelTextColor

               // const lineDivs = document.getElementsByClassName(isRight ? 'RightSandwichLine' : 'LeftSandwichLine')

                // for (let i = 0; i < lineDivs.length; i++) {
                //     lineDivs[i].style.backgroundColor = color
                // }

               // dropdownMenuDiv.style.backgroundColor = dataObject.docTopPanelBackgroundColor
          //  }

            sandwichButtonDiv.style.display = showSandwich ? 'flex' : 'none'
        

    }





    fullScreenButtonPressed = (e) => {

        e.stopPropagation()

        this.toggleFullScreen()


      
       
    }

    exportButtonPressed = (e) => {
        e.stopPropagation()
        this.toggleExport()
       // this.updateConnectedDocumentsVisibility()
       
    }

    sourceCodeButtonPressed = (e) => {
        e.stopPropagation()
        this.toggleSourceCode()
       // this.updateConnectedDocumentsVisibility()
       
    }

    rightDocumentSourceCodeButtonPressed = (e) => {
        e.stopPropagation()
        this.toggleRightDocSourceCode()
    }


    leftDocCenterCollagePressed = (e) => {
        e.stopPropagation()

        if (g.readingManager.mainCollageViewer) {
            g.readingManager.mainCollageViewer.centerCollage()
        }
    }

    rightDocCenterCollagePressed = (e) => {
        e.stopPropagation()

        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
        if (noteData.collageViewer) {
            noteData.collageViewer.centerCollage()
        }
        
    }


    leftCopyButtonPressed = (e) => {
        e.stopPropagation()

        const copyInfo = g.readingManager.mainDocCopyInfo
        if(copyInfo){
            this.openCopyInfoPopup(copyInfo)
        }
    }


    rightCopyButtonPressed = (e) => {
        e.stopPropagation()

        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
        
        if(noteData.copyInfo){
            this.openCopyInfoPopup(noteData.copyInfo)
        }
    }



    closeAllExcept(except) {
        
        if(this.isShowingInfo && except !== this.toggleInfo){
            this.toggleInfo(true)
        }
        if(this.isLeftSourceCodeShowing && except !== this.toggleSourceCode){
            this.toggleSourceCode(true)
        }

        if (this.isShowingLeftDropdownMenu && except !== this.toggleLeftDropDownMenu) {
            this.toggleLeftDropDownMenu()
        }

     
        if (except !== this.toggleRightDropDownMenu && g.readingManager.rightNotesData.length) {
            const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
            if (noteData.isShowingDropdownMenu) {
                this.toggleRightDropDownMenu()
            }
            
        }

        if(this.isLeftExporting && except !== this.toggleExport){
            this.toggleExport(true)
        }

        if (this.isFlinksListOpen && except !== this.toggleFlinksList) {
            this.toggleFlinksList(true)
         }

    }


    toggleExport = (dontCloseOthers = false) => {

        if(!dontCloseOthers)this.closeAllExcept(this.toggleExport)
        

        this.isLeftExporting = !this.isLeftExporting

        const buttonDiv = document.getElementById("CurrentDocumentExportButton")
  
       if(!this.isLeftExporting) buttonDiv.classList.remove('selectedIcon')
        else buttonDiv.classList.add('selectedIcon')


        buttonDiv.style.backgroundColor = this.isLeftExporting ? 'rgb(72, 77, 233)' : 'transparent'


        const exportDivConatiner = document.getElementById("CurrentDocumentExportContainer")
        exportDivConatiner.style.display = this.isLeftExporting ? 'flex' : 'none'

        g.readingManager.redrawFlinks()

        if(this.isLeftExporting){

            if(g.readingManager.mainDocType === 'h'){
            //export doc
                const exportManager = new ExportPageManager()
                exportManager.renderData()
                return
            }else if (g.readingManager.mainDocType === 'c'){
                //export collage
                const exportManager = new ExportPageManager()
                exportManager.renderData()
            }
            
        }else{
            return
        }

    }


    toggleSourceCode = (dontCloseOthers = false) => {

        if(!dontCloseOthers)this.closeAllExcept(this.toggleSourceCode)
         
        this.isLeftSourceCodeShowing = !this.isLeftSourceCodeShowing
        
        const buttonDiv = document.getElementById("CurrentDocumentSourceCodeButton")

        if(!this.isLeftSourceCodeShowing) buttonDiv.classList.remove('selectedIcon')
        else buttonDiv.classList.add('selectedIcon')

        buttonDiv.style.backgroundColor = this.isLeftSourceCodeShowing ? 'rgb(72, 77, 233)' : 'transparent'


        const exportDivConatiner = document.getElementById("CurrentDocumentExportContainer")
        exportDivConatiner.style.display = this.isLeftSourceCodeShowing ? 'flex' : 'none'

        if(this.isLeftSourceCodeShowing){

            const exportManager = new ExportPageManager()
            exportManager.renderSourceCode(exportDivConatiner, g.readingManager.mainDocData)
                
      
        }

        g.readingManager.redrawFlinks()
   
    }


    toggleRightDocSourceCode = () => {
        this.isRightSourceCodeShowing = !this.isRightSourceCodeShowing

        const buttonDiv = document.getElementById("RightDocumentSourceCodeButton")
  
        if(!this.isRightSourceCodeShowing) buttonDiv.classList.remove('selectedIcon')
        else buttonDiv.classList.add('selectedIcon')

        buttonDiv.style.backgroundColor = this.isRightSourceCodeShowing ? 'rgb(72, 77, 233)' : 'transparent'


        const exportDivConatiner = document.getElementById("RightDocumentExportContainer")
        exportDivConatiner.style.display = this.isRightSourceCodeShowing ? 'flex' : 'none'

        if(this.isRightSourceCodeShowing){

            const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
            const exportManager = new ExportPageManager()
            exportManager.renderSourceCode(exportDivConatiner, noteData, true)

            
        }
        g.readingManager.redrawFlinks()
    }



    async toggleFullScreen(){
        g.readingManager.isFullScreen = !g.readingManager.isFullScreen

        await new Promise(requestAnimationFrame);
        this.updateDocumentWidth()

        this.updateConnectedDocumentsVisibility()


        g.readingManager.applyFlinksOnTheLeft()


        this.centerAllCollages()

     
        if(this.isShowingLeftDropdownMenu){
            this.toggleLeftDropDownMenu()
        }

        if (this.isFlinksListOpen) {
            this.closeFlinksList()
        }

    }


    centerAllCollages() {
           if (g.readingManager.mainCollageViewer) {
            g.readingManager.mainCollageViewer.centerCollage()
        }

        for (const noteData of g.readingManager.rightNotesData) {
            if (noteData.collageViewer) {
                noteData.collageViewer.centerCollage()
            }
        }
    }

    updateDocumentWidth() {

        const mainContainer = document.getElementById("AllDocumentsContainer");
        const mainContainerRect = mainContainer.getBoundingClientRect();
        g.adminBarHeight = mainContainerRect.top


        const screenWidth = window.innerWidth
        let docWidth = (screenWidth - kMiddleGap) / 2
        if(docWidth < kMinDocWidthForDesktop){
            docWidth = screenWidth - kMiddleGap - 20
            g.isMobileMode = true
        }else{
            g.isMobileMode = false
        }
        g.readingManager.docWidth = docWidth
        const allDocumentsContainer = document.getElementById("AllDocumentsContainer")

    
        allDocumentsContainer.style.height = `${window.innerHeight - g.adminBarHeight}px`
        allDocumentsContainer.style.width = `${g.readingManager.isFullScreen ? screenWidth : docWidth * 2 + kMiddleGap}px`
        const oneDocumentContainer = document.getElementById("OneDocumentContainer")
        const currentDocumentDiv = document.getElementById("CurrentDocument")
        const currentDocumentWidth = g.readingManager.isFullScreen ? screenWidth : g.readingManager.docWidth
        oneDocumentContainer.style.width = `${currentDocumentWidth}px`

        oneDocumentContainer.style.borderRightStyle = g.readingManager.isFullScreen ? 'none' : 'solid'
    

        currentDocumentDiv.style.width = `${currentDocumentWidth}px`

        if(g.readingManager.mainCollageViewer){
            g.readingManager.mainCollageViewer.updateWidth(currentDocumentWidth)
        }

        const currentDocumentBody = document.getElementById("CurrentDocumentBody")

        if(g.readingManager.isFullScreen && g.readingManager.copyInfo
        ){
            currentDocumentBody.style.width = `100%`
        }else{
            currentDocumentBody.style.width = '70%'
        }

        this.updateMainDocumentPadding()
        this.updateMainDocumentCommentsSectionMargins()

        const mainPresentationDiv = document.getElementById("CurrentDocumentMainDiv")

        
         mainPresentationDiv.style.width = '100%'

        const fullScreenButton = document.getElementById("CurrentDocumentFullScreenButton")
        while(fullScreenButton.firstChild){
            fullScreenButton.removeChild(fullScreenButton.firstChild)
        }

        const iconPaths = g.iconsInfo.iconPaths

        const newIcon = g.readingManager.isFullScreen ? g.iconsInfo.svgIcons.fullscreenOffIcon : g.iconsInfo.svgIcons.fullscreenOnIcon
        this.createOneSVGIconComponent(fullScreenButton,newIcon,'Reader-FullscreenButton')


        this.updateLeftDocumentPanels()


        this.updateSidebarVisibility()


        if (g.readingManager.mainDocType === 'h') {
            this.updateDocumentImageWidths(mainPresentationDiv)   
        }

        if (g.readingManager.rightNotesData.length) {
            const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
            if (noteData.docType === 'h') {
                const div = noteData.scrollDiv
                const presentationDiv = getPresentationDivFrom(div)
                this.updateDocumentImageWidths(presentationDiv)   

            }
            
        }



    }

    infoButtonPressed = (e) => {
        e.stopPropagation()
        this.toggleInfo()
        if(g.readingManager.areLeftFlinksPositionedForFullscreen !== this.isFullScreen){
            g.readingManager.applyFlinksOnTheLeft()
        }
    }

    toggleInfo = (dontCloseOthers = false) => {
        const iconPaths = g.iconsInfo.iconPaths
        
        if(!dontCloseOthers)this.closeAllExcept(this.toggleInfo)
  

        this.isShowingInfo = !this.isShowingInfo
     
        const buttonDivWrapper = document.getElementById("CurrentDocumentInfoButtonWrapper")

        const buttonDiv = document.getElementById("CurrentDocumentInfoButton")

        const countDiv = document.getElementById("CurrentDocumentInfoButtonCountDiv")
        const countText = countDiv.textContent  
        


        let connectionsComplete = false
        if (countText && countText.includes('/')) {
            const chunks = countText.split('/')
            connectionsComplete = chunks[0] === chunks[1]  
        }
        
        buttonDivWrapper.style.backgroundColor = this.isShowingInfo ? 'rgb(72, 77, 233)' : 'transparent'
        
        if(!this.isShowingInfo) buttonDivWrapper.classList.remove('selectedIcon')
        else buttonDivWrapper.classList.add('selectedIcon')
    
        const oldCountDiv = document.getElementById("CurrentDocumentInfoButtonCountDiv")
        if(oldCountDiv)oldCountDiv.remove()
   
        const newCountDiv = document.createElement('div')
        newCountDiv.id = "CurrentDocumentInfoButtonCountDiv"
        newCountDiv.className = "CurrentDocumentTopButtonCountDiv"
        newCountDiv.textContent = countText
        newCountDiv.classList.add(this.isShowingInfo ? 'CurrentDocumentInfoButtonCountDivSelected' : (connectionsComplete ? 'CurrentDocumentInfoButtonCountDivComplete' : 'CurrentDocumentInfoButtonCountDivIncomplete'))
        buttonDiv.appendChild(newCountDiv)
        newCountDiv.style.display = countText ? 'flex' : 'none'
            
        

        
        const infoDivContainer = document.getElementById("CurrentDocumentInfoContainer")
        infoDivContainer.style.display = this.isShowingInfo ? 'flex' : 'none'

        if(this.isShowingInfo){
            this.infoManager = new PageInfoManager()
            this.infoManager.renderData()
        }
   
        g.readingManager.redrawFlinks()
        
    }

   
  



    isOkToShowFlinks() {
        return ((!g.readingManager.isFullScreen && g.readingManager.rightNotesData.length) || g.readingManager.mainDocType === 'c')  && !(this.isShowingInfo || this.isLeftExporting || this.isLeftSourceCodeShowing ||  this.isRightSourceCodeShowing)
    }


 

  
















   


    



    async updateConnectedDocumentsVisibility() {
        const allRightDocumentsContainer = document.getElementById("AllRightDocumentsContainer")
        

         const screenWidth = window.innerWidth

        const docWidth = g.readingManager.docWidth
        const rightDocLeft = docWidth + kMiddleGap

   
        allRightDocumentsContainer.style.width = `${docWidth}px`
        allRightDocumentsContainer.style.left = `${rightDocLeft}px`
        allRightDocumentsContainer.style.display = !g.readingManager.isFullScreen ? 'flex' : 'none'
    
        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]


        const optionalTitleSpan = document.getElementById("RightDocumentOptionalTitleSpan")
        if(!g.readingManager.isFullScreen){
            this.populatePanelsOfOneRightDoc()

            if(g.readingManager.rightNotesData.length === 1){
                optionalTitleSpan.innerText = noteData.title ?? ''
                optionalTitleSpan.style.display = 'block'

            }else{
                optionalTitleSpan.style.display = 'none'
            }

            const titleSpan = document.getElementById("RightDocumentTitleSpan")
            titleSpan.innerText = noteData.url ?? ''
         

        }else{

            
            this.hideMiddleCanvas()

       
        }



      

       

    
  

    }


 

    showMiddleCanvas() {
        if (g.readingManager.isFullScreen && g.readingManager.mainDocType === 'h') return
        if(g.readingManager.mainDocData.docType === 'condoc' && !g.readingManager.embeddedDocData)return
        const screenHeight = window.innerHeight

        g.flinksCanvas.style.left = 0
        g.flinksCanvas.style.top = `${kLeftDivTop + 1}px`
        g.flinksCanvas.style.width = `${g.readingManager.isFullScreen ? window.innerWidth : g.readingManager.docWidth * 2 + kMiddleGap}px`
        g.flinksCanvas.style.height = `${screenHeight - kLeftDivTop - 1}px`
   
        g.flinksCanvas.style.display = 'flex'



        var dpr = window.devicePixelRatio || 1
        // Get the size of the canvas in CSS pixels.
        var canvasRect = g.flinksCanvas.getBoundingClientRect()
        g.flinksCanvas.width = canvasRect.width * dpr
        g.flinksCanvas.height = canvasRect.height * dpr
    
        g.flinksCtx.scale(dpr, dpr)

        g.readingManager.changesInReadingModeExist = true


        const canvasTopDiv = document.getElementById('middle-canvas-topDiv')
        canvasTopDiv.style.position = 'absolute'
        canvasTopDiv.style.left = `${g.readingManager.docWidth}px`
        canvasTopDiv.style.top = 0
        canvasTopDiv.style.width = `${kMiddleGap}px`
        canvasTopDiv.style.height = `${kLeftDivTop + 1}px`
        // canvasTopDiv.style.backgroundColor = 'yellow'
        canvasTopDiv.style.zIndex = 21
        canvasTopDiv.style.display = 'flex'

        const middleSpaceDiv = document.getElementById("middle-space-div")

        middleSpaceDiv.style.left = `${g.readingManager.docWidth}px`
        middleSpaceDiv.style.top = '60px'
        middleSpaceDiv.style.width = `${kMiddleGap}px`
        middleSpaceDiv.style.bottom = 0
        middleSpaceDiv.style.display = 'flex'


      //  this.showMiddleArrow()

    

    }



    hideMiddleCanvas(){
        if(g.flinksCanvas){
            g.flinksCanvas.style.display = 'none'
        }

        const canvasTopDiv = document.getElementById('middle-canvas-topDiv')
        canvasTopDiv.style.display = 'none'

        const middleSpaceDiv = document.getElementById("middle-space-div")
        middleSpaceDiv.style.display = 'none'


    }


    getCurrentDocTopOffset() {
        
        if (g.readingManager.mainDocType === 'c') {
            return this.currentDocTopPanelShowing ? 50 : 0
        }

        const parent = document.getElementById("CurrentDocument");
        const child = document.getElementById("CurrentDocumentMainDiv");

      
        const parentRect = parent.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();

   
        return childRect.top - parentRect.top + parent.scrollTop;
 
    }


    getRightDocTopOffset(noteData) {
        if (noteData.docType === 'c') {
            return noteData.currentDocTopPanelShowing ? 50 : 0
        }
        
        const parent = noteData.scrollDiv
        const child = getPresentationDivFrom(parent)

      
        const parentRect = parent.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();

  
        return childRect.top - parentRect.top + parent.scrollTop;
 
    }

    // getRightDocTopPanelHeight(noteData){
    //     return noteData.currentDocTopPanelShowing ? 50 : 0
    // }



    toggleFlinksList = (dontCloseOthers = false) => {
        if(!dontCloseOthers)this.closeAllExcept(this.toggleFlinksList)
        if(this.isFlinksListOpen){
            this.closeFlinksList()
        }else{
            this.openFlinksList()
        }
    }

    openFlinksList = () => {
        const kMaxListWidth = 600
        const isFullscreenList = kMaxListWidth > window.innerWidth 
        const iconPaths = g.iconsInfo.iconPaths
        const flinksListContainerDiv = document.getElementById("LinksListContainerDiv")
        const flinksContainerWidth = isFullscreenList ? window.innerWidth : kMaxListWidth 
        flinksListContainerDiv.style.top = (kLeftDivTop + 1) + 'px'
        flinksListContainerDiv.style.width = `${isFullscreenList ? window.innerWidth : kMaxListWidth}px`
        flinksListContainerDiv.style.maxHeight = `${window.innerHeight - kLeftDivTop }px`
        
        const leftOffset = this.getMainLeftOffset()
        
        if(g.isMobileMode && isFullscreenList){
            flinksListContainerDiv.style.left = `${-leftOffset}px`
            flinksListContainerDiv.style.right = '0px'
        }else if(g.isMobileMode){
            if(leftOffset >=0){
                flinksListContainerDiv.style.left = ''
                flinksListContainerDiv.style.right = '0px'
            }else{
                flinksListContainerDiv.style.left = `${-leftOffset}px`
                flinksListContainerDiv.style.right = ''
            }
        }else{
            flinksListContainerDiv.style.left = `${g.readingManager.docWidth + kMiddleGap / 2 - flinksContainerWidth / 2}px`
            flinksListContainerDiv.style.right = ''
        }

        const topRowContainer = document.getElementById("LinksListTopRow")
        
        
        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
        
        const flinksData = g.readingManager.currentConnection
        if (!flinksData || !flinksData.activeFlinks) return
                
        const modificationMessage = document.getElementById("LinksListModificationMessage")
        const flinksWereModified = flinksData.flinksWereModifiedOnLeftSide || flinksData.flinksWereModifiedOnRightSide
        modificationMessage.style.display = flinksWereModified ? 'flex' : 'none'
        const originalLinksButton = document.getElementById("LinksListOriginalLinksButton")
        const originalLinksRightSpacer = document.getElementById("LinksListOriginalLinksSpacer")
        originalLinksButton.style.display = flinksWereModified ? 'flex' : 'none'
        originalLinksRightSpacer.style.display = flinksWereModified ? 'flex' : 'none'


        const topRowLeftContainer = document.getElementById("LinksListTopRowLeftSortButtonContainer")
        const topRowRightContainer = document.getElementById("LinksListTopRowRightSortButtonContainer")


        if(this.sortInRightDoc){
            topRowLeftContainer.classList.remove("FlinksListSelectedSide")
            topRowRightContainer.classList.add("FlinksListSelectedSide")
        }else{
            topRowRightContainer.classList.remove("FlinksListSelectedSide")
            topRowLeftContainer.classList.add("FlinksListSelectedSide")

        }


        flinksListContainerDiv.style.display = 'flex'

        const firstDocType = g.readingManager.mainDocType
        const secondDocType = noteData.docType
        
        const shouldShowTopRow = firstDocType === 'h' && secondDocType === 'h'
        topRowContainer.style.display = shouldShowTopRow ? 'flex' : 'none'



        let foundBrokenLinks = false
        let foundLinksOutOfBounds = false



        for(const flink of flinksData.activeFlinks){
            const isFlinkOutOfBounds = flink.leftEndOutOfBounds || flink.rightEndOutOfBounds
            const isBroken = flink.leftSideIsBroken || flink.rightSideIsBroken
            
            if(isBroken){
                foundBrokenLinks = true
            }

            if(isFlinkOutOfBounds){
                foundLinksOutOfBounds = true
            }

        }

        let topRowEndSpacerWidth = 0
        if(foundBrokenLinks)topRowEndSpacerWidth += 50
        if(foundBrokenLinks || foundLinksOutOfBounds)topRowEndSpacerWidth += 30



        if(shouldShowTopRow){
            removeAllChildren(topRowLeftContainer)
    
            const leftSortButton = createOneSVGIconComponent(topRowLeftContainer,g.iconsInfo.svgIcons.triangleIcon,'','LinksListSortButton')
        
            leftSortButton.addEventListener('click',() => {
                this.sortInRightDoc = false
                this.openFlinksList()
            })
    
            
            removeAllChildren(topRowRightContainer)
            
            const rightSortButton = createOneSVGIconComponent(topRowRightContainer,g.iconsInfo.svgIcons.triangleIcon,'','LinksListSortButton')
        
            rightSortButton.addEventListener('click',() => {
                this.sortInRightDoc = true
                topRowRightContainer.classList.add("FlinksListSelectedSide")
                this.openFlinksList()
            })
    
            const topSpacer = document.getElementById("LinksListTopRowMiddleSpacer")
            topSpacer.style.width = '42px'
    
            const topEndSpacer = document.getElementById("LinksListTopRowEndSpacer")
            topEndSpacer.style.width = `${topRowEndSpacerWidth}px`

        }


        const flinksScrollDiv = document.getElementById("FlinksScrollDiv")
        flinksScrollDiv.style.paddingTop = shouldShowTopRow ? '5px' : '30px'
        removeAllChildren(flinksScrollDiv)
       

        
        const unsortedLinks =  flinksData.activeFlinks

        let links
        if(this.sortInRightDoc){
            links = unsortedLinks.sort((a,b) => {
                const rightEndA = a.rightEnds[0]
                const rightEndB = b.rightEnds[0]
                return rightEndA.index - rightEndB.index
            })
        }else{
            links = unsortedLinks.sort((a,b) => {
                const leftEndA = a.leftEnds[0]
                const leftEndB = b.leftEnds[0]
                return leftEndA.index - leftEndB.index
            })
        }
        
        


        



        let leftText
        let rightText
     
        if(firstDocType === 'h'){
            const firstPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
            leftText = getTextFromDiv(firstPresentationDiv) 

        }


        const rightScrollDiv = noteData.scrollDiv
        if(secondDocType === 'h'){
            const rightPresentationDiv = getPresentationDivFrom(rightScrollDiv)
            rightText = getTextFromDiv(rightPresentationDiv) 

        }



        




        for(const flink of links){

         
            const isFlinkOutOfBounds = flink.leftEndOutOfBounds || flink.rightEndOutOfBounds

            const shouldShowDeleteButton = isFlinkOutOfBounds || flink.leftSideIsBroken || flink.rightSideIsBroken

            const shouldShowFixButton = flink.leftSideIsBroken || flink.rightSideIsBroken
            
            if(shouldShowFixButton){
                foundBrokenLinks = true
            }

            if(isFlinkOutOfBounds){
                foundLinksOutOfBounds = true
            }



            const leftEnd = flink.leftEnds[0]
            const rightEnd = flink.rightEnds[0]

            
            
            const row = document.createElement('div')
            row.className = "FlinksListOneRow"
            flinksScrollDiv.appendChild(row)
            
            const leftDiv = document.createElement('div')
            if(firstDocType === 'h'){
                const leftLine = leftText.substring(leftEnd.index,leftEnd.index + leftEnd.length)
                leftDiv.className = "FlinkOneEndContainer"
                if(flink.leftSideIsBroken || flink.leftEndOutOfBounds){
                    leftDiv.classList.add("FlinkOneEndContainerBroken")
                }
                row.appendChild(leftDiv)
                leftDiv.textContent = flink.leftEndOutOfBounds ? '...' : leftLine.replace('\n',' ')
                leftDiv.addEventListener('click',(e) => {
                    e.stopPropagation()
                    g.readingManager.scrollMainDocToShowFlink(flink)
                })
            }else if(firstDocType === 'c'){
                leftDiv.className = "FlinkPointCircle"
                leftDiv.style.backgroundColor = flinksData.color
                row.appendChild(leftDiv)
                leftDiv.addEventListener('click', (e) => {
                    e.stopPropagation()
                    g.readingManager.moveLeftCollageToCenterTheDot(flink, kLeftDivTop)
                })
            }
            
            const middleLineContainerDiv = document.createElement('div')
            middleLineContainerDiv.className = "FlinksMiddleLineContainerDiv"
            const middleLineDiv = document.createElement('div')
            middleLineDiv.className = "FlinksMiddleLineDiv"
            middleLineDiv.style.backgroundColor = flinksData.color
            middleLineDiv.style.height = '2px'
            middleLineContainerDiv.append(middleLineDiv)
            row.appendChild(middleLineContainerDiv)

            
            const rightDiv = document.createElement('div')
            if(secondDocType === 'h'){
                const rightLine = rightText.substring(rightEnd.index,rightEnd.index + rightEnd.length)
                rightDiv.className = "FlinkOneEndContainer"
                if(flink.rightSideIsBroken || flink.rightEndOutOfBounds){
                    rightDiv.classList.add("FlinkOneEndContainerBroken")
                }
                row.appendChild(rightDiv)
                rightDiv.textContent = flink.rightEndOutOfBounds ? '...' : rightLine.replace('\n',' ')
            
                rightDiv.addEventListener('click',(e) => {
                    e.stopPropagation()
                    g.readingManager.scrollRightDocToShowFlink(flink,noteData)
                })
            
            }else if(secondDocType === 'c'){
                rightDiv.className = "FlinkPointCircle"
                rightDiv.style.backgroundColor = flinksData.color
                row.appendChild(rightDiv)
                rightDiv.addEventListener('click', (e) => {
                    e.stopPropagation()
                    g.readingManager.moveRightCollageToCenterTheDot(flink, kLeftDivTop)
                })
            }

            const smallFixButtonContainer = document.createElement('div')
            smallFixButtonContainer.style.width = '50px'
            smallFixButtonContainer.style.boxSizing = 'border-box'
            smallFixButtonContainer.style.paddingLeft = '8px'
            smallFixButtonContainer.style.paddingRight = '8px'
            smallFixButtonContainer.style.display = foundBrokenLinks ? 'flex' : 'none'

            if(shouldShowFixButton){
                const smallFixButton = document.createElement('div')
                smallFixButton.className = "ActionButton"
                smallFixButton.textContent = "Fix"
                smallFixButtonContainer.appendChild(smallFixButton)
                smallFixButton.addEventListener('click',(e) => {
                    e.stopPropagation()
                    
                    g.readingManager.fixOneBrokenLink(flink)
                    this.openFlinksList()
                    this.updateCurrentDocExportButton()
                })
            }

            row.appendChild(smallFixButtonContainer)


            const deleteButtonContainer = document.createElement('div')
            deleteButtonContainer.className = "DeleteFlinkButton"
            deleteButtonContainer.style.display = foundLinksOutOfBounds || foundBrokenLinks ? 'flex' : 'none'
            
            if(shouldShowDeleteButton){
                const deleteButton = createOneSVGIconComponent(deleteButtonContainer,g.iconsInfo.svgIcons.bucketIcon,'','DeleteFlinkButton')

                deleteButton.addEventListener('click',(e) => {
                    e.stopPropagation()
                    

                    g.readingManager.deleteOneFlink(flink)
                    this.openFlinksList()
                    this.updateCurrentDocExportButton()

                })
                deleteButton.classList.add('OpacityResponsiveButton')

            }

            row.appendChild(deleteButtonContainer)



        }

        this.limitFlinksScrollDivHeight(flinksListContainerDiv, flinksScrollDiv)

        this.isFlinksListOpen = true


    }


    // Old WebKit lays out flex children against the container's unclamped
    // content height when the container is only constrained by max-height,
    // so the scroll div must be capped explicitly to keep the rows inside.
    limitFlinksScrollDivHeight = (containerDiv, scrollDiv) => {
        const availableHeight = window.innerHeight - kLeftDivTop - 1 - g.adminBarHeight
        let otherRowsHeight = 0
        for (const child of containerDiv.children) {
            if (child === scrollDiv) continue
            const style = window.getComputedStyle(child)
            if (style.display === 'none') continue
            otherRowsHeight += child.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
        }
        scrollDiv.style.maxHeight = `${Math.max(0, availableHeight - otherRowsHeight)}px`
    }

    fixBrokenFlinks = (e) => {
        g.readingManager.fixBrokenFlinks()
        this.openFlinksList()

    }

    closeFlinksList = () => {
        const listContainer = document.getElementById("LinksListContainerDiv")
        listContainer.style.display = 'none'
        this.isFlinksListOpen = false
    }

 
    

    cleanCommentsDiv(commentsDiv) {
        if (!commentsDiv) return
        while (commentsDiv.firstChild) {
            commentsDiv.firstChild.remove()
        }  
    }

    getComments = async (commentsDiv, commentsUrl, commentsTitle, noCommentsMessage, listenersOwner, leaveCommentUrl, replyLabel, leaveCommentLabel, page = 1, loadMoreLabel = '') => {
        if (page === 1) {
            listenersOwner.commentsDiv = commentsDiv
            listenersOwner.commentsUrl = commentsUrl
            listenersOwner.currentCommentsPage = 1
            listenersOwner.allItemsLoaded = false
            listenersOwner.comments = []
            listenersOwner.commentsTitle = commentsTitle
            listenersOwner.noCommentsMessage = noCommentsMessage
            listenersOwner.leaveCommentUrl = leaveCommentUrl
            listenersOwner.commentsReplyLabel = replyLabel
            listenersOwner.commentsLeaveLabel = leaveCommentLabel
            listenersOwner.loadMoreLabel = loadMoreLabel
        }
        
        if(listenersOwner.allItemsLoaded)return
       

        let finalCommentsUrl


        if (commentsUrl.includes('?')) {
            finalCommentsUrl = commentsUrl + '&page=' + page + '&order=asc'
       } else {
           finalCommentsUrl = commentsUrl + '?page=' + page + '&order=asc'
       }


        if (page > 1) {
            listenersOwner.isLoadingMore = true
        }

        const result = await fetchWebPage(finalCommentsUrl)

        if (!result) {
            showToastMessage('Something went wrong')
            return null
        }
        
        const {text,error} = result
        if (error) {
            showToastMessage('Error:' + error)
            return
        }

        const parsedResponse = JSON.parse(text)

        if (!parsedResponse || !Array.isArray(parsedResponse.comments)) {
            showToastMessage('Something went wrong')
            return
        }

        const jsonArray = parsedResponse.comments

        listenersOwner.currentPage = page
        listenersOwner.isLoadingMore = false
        listenersOwner.comments = listenersOwner.comments.concat(jsonArray)
        listenersOwner.allItemsLoaded = listenersOwner.comments.length >= parsedResponse.total


        let parents = listenersOwner.comments.filter(item => !!item && item.parent == 0)
        const notParents = listenersOwner.comments.filter(item => !!item && item.parent != 0)

        parents = parents.sort((a,b) => a.date.localeCompare(b.date))



        parents.forEach((item) => {
            item.indentationLevel = 0
            this.findChildren(item,notParents)
        })


        const finalListOfComments = []
        parents.forEach((item) => {
            this.flattenListOfComments(item,finalListOfComments)
        })

        
        const savedScrollTop = commentsDiv.scrollTop

        this.cleanCommentsDiv(commentsDiv)
       
        const refreshComments = () => {
            this.getComments(commentsDiv, commentsUrl, commentsTitle, noCommentsMessage, listenersOwner, leaveCommentUrl, replyLabel, leaveCommentLabel, 1, loadMoreLabel)
        }

        const openPopupFn = (url) => {
            this.openCommentPopup(url, refreshComments)
        }

        if (commentsTitle && finalListOfComments.length) {
            const h2 = document.createElement('h2')
            h2.className = 'comments-title'
            h2.textContent = commentsTitle
            commentsDiv.appendChild(h2)

        } else if(noCommentsMessage) {
            const span = document.createElement('span')
            span.className = 'no-comments-text'
            span.textContent = noCommentsMessage
            commentsDiv.appendChild(span)
        }

        if (leaveCommentUrl && leaveCommentLabel) {
            const leaveBtn = document.createElement('button')
            leaveBtn.className = 'swp-leave-comment-btn'
            leaveBtn.textContent = leaveCommentLabel
            leaveBtn.addEventListener('click', () => openPopupFn(leaveCommentUrl))
            commentsDiv.appendChild(leaveBtn)
        }

        finalListOfComments.forEach((item) => {

            const {author_name, author_avatar_urls, date, content, indentationLevel} = item
            const commentReplyUrl = item['reply-url']

            const html = sanitizeHtml(content.rendered)

            this.addCommentToDiv(commentsDiv, author_avatar_urls, author_name, html, date, indentationLevel, commentReplyUrl, replyLabel, openPopupFn)


            
        })

        commentsDiv.scrollTop = savedScrollTop



        if (listenersOwner.loadMoreLabel && !listenersOwner.allItemsLoaded) {
            const loadMoreBtn = document.createElement('button')
            loadMoreBtn.className = 'swp-load-more-btn'
            loadMoreBtn.textContent = listenersOwner.loadMoreLabel
            loadMoreBtn.addEventListener('click', () => {
                this.getComments(listenersOwner.commentsDiv, listenersOwner.commentsUrl, listenersOwner.commentsTitle,
                    listenersOwner.noCommentsMessage, listenersOwner, listenersOwner.leaveCommentUrl,
                    listenersOwner.commentsReplyLabel, listenersOwner.commentsLeaveLabel,
                    listenersOwner.currentPage + 1, listenersOwner.loadMoreLabel)
            })
            commentsDiv.appendChild(loadMoreBtn)
        }
        


    }


    findChildren = (parent,restArray) => {
      
        parent.children = restArray.filter((item) => item.parent == parent.id).sort((a,b) => a.date.localeCompare(b.date))
        
        parent.children.forEach((item => {
            item.indentationLevel = parent.indentationLevel + 1
            this.findChildren(item,restArray)
        }))
        
    }

    flattenListOfComments = (item, finalArray) => {

        finalArray.push(item)
        item.children.forEach((child) => {
            this.flattenListOfComments(child,finalArray)
        })
    }

    addCommentToDiv = (commentsDiv, author_avatar_urls, author_name, html, date, indentationLevel, commentReplyUrl, replyLabel, openPopupFn) => {
        const oneCommentDiv = document.createElement('div')
        oneCommentDiv.className = 'OneCommentContainerDiv'
        oneCommentDiv.style.marginLeft = `${20 * indentationLevel}px`

        const topRowDiv = document.createElement('div')
        topRowDiv.className = 'OneCommentTopRow'

        const avatarUrl = author_avatar_urls ? sanitizeUrl(author_avatar_urls['48']) : ''
        if (avatarUrl) {
            const avatarImg = document.createElement('img')
            avatarImg.className = 'OneCommentAvatar'
            avatarImg.src = avatarUrl
            topRowDiv.appendChild(avatarImg)
        }

        const nameColumnDiv = document.createElement('div')
        nameColumnDiv.className = 'OneCommentNameColumn'

        const authorNameSpan = document.createElement('span')
        authorNameSpan.className = 'OneCommentAuthorName'
        authorNameSpan.textContent = stripHtmlTags(author_name)

        const dateSpan = document.createElement('span')
        dateSpan.className = 'OneCommentDate'
        dateSpan.textContent = isoToHumanReadableDate(date)

        nameColumnDiv.appendChild(authorNameSpan)
        nameColumnDiv.appendChild(dateSpan)
        topRowDiv.appendChild(nameColumnDiv)

        const contentDiv = document.createElement('div')
        contentDiv.className = 'OneCommentContent'
        contentDiv.innerHTML = html

        oneCommentDiv.appendChild(topRowDiv)
        oneCommentDiv.appendChild(contentDiv)

        if (commentReplyUrl && replyLabel && openPopupFn) {
            const replyBtn = document.createElement('button')
            replyBtn.className = 'swp-reply-btn'
            replyBtn.textContent = replyLabel
            replyBtn.addEventListener('click', () => openPopupFn(commentReplyUrl))
            oneCommentDiv.appendChild(replyBtn)
        }

        commentsDiv.appendChild(oneCommentDiv)
    }

    openCommentPopup = (url, onSuccess, pageOrigin) => {
        const overlay = document.createElement('div')
        overlay.className = 'swp-comment-popup-overlay'

        const popup = document.createElement('div')
        popup.className = 'swp-comment-popup'

        const closeBtn = document.createElement('button')
        closeBtn.className = 'swp-comment-popup-close'
        closeBtn.textContent = '✕'
        closeBtn.addEventListener('click', () => overlay.remove())

        popup.appendChild(closeBtn)

        let formOrigin
        try { formOrigin = new URL(url).origin } catch (e) { formOrigin = null }

        if (formOrigin && pageOrigin && formOrigin !== pageOrigin) {
            const warning = document.createElement('div')
            warning.className = 'swp-comment-popup-origin-warning'
            warning.textContent = `Submitting to: ${new URL(url).hostname}`
            popup.appendChild(warning)
        }

        const iframe = document.createElement('iframe')
        iframe.src = url
        iframe.className = 'swp-comment-popup-iframe'

        popup.appendChild(iframe)
        overlay.appendChild(popup)
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
        document.body.appendChild(overlay)

        const handler = (event) => {
            if (event.data && event.data.type === 'swp-comment-submitted') {
                overlay.remove()
                window.removeEventListener('message', handler)
                if (onSuccess) onSuccess()
            }
        }
        window.addEventListener('message', handler)
    }

    

    updateLeftDocumentPanels = () => {
        const topPanel = document.getElementById("CurrentDocumentTopPanel")
        const dropdownMenuDiv = document.getElementById("CurrentDocumentDropDownMenu")
        const topPanelLogoLink = document.getElementById("CurrentDocumentTopPanelLogoLink")
        const topPanelOptionsRow = document.getElementById("CurrentDocumentTopPanelOptionsRow")
        const sandwichButtonDiv = document.getElementById("LeftSandwichButton")
       
        const allDivs = {
            topPanel,
            dropdownMenuDiv,topPanelLogoLink,topPanelOptionsRow,sandwichButtonDiv
        }

        this.updateDocumentPanels(allDivs,this)



    }


    updateMainDocumentPadding = () => {
        const mainPresentationDiv = document.getElementById("CurrentDocumentMainDiv")



        const mainPadding = g.pdm.getMainDocumentPadding()

        mainPresentationDiv.style.paddingLeft = `${mainPadding}px`
        mainPresentationDiv.style.paddingRight = `${mainPadding}px`



        const headerDiv = document.getElementById("CurrentDocumentHeader")
        headerDiv.style.paddingLeft = `${mainPadding}px`
        headerDiv.style.paddingRight = `${mainPadding}px`

    

        const currentDocumentTopBar = document.getElementById("CurrentDocumentTopBar")
        currentDocumentTopBar.style.height = kLeftDivTop + 'px'
        currentDocumentTopBar.style.paddingLeft = `${mainPadding}px`

        const belowContentCommentsDiv = document.getElementById("CurrentDocumentBelowContentComments")
        belowContentCommentsDiv.style.paddingLeft = `${mainPadding}px`
        belowContentCommentsDiv.style.paddingRight = `${mainPadding}px`

    }


    updateMainDocumentCommentsSectionMargins = () => {
        const belowContentCommentsDiv = document.getElementById("CurrentDocumentBelowContentComments")
        if(g.readingManager.isFullScreen && !g.isMobileMode && g.readingManager.mainDocPanels && g.readingManager.mainDocPanels.sidebarPanel){
            if(g.readingManager.mainDocPanels.sidebarPanel.side === 'left'){
                belowContentCommentsDiv.style.marginLeft = `${window.innerWidth * 0.2}px` 
                belowContentCommentsDiv.style.marginRight = 0 
            }else{
                belowContentCommentsDiv.style.marginLeft = 0
                belowContentCommentsDiv.style.marginRight = `${window.innerWidth * 0.2}px`
            }
        }else{
            belowContentCommentsDiv.style.marginLeft = 0
            belowContentCommentsDiv.style.marginRight = 0 
        }

    }

    updateRightDocumentPanels = (noteData) => {
        if(noteData.docType !== 'h')return
        
        const docId = noteData.docId
        const topPanel = document.getElementById("DocumentTopPanel" + docId)
        const dropdownMenuDiv = document.getElementById("DocumentDropDownMenu" + docId)
        const topPanelLogoLink = document.getElementById("DocumentTopPanelLogoLink" + docId)
        const topPanelOptionsRow = document.getElementById("DocumentTopPanelOptionsRow" + docId)
        const sandwichButtonDiv = document.getElementById("SandwichButton" + docId)
       

        const allDivs = {
            topPanel,
            dropdownMenuDiv,topPanelLogoLink,topPanelOptionsRow,sandwichButtonDiv
        }

        this.updateDocumentPanels(allDivs,noteData)

      

    }






    updateDocumentPanels = (allDivs,dataObject) => {
        const {topPanel,
            dropdownMenuDiv,topPanelLogoLink,topPanelOptionsRow,sandwichButtonDiv
        } = allDivs


  

        if(dataObject.currentDocTopPanelShowing){

            while(dropdownMenuDiv.firstChild){
                dropdownMenuDiv.removeChild(dropdownMenuDiv.firstChild)
            }

            if(dataObject.docTopPanelLinks && dataObject.docTopPanelLinks.length){

                const allDivs = {topPanelDiv:topPanel,topPanelLogoLink,topPanelOptionsRow,dropdownMenuDiv,sandwichButtonDiv}

                this.addLinksToTopPanel(dataObject.docTopPanelLinks,dataObject.docTopPanelTextColor,allDivs,dataObject)
            }

        }


    }


    toggleLeftDropDownMenu = () => {
        

        this.isShowingLeftDropdownMenu = !this.isShowingLeftDropdownMenu
        const dropdownMenu = document.getElementById("CurrentDocumentDropDownMenu")
        dropdownMenu.style.display = this.isShowingLeftDropdownMenu ? 'flex' : 'none'

    }

    toggleRightDropDownMenu = (e) => {
        if (e) {
            e.stopPropagation()   
        }
        const noteData = g.readingManager.rightNotesData[g.readingManager.selectedRightDocIndex]
        
        noteData.isShowingDropdownMenu = !noteData.isShowingDropdownMenu
        const dropdownMenu = document.getElementById("DocumentDropDownMenu" + noteData.docId)
        
        dropdownMenu.style.display = noteData.isShowingDropdownMenu ? 'flex' : 'none'

    }






     createOneIconComponent(parent,iconPath,componentId,width = 24,height = 0){

        createOneIconComponent(parent,iconPath,componentId,'Reader-OneIconComponent',width,height)
     }

     createOneSVGIconComponent(parent,svgString,componentId){

        createOneSVGIconComponent(parent,svgString,componentId,'Reader-OneIconComponent')
     }
     

    async updateCurrentDocExportButton() {
        const currentDocumentExportButton = document.getElementById("CurrentDocumentExportButton")

        let changesExist = false
        for (const flinksData of g.readingManager.connections) {
            if (flinksData.flinksWereModifiedOnLeftSide || flinksData.flinksWereModifiedOnRightSide) {
                changesExist = true
                break
            }
        }

        currentDocumentExportButton.style.display = changesExist ? 'flex' : 'none'
        
    }

    updateDocumentImageWidths(notePresentationDiv) {

        const images = notePresentationDiv.getElementsByTagName('img')
 
        let textColumnWidth = getTextColumnWidth()
  
            


        for(let i = 0; i < images.length; i++){
            const image = images.item(i)
            
          
            if (image['data-width']) {
                image.style.width =  Math.min(image['data-width'] , textColumnWidth) + 'px'  
            } else {
                image.style.width = '100%'
            }
            image.style.height = 'auto'

           
        
           
        }


        const iframePlaceholders = notePresentationDiv.getElementsByClassName('iframe-placeholder')


        for (let i = 0; i < iframePlaceholders.length; i++) {
            const placeholder = iframePlaceholders.item(i)
       
            const height = textColumnWidth * placeholder['data-ratio']
            placeholder.style.width = textColumnWidth + 'px'
            placeholder.style.height = height + 'px'

            const iframe = placeholder.querySelector('iframe')
            if (iframe) {
                iframe.style.width = textColumnWidth + 'px'
                iframe.style.height = height + 'px'
            }

        }

    }


    hidePanelsOfCurrentDocument() {

        const topPanelDiv = document.getElementById("CurrentDocumentTopPanel")
        const bottomPanelDiv = document.getElementById("CurrentDocumentBottomPanel")
         
        this.currentDocTopPanelShowing = false
        this.currentDocBottomPanelShowing = false
        
        topPanelDiv.style.display = 'none'
        bottomPanelDiv.style.display = 'none'
       
    }


    showMainDocSpinner() {
      const spinner = document.getElementById('mainDocSpinner');
      spinner.style.display = 'block';
      
    }
  
    hideMainDocSpinner() {
      const spinner = document.getElementById('mainDocSpinner');
      spinner.style.display = 'none';
    }

    getMainLeftOffset(){
        const allDocumentsContainer = document.getElementById("AllDocumentsContainer")
        const rect = allDocumentsContainer.getBoundingClientRect();
        return rect.left
    }


    getMainDocumentPadding(){
        const screenWidth = window.innerWidth
        const mainPadding = this.isPaddingOn && !g.isMobileMode && 
        g.readingManager.isFullScreen && (!g.readingManager.mainDocPanels || !g.readingManager.mainDocPanels.sidebarPanel) 
         ? screenWidth * 0.2 : kDefaultPadding

        return mainPadding
    }

   
}


export default PopupDocumentManager