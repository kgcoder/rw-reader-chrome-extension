/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { kLeftDivTop, kMiddleGap, kRightDivTopBarHeight, kRightDocsTabRowHeight } from "./PopupDocumentManager.js"
import g from "./Globals.js"
import { addTransparencyToHexColor, escapeRegExp, getIndexAndLengthOfSelection, getPresentationDivFrom, getShortHash, getTextFromDiv, getTextNodesArrayFromDiv, isDotInsideFrame, isSubstringUniqueInText, removeAllChildren, showToastMessage, timestamp } from "./helpers.js";
import FloatingLink from "./models/FloatingLink.js";
import CollageViewer from "./CollageViewer.js";
import { loadStaticContentFromUrl } from "./parsers/ParsingManager.js";
import FLTextEnd from "./models/FLTextEnd.js";
import FLPointEnd from "./models/FLPointEnd.js";
import { maxFlinksNumberBeforeOptimization } from "./constants.js";
import { showMultipleLinksPopup } from "./MultipleLinksPopupManager.js";
const kFlinkHorizontalThickness = 5

let now,
    dt,
    last = timestamp();

class ReadingManager {
    isReading = false
    isViewingConnectedDocuments = false
    mainDocData = null
    mainDocId = null
    mainCollageViewer = null
    mainDocType = null
    isFullScreen = true
    isSelectingFlinkXY = false
    connections = []
    currentConnection = null
    rightNotesData = []
    rightScrollDivs = []
    rightMainRowDivs = []
    rightTabDivs = []

    areLeftFlinksPositionedForFullscreen = true

    leftScrollTimeout = null
    rightScrollTimeout = null
    
    selectedRightDocIndex = 0
    changesInReadingModeExist = false
    partialLeftLink = null
    partialRightLink = null
    docWidth = 0
    rightDocTop = 0
    flinkStyle = 'thin' //'thin', 'thick', 'invisible'



    frame = () => {
    //canvas.style.cursor = 'none'

    now = timestamp();

    dt = Math.min(1, (now - last) / 1000); // duration in seconds
        
    last = now


       
    if(this.mainCollageViewer){
        this.mainCollageViewer.frame(dt)
    }

    if(!this.isFullScreen){
        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        if(noteData.collageViewer){
            noteData.collageViewer.frame(dt)
        }
    }
        
        
        requestAnimationFrame(this.frame);
        
}


     removeFlinksFromMainDiv(){
        const canvases = document.getElementsByClassName('leftDocFlinkCanvas')
        while(canvases.length > 0) {
            canvases[0].remove();  // Remove the first element repeatedly until none are left
        }

        if(this.mainDocType !== 'h')return
        
        for(let flinksData of this.connections){
            if(!flinksData.activeFlinks)continue
            for(let flink of flinksData.activeFlinks){
                flink.isLeftSideDrawn = false
            }
        }

    }

    removeFlinksFromRightDiv() {
        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        if(!noteData)return
        const div = noteData.scrollDiv
        if(!div)return
        const presentationDiv = getPresentationDivFrom(div)
        if(!presentationDiv)return
        const canvases = presentationDiv.querySelectorAll('.rightDocFlinkCanvas')
        canvases.forEach(canvas => canvas.remove())


        if(!noteData || noteData.docType !== 'h')return

        const flinksData = this.currentConnection

        if(!flinksData || !flinksData.activeFlinks)return
       
        for(let flink of flinksData.activeFlinks){
            flink.isRightSideDrawn = false
        }

    }



    downloadAllPages = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        const uniqueUrls = [...new Set(g.readingManager.connections.map(con => con.url))];
            
            const filteredUrls = uniqueUrls.filter(url => {
                const index = g.readingManager.rightNotesData.findIndex(noteData => noteData.url === url)
                return index === -1
                
            })
         
        g.pdm.showMainDocSpinner()
        for (const url of filteredUrls) {
            await this.downloadOnePage(url, true)
        }
        g.pdm.hideMainDocSpinner()
            
        showToastMessage('All documents are loaded')

    }

    downloadOnePage = async (url, hideSpinner = false) => {
        if(!hideSpinner)g.pdm.showMainDocSpinner()
        const dataObject = await loadStaticContentFromUrl(url)

        if(!dataObject){
            showToastMessage("Something is wrong")
            if(!hideSpinner)g.pdm.hideMainDocSpinner()
            return
        }

        if(![1,2,3,5].includes(dataObject.docSubtype)){
            showToastMessage("Unsupported document format")
            if(!hideSpinner)g.pdm.hideMainDocSpinner()
            return
        }
    
        if (dataObject) {
            dataObject.docId = g.readingManager.rightNotesData.length
            g.readingManager.hideCurrentRightDoc()
            g.readingManager.rightNotesData.push(dataObject)
            
            let flinksData = g.readingManager.connections.find(con => con.url === url)
            if(!flinksData){

                let title
                let hash

                

                if(dataObject.docSubtype === 5){
                    title = dataObject.title

                    const svgMatch = dataObject.xmlString.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/)
                    if(svgMatch){
                        const svgText = svgMatch[0]
                        hash = getShortHash(svgText)
                    }

                }else{
                    const headerInfo = dataObject.headerInfo
                    title = headerInfo.h1Text

                    const div = document.createElement('div')
                    div.innerHTML = dataObject.html
                    const text = div.textContent
    
           
                    hash = getShortHash(text)
                }
                




                flinksData = {
                    url,
                    title,
                    flinks:[],
                    activeFlinks:[],
                    color:'red',
                    hash

                }

                g.readingManager.connections.push(flinksData)

                g.pdm.prepareConnectionsForDocument()
            }
            g.readingManager.currentConnection = flinksData
                    

            g.readingManager.addNewRightDocDivs()
            g.pdm.applyFontSizeToPresentationDivs()

            if (g.readingManager.isFullScreen) {
                g.pdm.toggleFullScreen()
            }
                        
                        
                        
                        

            g.pdm.showTab(g.readingManager.rightNotesData.length - 1)
            g.readingManager.redrawFlinks()

            g.pdm.applyFontSizeToPresentationDivs()

            g.readingManager.addListenerToCurrentRightDoc()

            g.readingManager.applyFlinksOnTheRight(false)

            const {total,count} = g.pdm.configureConnectionsCountOnInfoButton()


            if (count === total) {
                const downloadAllButton = document.getElementById("CurrentDocumentDownloadAllDocsButton")
                downloadAllButton.style.display = 'none'

            }

        }
        if(!hideSpinner)g.pdm.hideMainDocSpinner()
                
    }



    addNewRightDocDivs(){
        if(!g.readingManager.rightNotesData.length)return
        g.readingManager.selectedRightDocIndex = 0
        const rightTopBar = document.getElementById("RightDocumentsTopBar")
        rightTopBar.style.height = `${this.rightNotesData.length > 1  ? kLeftDivTop - kRightDocsTabRowHeight : kLeftDivTop}px`

        g.readingManager.rightDocTop = kRightDocsTabRowHeight + (this.rightNotesData.length > 1 ? kRightDivTopBarHeight : 0)

        const collectionDiv = document.getElementById("RightDocumentCollectionContainer")
        collectionDiv.style.width = `${this.docWidth}px`
        const lastIndex = g.readingManager.rightNotesData.length - 1

        const noteData = g.readingManager.rightNotesData[lastIndex]
        if (noteData.docType === 'h') {
            g.readingManager.addOneRightDivForHDoc(collectionDiv,g.readingManager.rightNotesData[lastIndex],lastIndex)
        } else if(noteData.docType === 'c') {
            this.addOneRightDivForCollage(collectionDiv,noteData,lastIndex)
            
        }
        g.readingManager.redrawAllTabs(true)
   
    }





    addOneRightDivForHDoc(collectionDiv, noteData, rightDocId) {
       
        noteData.docId = rightDocId
        const mainRowDiv = document.createElement('div')
        mainRowDiv.className = "DocumentMainRow"

        const leftPanelDiv = document.createElement('div')
        leftPanelDiv.id = 'DocumentLeftPanel' + rightDocId
        leftPanelDiv.className = "DocumentSidePanel theme-" + g.currentTheme
        leftPanelDiv.style.display = 'none'

        mainRowDiv.appendChild(leftPanelDiv)


        const div = document.createElement('div')
        // div.style.height = `${screenHeight - 2 * verticalMargin - 40}px`
         div.className = "DocumentColumn theme-" + g.currentTheme
         div.style.width = `${this.docWidth}px`

         const topPanelDiv = document.createElement('div')
         topPanelDiv.id = 'DocumentTopPanel' + rightDocId
         topPanelDiv.className = "DocumentTopPanel"

         const topPanelLogoLink = document.createElement('a')
         topPanelLogoLink.id = 'DocumentTopPanelLogoLink' + rightDocId
         topPanelLogoLink.className = "TopPanelLogoLink"
         topPanelLogoLink.href = '#'
         topPanelDiv.appendChild(topPanelLogoLink)

         const topPanelLogo = document.createElement('img')
         topPanelLogo.id = 'DocumentTopPanelLogo' + rightDocId
         topPanelLogo.src = ''
         topPanelLogo.width = '150px'
         topPanelLogo.height = '50px'
         topPanelLogoLink.appendChild(topPanelLogo)


         const topPanelTitle = document.createElement('span')
         topPanelTitle.id = 'DocumentTopPanelTitle' + rightDocId
         topPanelTitle.className = "TopPanelTitle"
         topPanelLogoLink.appendChild(topPanelTitle)

         const spacerDiv = document.createElement('div')
         spacerDiv.className = "spacer"
         topPanelDiv.appendChild(spacerDiv)

         const topPanelOptionsRow = document.createElement('div')
         topPanelOptionsRow.id = 'DocumentTopPanelOptionsRow' + rightDocId
         topPanelOptionsRow.className = "DocumentTopPanelOptionsRow"
         topPanelDiv.appendChild(topPanelOptionsRow)


        //sandwich
        const sandwichButtonDiv = document.createElement('div')
        sandwichButtonDiv.id = 'SandwichButton' + rightDocId
        sandwichButtonDiv.className = "SandwichButton"
        topPanelDiv.appendChild(sandwichButtonDiv)

   
        const line1Div = document.createElement('div')
        line1Div.className = "RightSandwichLine"
        sandwichButtonDiv.appendChild(line1Div)
        const line2Div = document.createElement('div')
        line2Div.className = "RightSandwichLine SandwichMiddleLine"
        sandwichButtonDiv.appendChild(line2Div)
        const line3Div = document.createElement('div')
        line3Div.className = "RightSandwichLine"
        sandwichButtonDiv.appendChild(line3Div)

        sandwichButtonDiv.addEventListener('click',g.pdm.toggleRightDropDownMenu)
         



       

        div.appendChild(topPanelDiv)

        const headerDiv = document.createElement('div')
        headerDiv.id = 'DocumentHeader' + rightDocId
        headerDiv.className = "HeaderDiv"
        headerDiv.style.paddingLeft = '20px'
        headerDiv.style.paddingRight = '20px'
         

         div.appendChild(headerDiv)




         const presentationDiv = document.createElement('div')
         presentationDiv.className = "RightDocumentPresentationDiv"
        // presentationDiv.style.width = `${this.docWidth}px`
         div.appendChild(presentationDiv)
         const textearea = document.createElement('textarea')
         textearea.className = "RightDocumentTextArea"
         div.appendChild(textearea)

         const bottomPanelDiv = document.createElement('div')
         bottomPanelDiv.className = "DocumentBottomPanel"
         bottomPanelDiv.id = 'DocumentBottomPanel' + rightDocId
         const bottomPanelRow = document.createElement('div')
         bottomPanelRow.className = "DocumentBottomPanelRow"
         bottomPanelRow.id = 'DocumentBottomPanelRow' + rightDocId

         bottomPanelDiv.appendChild(bottomPanelRow)

         const bottomPanelMessageDiv = document.createElement('div')
         bottomPanelMessageDiv.className = "DocumentBottomPanelBottomMessage"
         bottomPanelMessageDiv.id = 'DocumentBottomPanelBottomMessage' + rightDocId

         bottomPanelDiv.appendChild(bottomPanelMessageDiv)


      

         div.appendChild(bottomPanelDiv)

         
         
         
         const dropdownMenuDiv = document.createElement('div')
         dropdownMenuDiv.id = 'DocumentDropDownMenu' + rightDocId
         dropdownMenuDiv.className = "DocumentDropDownMenu"

         div.appendChild(dropdownMenuDiv)



         mainRowDiv.appendChild(div)

         noteData.scrollDiv = div



        const rightPanelDiv = document.createElement('div')
        rightPanelDiv.id = 'DocumentRightPanel' + rightDocId
        rightPanelDiv.className = "DocumentSidePanel theme-" + g.currentTheme
        rightPanelDiv.style.display = 'none'

        mainRowDiv.appendChild(rightPanelDiv)
         
        collectionDiv.appendChild(mainRowDiv)

        noteData.mainRowDiv = mainRowDiv



         g.noteDivsManager.removeEventListenersFromNote(div, noteData)
        
         const result = g.noteDivsManager.populateDivWithTextFromDoc(div,noteData.xmlString,noteData.url,true)
         if(result){
             const {isEditable,title,panels} = result
             noteData.isEditable = isEditable
             noteData.title = title
             noteData.panels = panels

         }
         g.noteDivsManager.addEventListenersToNote(div, noteData, rightDocId)


        
        mainRowDiv.style.display = rightDocId === this.selectedRightDocIndex ? 'flex' : 'none'



         



    }



    addOneRightDivForCollage(collectionDiv,noteData,rightDocId){
        const div = document.createElement('div')
        // div.style.height = `${screenHeight - 2 * verticalMargin - 40}px`
         div.className = "OneRightCollageContainer"
         div.style.width = `${this.docWidth}px`
       
         collectionDiv.appendChild(div)
         noteData.collageContainerDiv = div
        // this.rightMainRowDivs.push(div)


         const canvas = document.createElement('canvas')
         canvas.className = "OneCollageCanvas"
         //canvas.style.width = `${this.docWidth}px`

         div.appendChild(canvas)

         const leftX = g.readingManager.docWidth + kMiddleGap
         
         noteData.collageViewer = new CollageViewer(noteData.xmlString,noteData.url,rightDocId,rightDocId,canvas,leftX,kLeftDivTop,this.docWidth)
         //noteData.title = noteData.collageViewer.content ? noteData.collageViewer.content.title : 'Collage'




    }


    hideCurrentRightDoc = () => {
        if(!this.rightNotesData.length)return
        const noteData = this.rightNotesData[this.selectedRightDocIndex]


        let textContainer

        if(noteData.docType === 'h'){
            textContainer = noteData.mainRowDiv
        }else if(noteData.docType === 'c'){
            textContainer = noteData.collageContainerDiv
        }

        textContainer.style.display = 'none'
    }


    showTab = (index) => {


        const currentNoteData = this.rightNotesData[this.selectedRightDocIndex]
        if (currentNoteData.isShowingDropdownMenu) {
            g.pdm.toggleRightDropDownMenu()   
        }


        this.selectedRightDocIndex = index

        for(let i = 0; i< this.rightNotesData.length;i++){

            const noteData = this.rightNotesData[i]

            let textContainer

            if(noteData.docType === 'h'){
                textContainer = noteData.mainRowDiv
            }else if(noteData.docType === 'c'){
                textContainer = noteData.collageContainerDiv
            }


           // const textContainer = this.rightMainRowDivs[i]

            const tab = this.rightTabDivs[i]
            textContainer.style.display = index === i ? 'flex' : 'none'
            if(this.rightNotesData.length > 1){
                const span = tab.getElementsByClassName('RightDocumentTitle')[0]
                span.style.color = index === i ? 'rgba(37, 38, 39, 0.2)' : 'rgba(37, 38, 39, 0.5)'
    
                tab.style.backgroundColor = index === i ? 'rgba(37, 38, 39, 0.1)' : 'gray'
    
                tab.style.boxShadow = index === i ? 'none' : 'inset -1px 0 0 0 rgba(0, 0, 0, 0.3)';
            }

           
        }



        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        
        const flinksData = this.connections.find(data => data.url === noteData.url)
        this.currentConnection = flinksData ? flinksData : ({flinks:[]}) //should never be empty


        if(flinksData.flinksUpdateNeeded){
            g.readingManager.applyFlinksOnTheRight()
        }

        if(noteData.docType === 'h'){
            g.pdm.populatePanelsOfOneRightDoc()
        }

        const titleSpan = document.getElementById("RightDocumentTitleSpan")


        let title = noteData.title ?? ''
        if(noteData.collageViewer){
            if(noteData.collageViewer.content){
                title = noteData.collageViewer.content.title ?? ''
            }
        }



        titleSpan.innerHTML = title


  
        
        this.changesInReadingModeExist = true
        
   
    }

    removeFlinksFromMiddleCanvas() {
        g.flinksCtx.clearRect(0, 0, g.flinksCanvas.width, g.flinksCanvas.height)
    }

    drawFlinksOnMiddleCanvas(){

                  
        this.removeFlinksFromMiddleCanvas()
        if((this.mainDocType === 'h' && this.isFullScreen) || g.pdm.isShowingInfo || g.pdm.isLeftSourceCodeShowing)return

        if (!g.pdm.isOkToShowFlinks()) return
        
        if(!this.changesInReadingModeExist)return
        
        this.changesInReadingModeExist = false
          

        
       // if(!g.pdm.isOkToShowFlinks())return
        
        const isLeftText = this.mainDocType === 'h'


        
        const noteObj = this.rightNotesData[this.selectedRightDocIndex]

        const isRightText = noteObj ? noteObj.docType === 'h' : true

     



    
        
        const mainDocRightX = this.docWidth
        const rightMinX = mainDocRightX + kMiddleGap

        




    


        const mainDocScrollDiv = document.getElementById("CurrentDocument")
               

     if(isLeftText && !isRightText && noteObj.collageViewer && !!noteObj.collageViewer.viewport){
        this.drawTextToPointFlinks(noteObj)
        return
     } else if (!isLeftText && this.mainCollageViewer && !!this.mainCollageViewer.viewport) {
         this.drawAllPointsOnLeftCollage()
         if (isRightText) {
             this.drawPointToTextFlinks(noteObj)   
         } 
        return
    }else if(!isLeftText || !isRightText){
        this.drawPointToPointFlinks(noteObj)
        return
    }


    const secondDocScrollDiv = noteObj.scrollDiv


        let rightX = rightMinX

        const topPanelHeight = g.pdm.getCurrentDocTopOffset()
        const secondTopPanelHeight = g.pdm.getRightDocTopOffset(noteObj)

        
        if(!this.currentConnection.activeFlinks)return
        for(let flink of this.currentConnection.activeFlinks){
            if(flink.leftEndOutOfBounds || flink.rightEndOutOfBounds)continue

        
           
                let {leftTop,leftBottom} = flink// this.getLeftRectsTopAndBottom(presentationDiv, flink.leftRects, true, flink.color03, flink.leftSideIsBroken)
                
                leftTop += topPanelHeight - mainDocScrollDiv.scrollTop //+ kLeftDivTop
                leftBottom += topPanelHeight - mainDocScrollDiv.scrollTop// + kLeftDivTop


                leftBottom -= flink.bottomIndentHeight



            

                let {rightTop,rightBottom} = flink

                rightTop += secondTopPanelHeight - secondDocScrollDiv.scrollTop
                rightBottom += secondTopPanelHeight - secondDocScrollDiv.scrollTop

                rightTop += flink.topIndentHeight
                

              
                let leftY = (leftTop + leftBottom) / 2
                let rightY = (rightTop + rightBottom) / 2 

            
                const {leftStatus,rightStatus} = this.getFlinkStatus(leftY,rightY)

             


                if(this.flinkStyle !== 'invisible'){
                    //left part
                    g.flinksCtx.beginPath()
                    g.flinksCtx.fillStyle = flink.color05
                    g.flinksCtx.moveTo(mainDocRightX,leftTop)
                    g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                    g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftBottom)
                    g.flinksCtx.lineTo(mainDocRightX,leftBottom)
                    g.flinksCtx.closePath()
                    g.flinksCtx.fill()

                }


                if(flink.isSelected){
                    g.flinksCtx.lineWidth = 1
                    g.flinksCtx.strokeStyle = 'blue'
                    g.flinksCtx.stroke()
                }


                if(rightStatus !== "invisible" && this.flinkStyle !== 'invisible'){
                    //right part
                    g.flinksCtx.beginPath()
                    g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightTop)
                    g.flinksCtx.lineTo(rightX,rightTop)
                    g.flinksCtx.lineTo(rightX,rightBottom)
                    g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness,rightBottom)
                    g.flinksCtx.closePath()
                    g.flinksCtx.fill()

                }

                if(flink.isSelected){
                    g.flinksCtx.lineWidth = 1
                    g.flinksCtx.strokeStyle = 'blue'
                    g.flinksCtx.stroke()
                }
                // else if(flink.leftSideIsBroken || flink.rightSideIsBroken){
                //     g.flinksCtx.lineWidth = 1
                //     g.flinksCtx.strokeStyle = 'red'
                //     g.flinksCtx.stroke()
                // }

                g.flinksCtx.beginPath()
                g.flinksCtx.strokeStyle = flink.isSelected ? 'blue' : flink.color05
                g.flinksCtx.lineWidth = 4
               
               
                
                if(leftStatus === "no_arrow" && rightStatus === "no_arrow"){
                    
                    if(this.flinkStyle === 'thin'){
                        //thin line
                        g.flinksCtx.moveTo(mainDocRightX + 5,leftY)
                        g.flinksCtx.lineTo(rightX - 5,rightY)
                        g.flinksCtx.stroke()

                    }else if(this.flinkStyle == 'thick'){
                        g.flinksCtx.beginPath()
                        g.flinksCtx.fillStyle = flink.color05
                        g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                   
                        g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness,rightTop)
                     
                        g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness,rightBottom)
                        g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftBottom)
                        g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
        
                        g.flinksCtx.closePath()
                        g.flinksCtx.fill()
                    }


                }

                // if(leftStatus === "middle"){
                //     if(this.flinkStyle === 'thin'){
                //         g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftY)
                //         g.flinksCtx.lineTo(mainDocRightX +  10,leftY)
                //         g.flinksCtx.stroke()
                //     }else if(this.flinkStyle === 'thick'){
                //         g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                //         g.flinksCtx.lineTo(mainDocRightX +  10,leftY)
                //         g.flinksCtx.lineTo(mainDocRightX +  kFlinkHorizontalThickness,leftBottom)
                //         g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                //         g.flinksCtx.fill()
                //     }

                // }

                if(leftStatus === "arrow_up"){
                    if(this.flinkStyle === 'thin'){
                        g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftY)
                        g.flinksCtx.lineTo(mainDocRightX +  10,leftY - 15)
                        g.flinksCtx.stroke()

                    }else if(this.flinkStyle === 'thick'){
                        g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                        g.flinksCtx.lineTo(mainDocRightX +  10,leftTop - 10)
                        g.flinksCtx.lineTo(mainDocRightX +  kFlinkHorizontalThickness,leftBottom)
                        g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                        g.flinksCtx.fill()
                    }

                }


                if(leftStatus === "arrow_down"){
                    if(this.flinkStyle === 'thin'){

                        g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftY)
                        g.flinksCtx.lineTo(mainDocRightX +  10,leftY + 15)
                        g.flinksCtx.stroke()
                    }else if(this.flinkStyle === 'thick'){
                        g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness, leftTop)
                        g.flinksCtx.lineTo(mainDocRightX + 10,leftBottom + 10)
                        g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftBottom)
                        g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                        g.flinksCtx.fill()
                    }

                }

                if(rightStatus === "arrow_up"){
                    if(this.flinkStyle === 'thin'){
                        g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightY)
                        g.flinksCtx.lineTo(rightX - 10,rightY - 15)
                        g.flinksCtx.stroke()
                    }else if(this.flinkStyle === 'thick'){
                        g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightTop)
                        g.flinksCtx.lineTo(rightX - 10,rightTop - 10)
                        g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness,rightBottom)
                        g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness,rightTop)
                        g.flinksCtx.fill()
                    }


                }

                if(rightStatus === "arrow_down"){
                    if(this.flinkStyle === 'thin'){
                        g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightY)
                        g.flinksCtx.lineTo(rightX - 10 ,rightY + 15)
                        g.flinksCtx.stroke()
                    }else if(this.flinkStyle === 'thick'){
                        g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightBottom)
                        g.flinksCtx.lineTo(rightX - 10 ,rightBottom + 10)
                        g.flinksCtx.lineTo(rightX - kFlinkHorizontalThickness ,rightTop)
                        g.flinksCtx.moveTo(rightX - kFlinkHorizontalThickness,rightBottom)
                        g.flinksCtx.fill()
                    }

                }
                



             }

    }





    drawTextToPointFlinks(noteObj) {
        const mainDocScrollDiv = document.getElementById("CurrentDocument")

        const mainDocRightX = this.docWidth
        const rightMinX = mainDocRightX + kMiddleGap
     
        
        const flinksData = this.currentConnection

        if(!flinksData || !flinksData.activeFlinks)return
        for(let flink of flinksData.activeFlinks){

                if(!flink.leftRects)return


                const rightEnd = flink.rightEnds[0]
                const {x,y,radius} = rightEnd
                const collageViewer = noteObj.collageViewer

            
                const relCoordinates = collageViewer.getRelativePoint(x,y) 
                if(!relCoordinates)return
                const {xRel, yRel} = relCoordinates

                const isDotVisible = isDotInsideFrame(xRel,yRel,{minX:0,minY:0,maxX:collageViewer.viewport.w,maxY:collageViewer.viewport.h})

                

             //   


                const topPanelHeight = g.pdm.getCurrentDocTopOffset()



                let {leftTop,leftBottom} = flink
                
                leftTop += -mainDocScrollDiv.scrollTop + topPanelHeight
                leftBottom += -mainDocScrollDiv.scrollTop + topPanelHeight

                leftBottom -= flink.bottomIndentHeight

                let leftY = (leftTop + leftBottom) / 2

                const leftEndVisible = leftY > 0 && leftY < window.innerHeight - kLeftDivTop

             
                //left stub
                g.flinksCtx.beginPath()
                g.flinksCtx.fillStyle = flink.color05
                g.flinksCtx.moveTo(mainDocRightX,leftTop)
                g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                g.flinksCtx.lineTo(mainDocRightX + kFlinkHorizontalThickness,leftBottom)
                g.flinksCtx.lineTo(mainDocRightX,leftBottom)
                g.flinksCtx.closePath()
                g.flinksCtx.fill()

                g.flinksCtx.beginPath()
                g.flinksCtx.strokeStyle = flink.isSelected ? 'blue' : flink.color05
                g.flinksCtx.lineWidth = 4

                if(leftEndVisible){
                    if(this.flinkStyle === 'thin'){
                            g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftY)
                            g.flinksCtx.lineTo(mainDocRightX +  kMiddleGap,leftY)
                            g.flinksCtx.stroke()
                    }else if(this.flinkStyle === 'thick'){
                            g.flinksCtx.moveTo(mainDocRightX + kFlinkHorizontalThickness,leftTop)
                            g.flinksCtx.lineTo(mainDocRightX +  kMiddleGap,leftY - 2)
                            g.flinksCtx.lineTo(mainDocRightX +  kMiddleGap,leftY + 2)
                            g.flinksCtx.lineTo(mainDocRightX +  kFlinkHorizontalThickness,leftBottom)
                            g.flinksCtx.closePath()
                            g.flinksCtx.fill()
                    }
                }

              

                
                
                g.flinksCtx.beginPath()
                g.flinksCtx.strokeStyle = flink.isSelected ? 'blue' : flink.color05
                g.flinksCtx.moveTo(rightMinX,leftY)
                if(isDotVisible && leftEndVisible){
                    g.flinksCtx.lineTo(rightMinX + xRel, yRel)
                }else if(leftEndVisible){
                    const finalY = yRel > leftY ? leftY + 10 : leftY - 10
                    g.flinksCtx.lineTo(rightMinX - 10, finalY)
                }
                g.flinksCtx.stroke()
                
                if(isDotVisible){
                    const r = Math.min(radius * collageViewer.k,10)
                    g.flinksCtx.beginPath()
                    g.flinksCtx.arc(mainDocRightX +  kMiddleGap + xRel, yRel, r , 0, 2 * Math.PI);
                    g.flinksCtx.fillStyle = flink.color05
                    g.flinksCtx.strokeStyle = 'white'
                    g.flinksCtx.lineWidth = 1
                    g.flinksCtx.fill()
                    g.flinksCtx.stroke()
                }
                


          }
    }

    drawPointToTextFlinks(noteObj) {
        
    
        const mainDocRightX = this.docWidth
        const rightMinX = mainDocRightX + kMiddleGap

 
        for (const flinksData of this.connections) {
            if(!this.isFullScreen && flinksData !== this.currentConnection)continue
                    
            if(!flinksData.activeFlinks)continue
            for(let flink of flinksData.activeFlinks){
    
                if(!this.isFullScreen && !flink.rightRects)continue
    
                const leftEnd = flink.leftEnds[0]
                const { x, y, radius } = leftEnd
    
                const collageViewer = g.readingManager.mainCollageViewer
    
                const relCoordinates = collageViewer.getRelativePoint(x,y) 
                if(!relCoordinates)return
                const {xRel, yRel} = relCoordinates 
    
                const isDotVisible = isDotInsideFrame(xRel,yRel,{minX:0,minY:0,maxX:collageViewer.viewport.w,maxY:collageViewer.viewport.h})
    
               
                if (this.isFullScreen) continue
                
                  const secondDiv = noteObj.scrollDiv
               
                const rightTopPanelHeight = g.pdm.getRightDocTopOffset(noteObj)
    
             
                let {rightTop,rightBottom} = flink
    
                rightTop += -secondDiv.scrollTop + rightTopPanelHeight
                rightBottom += -secondDiv.scrollTop + rightTopPanelHeight
    
                rightTop += flink.topIndentHeight
                
            
                let rightY = (rightTop + rightBottom) / 2 
    
                const rightEndVisible = rightY > 0 && rightY < window.innerHeight - kLeftDivTop
    
                 
    
                //right stub
                g.flinksCtx.beginPath()
                g.flinksCtx.fillStyle = flink.color05
                g.flinksCtx.moveTo(rightMinX - kFlinkHorizontalThickness,rightTop)
                g.flinksCtx.lineTo(rightMinX,rightTop)
                g.flinksCtx.lineTo(rightMinX,rightBottom)
                g.flinksCtx.lineTo(rightMinX - kFlinkHorizontalThickness,rightBottom)
                g.flinksCtx.closePath()
                g.flinksCtx.fill()
    
                g.flinksCtx.beginPath()
                g.flinksCtx.strokeStyle = flink.isSelected ? 'blue' : flink.color05
                g.flinksCtx.lineWidth = 4
    
                if(rightEndVisible){
                    if(this.flinkStyle === 'thin'){
                            g.flinksCtx.moveTo(rightMinX - kFlinkHorizontalThickness,rightY)
                            g.flinksCtx.lineTo(mainDocRightX,rightY)
                            g.flinksCtx.stroke()
                    }else if(this.flinkStyle === 'thick'){
                            g.flinksCtx.moveTo(rightMinX - kFlinkHorizontalThickness,rightTop)
                            g.flinksCtx.lineTo(mainDocRightX,rightY - 2)
                            g.flinksCtx.lineTo(mainDocRightX,rightY + 2)
                            g.flinksCtx.lineTo(rightMinX - kFlinkHorizontalThickness,rightBottom)
                            g.flinksCtx.closePath()
                            g.flinksCtx.fill()
                    }
                }
    
                
                g.flinksCtx.beginPath()
    
                g.flinksCtx.moveTo(mainDocRightX,rightY)
                if(isDotVisible && rightEndVisible){
                    g.flinksCtx.lineTo(xRel, yRel)
                }else if(rightEndVisible){
                    const finalY = yRel > rightY ? rightY + 10 : rightY - 10
                    g.flinksCtx.lineTo(mainDocRightX + 10, finalY)
                }
                g.flinksCtx.stroke()
    

        }    
            
            
    
        


          

        }

    }

    drawPointToPointFlinks(noteObj){

    }


    drawAllPointsOnLeftCollage() {

        const collageViewer = g.readingManager.mainCollageViewer

        for (const flinksData of this.connections) {
            if(!flinksData.activeFlinks)continue
            for(let flink of flinksData.activeFlinks){
    
                const leftEnd = flink.leftEnds[0]
                const { x, y, radius } = leftEnd
    
                const relCoordinates = collageViewer.getRelativePoint(x,y) 
                if(!relCoordinates)return
                const {xRel, yRel} = relCoordinates 
    
                const isDotVisible = isDotInsideFrame(xRel,yRel,{minX:0,minY:0,maxX:collageViewer.viewport.w,maxY:collageViewer.viewport.h})
    
                if(isDotVisible){
                    const r =  Math.min(radius * collageViewer.k,10)
                    g.flinksCtx.beginPath()
                    g.flinksCtx.arc(xRel, yRel, r , 0, 2 * Math.PI);
                    g.flinksCtx.fillStyle = flink.color05
                    g.flinksCtx.strokeStyle = 'white'
                    g.flinksCtx.lineWidth = 1
                    g.flinksCtx.fill()
                    g.flinksCtx.stroke()
                }
   

            }    
            
            
    
        


          

        }
    }
    


    

    redrawAllTabs(selectLastDoc = false){
        const tabsContainerDiv = document.getElementById("RightDocumentsTabsContainer")
        removeAllChildren(tabsContainerDiv)
        const docCount = this.rightNotesData.length
        if (docCount < 2) {
            tabsContainerDiv.style.display = 'none'
            return
        }else{
            tabsContainerDiv.style.display = 'flex'
        }

        this.rightTabDivs = []
        const tabWidth = this.docWidth / docCount


        function addTab(noteData,i, isSelected = false) {
            const tabDiv = document.createElement('div')
            tabDiv.className = 'RightDocumentTab'
            tabDiv.style.backgroundColor = 'gray'
            tabDiv.style.height = `${kRightDivTopBarHeight}px`
            tabDiv.style.width = `${tabWidth}px`
            tabDiv.style.top = 0
            tabDiv.style.left = `${i * tabWidth}px`
            tabDiv.style.boxShadow = 'inset -1px 0 0 0 rgba(0, 0, 0, 0.3)';

         

            if(isSelected){
                tabDiv.style.borderRightColor = 'transparent'
                tabDiv.style.borderRightWidth = '0px'
                tabDiv.style.backgroundColor = 'rgba(37, 38, 39, 0.1)'
                tabDiv.style.boxShadow = 'none'
            }

            tabsContainerDiv.appendChild(tabDiv)
            const currentIndex = i            
            tabDiv.addEventListener('click',() => {
                g.pdm.showTab(currentIndex)
                g.readingManager.redrawFlinks()
            })

            g.readingManager.rightTabDivs.push(tabDiv)

            const tabCircleDiv = document.createElement('div')
            tabCircleDiv.className = 'TabCircleDiv'

            const flinksData = g.readingManager.connections.find(fd => fd.url === noteData.url)
            if (flinksData) {
                tabCircleDiv.style.backgroundColor = addTransparencyToHexColor(flinksData.color,0.6)
            }

            tabDiv.appendChild(tabCircleDiv)

            const noteTitleSpan = document.createElement('span')
            noteTitleSpan.className = 'RightDocumentTitle'
            noteTitleSpan.innerHTML = noteData.title

            noteData.titleSpan = noteTitleSpan

            tabDiv.appendChild(noteTitleSpan)
        }

        if (docCount > 1) {
            const selectedIndex = selectLastDoc ? this.rightNotesData.length - 1 : this.selectedRightDocIndex
            for (let i = 0; i < this.rightNotesData.length; i++) {
                addTab(this.rightNotesData[i], i, i === selectedIndex)
            }
            
        }


    }


    imageJustLoaded(flinksData) {
        clearTimeout(this.imageLoadingTimer)
        this.imageLoadingTimer = setTimeout(() =>{ 
            if(!flinksData){
                g.readingManager.applyFlinksOnTheLeft()
            }else{
                flinksData.flinksUpdateNeeded = true
                if(g.readingManager.currentConnection === flinksData){
                    g.readingManager.applyFlinksOnTheRight()
                }
            }

        },500)
    }


    applyFlinksOnTheLeft(){
        this.removeFlinksFromMainDiv()

        setTimeout(() => {
            if(g.readingManager.mainDocData && g.readingManager.mainDocData.docType === 'condoc' && !g.readingManager.embeddedDocData)return

            if (g.readingManager.isFullScreen || g.pdm.isOkToShowFlinks()) {
                this.checkIfFlinksAreBroken()
                this.prepareLeftLinks()
                this.addFlinksToLeftDiv()  

                this.redrawFlinks()
            }

        },0)
    }

    applyFlinksOnTheRight(removeOldFlinks = true){
        if(removeOldFlinks)this.removeFlinksFromRightDiv()

   
        requestAnimationFrame(() => {
            if(g.readingManager.mainDocData && g.readingManager.mainDocData.docType === 'condoc' && !g.readingManager.embeddedDocData)return

            if (!this.isFullScreen) {
                this.checkIfFlinksAreBroken()
                this.fixRightFlinksAutomaticallyIfNeeded()
                this.prepareRightLinks()
                this.addFlinksToRightDiv()

                this.redrawFlinks()

                const flinksData = g.readingManager.currentConnection
                flinksData.flinksUpdateNeeded = false
            }

        })
        
    }


    redrawFlinks(){
        g.pdm.showMiddleCanvas()
        this.drawFlinksOnMiddleCanvas() 
    }





    drawFlinksOnTheLeftOnly() {
        g.readingManager.loadFlinksData()
        g.readingManager.prepareLeftLinks()
        g.readingManager.checkIfFlinksAreBroken()
        g.readingManager.addFlinksToLeftDiv()

        if (g.readingManager.mainCollageViewer) {
            g.readingManager.mainCollageViewer.changesInReadingModeExist = true
            g.pdm.showMiddleCanvas()
            g.readingManager.drawFlinksOnMiddleCanvas()
        }
        
        if (g.readingManager.someFlinksAreBrokenOnTheLeft && !g.readingManager.didFixLeftSideOnce) {
            this.fixBrokenFlinksOnTheLeftSide()
            g.readingManager.didFixLeftSideOnce = true
        }

        g.readingManager.checkIfFlinksWereChangedOnTheLeftSide()

        g.pdm.updateCurrentDocExportButton()


    }

    fixRightFlinksAutomaticallyIfNeeded() {
        const flinksData = g.readingManager.currentConnection
        if(!flinksData.activeFlinks)return
        if (!flinksData.rightSideIsBroken) return
        if(flinksData.didFixRightSideOnce)return 

        const { leftText, rightText } = this.getLeftAndRightTexts()
        if(!rightText)return
        
        let flinksetHasChanges = false
        for(let flink of flinksData.activeFlinks){
            const changeDetected = this.fixFlink(flink, leftText, rightText)
            if(changeDetected){
                flinksetHasChanges = true
            }
        }
 
        this.changesInReadingModeExist = true

        this.didFixLeftSideOnce = true
        flinksData.didFixRightSideOnce = true

        g.readingManager.checkIfFlinksWereChangedOnTheRightSide()


        g.pdm.updateCurrentDocExportButton()


        
    }




    async loadFlinksData() {
                
        for (let flinksData of this.connections) {
            
            if (!flinksData.flinks) continue

            this.copyOriginalFlinks(flinksData)
    
         
        }

    }

    copyOriginalFlinks(flinksData) {
          flinksData.activeFlinks = flinksData.flinks.map(flink => flink.getExportString()).map(string => FloatingLink.fromExportString(string))
            flinksData.activeFlinks.forEach(flink => {
                flink.color = flinksData.color
                flink.color05 = addTransparencyToHexColor(flinksData.color,0.5)
                flink.color03 = addTransparencyToHexColor(flinksData.color,0.3)
            })
    }


    checkIfFlinksWereChangedOnTheLeftSide = () => {
        if(this.mainDocType !== 'h')return
        for (const flinksData of this.connections) {
            if (!flinksData.activeFlinks) continue


            if (flinksData.activeFlinks.length !== flinksData.flinks.length) {
                flinksData.flinksWereModifiedOnLeftSide = true
                continue
            }

            flinksData.flinksWereModifiedOnLeftSide = false




            for (let flink of flinksData.activeFlinks) {
                const originalFlink = flinksData.flinks.find(f => f.leftEnds[0].hash === flink.leftEnds[0].hash)
                if (!originalFlink) {
                    flinksData.flinksWereModifiedOnLeftSide = true
                    break
                }
                if (originalFlink.leftEnds[0].index !== flink.leftEnds[0].index || originalFlink.leftEnds[0].hIndex !== flink.leftEnds[0].hIndex) {
                    flinksData.flinksWereModifiedOnLeftSide = true
                    break
                }
            }
            
        }
    }


    checkIfFlinksWereChangedOnTheRightSide = () => {
        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        if(!noteData || noteData.docType !== 'h')return
        const flinksData = this.currentConnection
        if (!flinksData.activeFlinks) return

        if (flinksData.activeFlinks.length !== flinksData.flinks.length) {
            flinksData.flinksWereModifiedOnRightSide = true
            return 
        }
        
        flinksData.flinksWereModifiedOnRightSide = false
        for (let flink of flinksData.activeFlinks) {
            const originalFlink = flinksData.flinks.find(f => f.rightEnds[0].hash === flink.rightEnds[0].hash)
            if (!originalFlink) {
                flinksData.flinksWereModifiedOnRightSide = true
                return
            }
            if (originalFlink.rightEnds[0].index !== flink.rightEnds[0].index || originalFlink.rightEnds[0].hIndex !== flink.rightEnds[0].hIndex) {
                flinksData.flinksWereModifiedOnRightSide = true
                return
            }
        }
    }


      checkIfFlinksAreBroken = () => {

        let someFlinksAreBrokenOnTheLeft = false

        let secondDiv
        for(const flinksData of this.connections){
            if(!flinksData.activeFlinks)continue
            
            const noteData = this.getNoteDataByUrl(flinksData.url)


            let secondDocType
            if (noteData) {
                secondDiv = noteData.scrollDiv 
                secondDocType = noteData.docType
            }
    
            flinksData.leftSideIsBroken = false
            flinksData.rightSideIsBroken = false

            for(let flink of flinksData.activeFlinks){
    
       
                this.checkIfFlinkIsBroken(flink,secondDiv,this.mainDocType, secondDocType)
  
                if (flink.leftSideIsBroken || flink.leftEndOutOfBounds) {
                    flinksData.leftSideIsBroken = true
                    someFlinksAreBrokenOnTheLeft = true
                }

                if (flink.rightSideIsBroken || flink.rightEndOutOfBounds) {
                    flinksData.rightSideIsBroken = true
                }
               
            }

            this.someFlinksAreBrokenOnTheLeft = someFlinksAreBrokenOnTheLeft
         

        }
    
      }
    
    
    
    checkIfFlinkIsBroken(flink,secondDiv,leftDocType,rightDocType){

        if(leftDocType === 'h'){
            const leftEnd = flink.leftEnds[0]
    
            if(leftEnd.hIndex > leftEnd.index || leftEnd.hIndex + leftEnd.hLength < leftEnd.index + leftEnd.length){
                flink.leftSideIsBroken = true
            }

            if(!flink.leftSideIsBroken && !flink.leftEndOutOfBounds){
                const mainDocDiv = document.getElementById("CurrentDocument")

                const firstPresentationDiv = getPresentationDivFrom(mainDocDiv)
                
                const text = getTextFromDiv(firstPresentationDiv) 
                const line = text.substring(leftEnd.hIndex,leftEnd.hIndex + leftEnd.hLength)
    
                const isUnique = isSubstringUniqueInText(line,text)
                if (!isUnique) {
                    flink.leftSideIsBroken = true
                } else {
                    const hash = getShortHash(line)

                    if (leftEnd.hash !== hash) {
                        flink.leftSideIsBroken = true
                    }
                    
                }
    
            }

        }

        if(!secondDiv)return

        
        
        if(rightDocType === 'h'){
            const rightEnd = flink.rightEnds[0]
            
            if(rightEnd.hIndex > rightEnd.index || rightEnd.hIndex + rightEnd.hLength < rightEnd.index + rightEnd.length){
                flink.rightSideIsBroken = true
            }

            if(!flink.rightSideIsBroken && !flink.rightEndOutOfBounds){
                
                
                const secondPresentationDiv = getPresentationDivFrom(secondDiv)
                const text = getTextFromDiv(secondPresentationDiv) 
                const line = text.substring(rightEnd.hIndex,rightEnd.hIndex + rightEnd.hLength)
    

                const isUnique = isSubstringUniqueInText(line,text)
                
                if (!isUnique) {
                    flink.rightSideIsBroken = true
                } else {
                    const hash = getShortHash(line)
    
                    if (rightEnd.hash !== hash) {
                        flink.rightSideIsBroken = true
                    }
                    
                }
                
    
            }
        }


     
        


        

    }


    prepareLeftLinks() {
        
        if(this.mainDocType !== 'h')return

        const noteScrollDiv = document.getElementById("CurrentDocument")
        const notePresentationDiv = document.getElementById("CurrentDocumentMainDiv")

        const textNodesArray = getTextNodesArrayFromDiv(notePresentationDiv)

        const divX = g.pdm.getCurrentDocLeftVerticalPanelWidth()

        const currentDocTopOffset = g.pdm.getCurrentDocTopOffset()

        const topY = kLeftDivTop + currentDocTopOffset

        const fullTextLength = textNodesArray.reduce((total, node) => total + node.data.length, 0);


      
     
        for(let flinksData of this.connections){
            if (!flinksData.activeFlinks)continue
            
           

            for(let flink of flinksData.activeFlinks){

                this.prepareOneLeftLink(flink,noteScrollDiv,textNodesArray,divX,topY,fullTextLength)

            

            }
         
        }

        this.areLeftFlinksPositionedForFullscreen = this.isFullScreen
    }


      prepareOneLeftLink(flink,noteScrollDiv,textNodesArray,divX,topY,fullTextLength){
        
        const leftEnd = flink.leftEnds[0]

        if(leftEnd.index + leftEnd.length > fullTextLength){
            flink.leftEndOutOfBounds = true
            return
        }

        
        const leftRects = g.noteDivsManager.calculateHighlightPosition(noteScrollDiv,textNodesArray,leftEnd.index,leftEnd.length,divX,topY)
        

        if(leftRects.length){
            flink.leftRects = leftRects
    
            flink.leftTop = leftRects[0].top
            const leftBottomRect = leftRects[leftRects.length - 1]
            flink.leftBottom = leftBottomRect.top + leftBottomRect.height
    
            flink.bottomIndentHeight = leftRects.length > 1 ? leftBottomRect.height : 0
        }


      }
    
    
    
    prepareRightLinks() {
        if(!this.rightNotesData.length)return
        const noteObj = this.rightNotesData[this.selectedRightDocIndex]
        if(!noteObj || noteObj.docType !== 'h')return
        
        if (!this.currentConnection || !this.currentConnection.activeFlinks) return


        const secondScrollDiv = noteObj.scrollDiv
        
        const rightPresentationDiv = getPresentationDivFrom(secondScrollDiv)
        const textNodesArray = getTextNodesArrayFromDiv(rightPresentationDiv)


        const rightTextLength = textNodesArray.reduce((total, node) => total + node.data.length, 0);

       
        const leftPanelWidth = noteObj.currentDocLeftPanelShowing ? kVerticalPanelWidth : 0
       
        const divX = this.docWidth + kMiddleGap + leftPanelWidth
        const topY = kLeftDivTop + g.pdm.getRightDocTopOffset(noteObj)


        for(let flink of this.currentConnection.activeFlinks){

            this.prepareOneRightLink(flink,secondScrollDiv,textNodesArray,divX,topY,rightTextLength)

        }
        
     }
    
    
    prepareOneRightLink(flink,rightScrollDiv,textNodesArray,divX,topY,fullTextLength){

        const rightEnd = flink.rightEnds[0]

        

        if(rightEnd.index + rightEnd.length > fullTextLength){
            flink.rightEndOutOfBounds = true
            return
        }
 

        const rightRects = g.noteDivsManager.calculateHighlightPosition(rightScrollDiv,textNodesArray,rightEnd.index,rightEnd.length,divX,topY,this.docWidth)

      
        if(rightRects.length){
            flink.rightRects = rightRects
    
    
            flink.rightTop = rightRects[0].top
            const rightBottomRect = rightRects[rightRects.length - 1]
            flink.rightBottom = rightBottomRect.top + rightBottomRect.height
    
            flink.topIndentHeight = rightRects.length > 1 ? rightRects[0].height : 0

        }




    }
    
    
    
    
    addFlinksToLeftDiv(){

        if(this.mainDocType !== 'h')return

        const firstPresentationDiv = document.getElementById("CurrentDocumentMainDiv")

        const mainDocScrollDiv = document.getElementById("CurrentDocument")

        const topOffset = mainDocScrollDiv.scrollTop - window.innerHeight

        const bottomOffset = topOffset + window.innerHeight * 2


        
        let i = 0
        for(let flinksData of this.connections){
            if(!flinksData.activeFlinks){i++;continue}
            const shouldOptimize = flinksData.activeFlinks.length > maxFlinksNumberBeforeOptimization
            
            let j = 0
            for(let flink of flinksData.activeFlinks){

                if(flink.isLeftSideDrawn)continue
                if(flink.leftEndOutOfBounds)continue
                if(shouldOptimize && (flink.leftBottom < topOffset || flink.leftTop > bottomOffset))continue

                const fillColor = flink.color03
                const isFlinkBroken = flink.leftSideIsBroken
                const top = flink.leftTop
                const height = flink.leftBottom - flink.leftTop 
                const lineRects = flink.leftRects
        

                this.addOneHightlightToDiv(firstPresentationDiv,`leftDocFlinkCanvas${i}_${j}`,'leftDocFlinkCanvas',fillColor,isFlinkBroken,top,height,lineRects)
                flink.isLeftSideDrawn = true
                j++
            }

            i++


            
        }
    }


    addFlinksToRightDiv() {
         
        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        
        if(!noteData || noteData.docType !== 'h')return
        if (!this.currentConnection || !this.currentConnection.activeFlinks) return

        const secondDiv = noteData.scrollDiv

        if(!secondDiv)return


        const presentationDiv = getPresentationDivFrom(secondDiv)

        const topOffset = secondDiv.scrollTop - window.innerHeight

        const bottomOffset = topOffset + window.innerHeight * 2

        
        
        let i = 0


        const shouldOptimize = this.currentConnection.activeFlinks.length > maxFlinksNumberBeforeOptimization


        for (let flink of this.currentConnection.activeFlinks) {
            if(flink.isRightSideDrawn)continue
            if(flink.rightEndOutOfBounds)continue
            if(shouldOptimize && (flink.rightBottom < topOffset || flink.rightTop > bottomOffset))continue

            const fillColor = flink.color03
            const isFlinkBroken = flink.rightSideIsBroken
            const top =  flink.rightTop
            const height = flink.rightBottom - flink.rightTop
            const lineRects = flink.rightRects

            this.addOneHightlightToDiv(presentationDiv,`rightDocFlinkCanvas${i}`,'rightDocFlinkCanvas',fillColor,isFlinkBroken,top,height,lineRects)
            flink.isRightSideDrawn = true
        
            i++

        }
        
    }



    addOneHightlightToDiv(div,id,className,fillColor,isFlinkBroken,top,height,lineRects){

   
        const borderColorForBrokenLink = 'red'
        const lineWidthForBrokenFlink = 2
        const lineDashForBrokenFlink = [5, 5]


        const lineDash = isFlinkBroken ? lineDashForBrokenFlink : []
        const borderColor = isFlinkBroken ? borderColorForBrokenLink : undefined
        const lineWidth = isFlinkBroken ? lineWidthForBrokenFlink : 0

        const width = div.clientWidth

        const canvas = document.createElement('canvas')
        canvas.id = id
        canvas.className = className
        canvas.style.position = 'absolute'
        canvas.style.left = 0
        canvas.style.top = `${top - lineWidth / 2}px`
        canvas.style.height = `${height + lineWidth}px`
        canvas.style.width = `${width}px`


        canvas.style.backgroundColor = 'transparent'
        canvas.style.pointerEvents = 'none'
        canvas.style.zIndex = -1

    

        div.appendChild(canvas)

        const context = canvas.getContext("2d");

        var dpr = window.devicePixelRatio || 1
        // Get the size of the canvas in CSS pixels.
        var canvasRect = canvas.getBoundingClientRect()
        canvas.width = canvasRect.width * dpr
        canvas.height = canvasRect.height * dpr

        context.scale(dpr, dpr)

        
   
        if(lineRects){
            if(lineRects.length === 1){
                const lineRect = lineRects[0]
                const topY = lineRect.top - top + lineWidth / 2
                const rect = {left:lineRect.left,top:topY,width:lineRect.width,height:lineRect.height}
                this.addColorsToFlinkRect(context,rect,fillColor,borderColor,lineWidth,lineDash)
            }else if(lineRects.length === 2){
                const topLineRect = lineRects[0]
                const bottomLineRect = lineRects[1]
                const intersectionExists = topLineRect.left < bottomLineRect.left + bottomLineRect.width
                if(!intersectionExists){
                    const top1Y = topLineRect.top - top + lineWidth / 2
                    const rect1 = {left:topLineRect.left,top:top1Y,width:topLineRect.width,height:topLineRect.height}
                    
                    this.addColorsToFlinkRect(context,rect1,fillColor,borderColor,lineWidth,lineDash)
                    const top2Y = bottomLineRect.top - top
                    const rect2 = {left:bottomLineRect.left,top:top2Y,width:bottomLineRect.width,height:bottomLineRect.height}
                    this.addColorsToFlinkRect(context,rect2,fillColor,borderColor,lineWidth,lineDash)
                }else{
                    const topY = topLineRect.top - top + lineWidth / 2
                    context.beginPath()
                    context.strokeStyle = borderColor
                    context.fillStyle = fillColor
                    context.lineWidth = lineWidth
                    context.setLineDash(lineDash)
                    context.moveTo(topLineRect.left,topY)
                    context.lineTo(topLineRect.left + topLineRect.width,topY)
                    context.lineTo(topLineRect.left + topLineRect.width,topY + topLineRect.height)
                    context.lineTo(bottomLineRect.left + bottomLineRect.width,topY + topLineRect.height)
                    context.lineTo(bottomLineRect.left + bottomLineRect.width,topY + topLineRect.height + bottomLineRect.height)
                    context.lineTo(bottomLineRect.left,topY + topLineRect.height + bottomLineRect.height)
    
                    context.lineTo(bottomLineRect.left,topY + topLineRect.height)
                    context.lineTo(topLineRect.left,topY + topLineRect.height)
    
                    context.closePath()
                    
                    context.fill()
                    if(isFlinkBroken){
                        context.stroke()
                    }
    
                }
            }else if(lineRects.length === 3){
                const topLineRect = lineRects[0]
                const middleLineRect = lineRects[1]
                const bottomLineRect = lineRects[2]
    
                const topY = topLineRect.top - top + lineWidth / 2
    
                context.beginPath()
                context.strokeStyle = borderColor
                context.fillStyle = fillColor
                context.lineWidth = lineWidth
                context.setLineDash(lineDash)
                context.moveTo(topLineRect.left,topY)
                context.lineTo(topLineRect.left + topLineRect.width,topY)
                context.lineTo(topLineRect.left + topLineRect.width,topY + topLineRect.height + middleLineRect.height)
                context.lineTo(bottomLineRect.left + bottomLineRect.width,topY + topLineRect.height + middleLineRect.height)
                context.lineTo(bottomLineRect.left + bottomLineRect.width,topY + topLineRect.height + middleLineRect.height + bottomLineRect.height)
                context.lineTo(bottomLineRect.left,topY + topLineRect.height + middleLineRect.height + bottomLineRect.height)
                context.lineTo(bottomLineRect.left,topY + topLineRect.height)
                context.lineTo(topLineRect.left,topY + topLineRect.height)
                context.closePath()
                
                context.fill()
                if(isFlinkBroken){
                    context.stroke()
                }
    
    
    
    
            }

        } 

        
    }


    addColorsToFlinkRect(context,rect,color,borderColor,lineWidth,lineDash = undefined){
        context.beginPath()
        context.fillStyle = color
        if(borderColor && lineWidth){
            context.strokeStyle = borderColor
            context.lineWidth = lineWidth
            if(lineDash){
                context.setLineDash(lineDash)
            }
        }

        context.rect(rect.left, rect.top, rect.width, rect.height)

        context.fill()
        if(borderColor && lineWidth){
            context.stroke()
        }
    }



    getNoteDataByUrl(url) {
        return this.rightNotesData.find(nd => nd.url === url)
    }

    getNoteIndexByUrl(url) {
        return g.readingManager.rightNotesData.findIndex(noteData => noteData.url === url)
    }


    getFlinkStatus(leftY,rightY){
        let leftStatus = "no_arrow" 
        let rightStatus = "no_arrow"
        

        const threshold = 100

        if(leftY < -threshold){
            rightStatus = "arrow_up"
        }else if(leftY > window.innerHeight + threshold){
            rightStatus = "arrow_down"
        }

        if(rightY < -threshold){
             leftStatus = "arrow_up"
        }else if(rightY > window.innerHeight + threshold){
            leftStatus = "arrow_down"
        }

        return {leftStatus,rightStatus}
    }

    
    
  

    addListenerToLeftDoc() {

        if (this.mainDocType === 'h') {
            const mainDocScrollEvent = () => {
                clearTimeout(this.leftScrollTimeout)
                this.leftScrollTimeout = setTimeout(() => {
                    this.addFlinksToLeftDiv() 
                }, 50);
                this.changesInReadingModeExist = true
                this.drawFlinksOnMiddleCanvas()
            }
            
    
            const mainScrollDocDiv = document.getElementById("CurrentDocument")
            mainScrollDocDiv.addEventListener("scroll",mainDocScrollEvent);

            g.noteDivsManager.addEventListenersToNote(mainScrollDocDiv, g.readingManager, this.mainDocId)
            
        } else if (this.mainDocType === 'c') {
            
        }

    }


    addListenerToCurrentRightDoc() {
        const noteData = this.rightNotesData[this.selectedRightDocIndex]
        if(!noteData || noteData.docType !== 'h')return
        const secondDocScrollEvent = () => {
            clearTimeout(this.rightScrollTimeout)
                this.rightScrollTimeout = setTimeout(() => {
                this.addFlinksToRightDiv()
            }, 50);

            this.changesInReadingModeExist = true
            this.drawFlinksOnMiddleCanvas() 
        }
        const secondScrollDiv = noteData.scrollDiv
        
        secondScrollDiv.addEventListener("scroll",secondDocScrollEvent);
    }



    async handleTouchInMainDoc(pageX,pageY,currentlyPressedLink){

        if(g.pdm.isShowingInfo || g.pdm.isLeftSourceCodeShowing)return
        
        const topPanelHeight = g.pdm.getCurrentDocTopOffset()
        
        const x = pageX - g.pdm.getCurrentDocLeftVerticalPanelWidth()
        const y = pageY - kLeftDivTop - topPanelHeight
        if(this.mainDocType === 'c'){
            for(let flinksData of this.connections){
                if(!flinksData.activeFlinks)continue
                for(let flink of flinksData.activeFlinks){
                    const leftEnd = flink.leftEnds[0]
                    const {x:dotAbsX,y:dotAbsY,radius} = leftEnd
                    const collageViewer = this.mainCollageViewer
                     const relCoordinates = collageViewer.getRelativePoint(dotAbsX,dotAbsY) 
                    if(!relCoordinates)continue
                    const {xRel, yRel} = relCoordinates
                    const distance = Math.sqrt(Math.pow(xRel - x, 2) + Math.pow(yRel - y, 2))
                    if(distance < Math.min(radius * collageViewer.k,10)){
                        
                        const noteDataIndex = this.getNoteIndexByUrl(flinksData.url)

                        if (noteDataIndex === -1) {
     
                         
                            await g.readingManager.downloadOnePage(flinksData.url)

                            const noteData = this.rightNotesData[this.rightNotesData.length - 1]
                            if (noteData.docType === 'h') { 
                                const rightDotTopPanelHeight = g.pdm.getRightDocTopOffset(noteData)
                                const secondScrollDiv = noteData.scrollDiv
                                this.scrollRightDocInPositionForPoint(flink,yRel + kLeftDivTop, secondScrollDiv,rightDotTopPanelHeight)
                            }
                            return
                        }
                        
                        const noteData = this.rightNotesData[noteDataIndex]

                        if(noteData.docType === 'c'){


                        }else if(noteData.docType === 'h'){

                            if(this.selectedRightDocIndex !== noteDataIndex){
                                g.pdm.showTab(noteDataIndex)
                                g.readingManager.redrawFlinks()
                            }

                            const rightDotTopPanelHeight = g.pdm.getRightDocTopOffset(noteData)
                            const secondScrollDiv = noteData.scrollDiv
                            this.scrollRightDocInPositionForPoint(flink,yRel + kLeftDivTop, secondScrollDiv,rightDotTopPanelHeight)
                        }
                        return
                    }

                }
            
            }
        }else if(this.mainDocType === 'h'){
            const mainScrollDocDiv = document.getElementById("CurrentDocument")
            const x = pageX - g.pdm.getCurrentDocLeftVerticalPanelWidth()
            const y = pageY - kLeftDivTop - topPanelHeight + mainScrollDocDiv.scrollTop
        
            let touchedFlinks = []
            for(let flinksData of this.connections){
                if(!flinksData.activeFlinks)continue
                for(let flink of flinksData.activeFlinks){
                    if(flink.leftEndOutOfBounds)continue
                        if(!flink.leftRects)continue
                        for(let rect of flink.leftRects){
                            
                            
                            if(isDotInsideFrame(x,y,{minX:rect.left,minY:rect.top,maxX:rect.left + rect.width,maxY:rect.top + rect.height})){
                               
                                touchedFlinks.push({flink,flinksData})
                        
                            }
                        }
    
                    
                }
    
           
    
            }

            const finalArray = []
        
            if(touchedFlinks.length){

          
                if(currentlyPressedLink){
                    event.preventDefault()
                    const text = currentlyPressedLink.innerText
                    if(text.length > 30){
                        text = text.slice(0,30).trim() + '...'
                    }
                    finalArray.push({type:'hyperlink',text, url: currentlyPressedLink.href, target:currentlyPressedLink.target })

                }

                for(const item of touchedFlinks){

                    const {flink, flinksData} = item

                    const firstPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
                    const leftText = getTextFromDiv(firstPresentationDiv) 

                    const leftEnd = flink.leftEnds[0]

                    let leftLine = leftText.substring(leftEnd.index,leftEnd.index + leftEnd.length)

                    if(leftLine.length > 30){
                        leftLine = leftLine.slice(0,30).trim() + '...'
                    }


                    finalArray.push({type:'flink',flink,flinksData,text:leftLine})



                }


            }else{
                if(currentlyPressedLink){
                    currentlyPressedLink.click()
                }
            }



            if (!currentlyPressedLink && finalArray.length === 1) {
                const { flink, flinksData } = finalArray[0]

                this.flinkPressedInLeftDocument(flink, flinksData)
                
                
                
            }else if(finalArray.length){
                showMultipleLinksPopup(pageX,pageY,finalArray)

            }


        }

    }




    handleTouchInRightDoc(pageX,pageY,currentlyPressedLink){
        if(this.isFullScreen)return
        const noteData = this.rightNotesData[this.selectedRightDocIndex]

        const flinksData = this.currentConnection

        if(noteData.docType === 'c'){

            if(!flinksData || !flinksData.activeFlinks)return

            const noteLeftX = this.docWidth + kMiddleGap
        
            const x = pageX - noteLeftX
            const y = pageY - kLeftDivTop


            for(let flink of flinksData.activeFlinks){
                const rightEnd = flink.rightEnds[0]
                const {x:dotAbsX,y:dotAbsY,radius} = rightEnd
                const collageViewer = noteData.collageViewer
                 const relCoordinates = collageViewer.getRelativePoint(dotAbsX,dotAbsY) 
                if(!relCoordinates)return
                const {xRel, yRel} = relCoordinates
                const distance = Math.sqrt(Math.pow(xRel - x,2) + Math.pow(yRel - y,2))
                if(distance < Math.min(radius * collageViewer.k,10)){
                
                    if(this.mainDocType === 'c'){

                       // this.moveLeftCollageInPositionForLink(flink)
                    }else if(this.mainDocType === 'h'){
                        const topPanelHeight = g.pdm.getCurrentDocTopOffset()

                        this.scrollMainDocInPositionForPoint(flink,yRel + kLeftDivTop, topPanelHeight)
                    }
                }

            }
            return
        }else if(noteData.docType === 'h'){
            const secondDiv = noteData.scrollDiv
            const scrollTop = secondDiv.scrollTop



            const flinks = flinksData.activeFlinks
            if(!flinks)return

            const leftPanelWidth = noteData.currentDocLeftPanelShowing ? kVerticalPanelWidth : 0
    
            const noteLeftX = this.docWidth + kMiddleGap + leftPanelWidth
        
            const topPanelHeight = g.pdm.getRightDocTopOffset(noteData)
            const x = pageX - noteLeftX
            const y = pageY - topPanelHeight - kLeftDivTop + scrollTop
    


            let touchedFlinks = []
    
            for(let flink of flinks){
                if (flink.rightEndOutOfBounds) continue
                for(let rect of flink.rightRects){
                    
                    
                    
                    if(isDotInsideFrame(x,y,{minX:rect.left,minY:rect.top,maxX:rect.left + rect.width,maxY:rect.top + rect.height})){
                        touchedFlinks.push(flink)
                    }
                }
            }


               const finalArray = []
        
            if(touchedFlinks.length){

          
                if(currentlyPressedLink){
                    event.preventDefault()
                    const text = currentlyPressedLink.innerText
                    if(text.length > 30){
                        text = text.slice(0,30).trim() + '...'
                    }
                    finalArray.push({type:'hyperlink',text, url: currentlyPressedLink.href, target:currentlyPressedLink.target })

                }

                for(const flink of touchedFlinks){



                    const presentationDiv = getPresentationDivFrom(secondDiv)
                    const rightText = getTextFromDiv(presentationDiv) 

                    const rightEnd = flink.rightEnds[0]

                    let rightLine = rightText.substring(rightEnd.index,rightEnd.index + rightEnd.length)

                    if(rightLine.length > 30){
                        rightLine = rightLine.slice(0,30).trim() + '...'
                    }

                    finalArray.push({type:'flink',flink,flinksData,text:rightLine})



                }


            }else{
                if(currentlyPressedLink){
                    currentlyPressedLink.click()
                }
            }


            if (!currentlyPressedLink && touchedFlinks.length === 1) {
                const flink = touchedFlinks[0]
                this.flinkPressedInRightDocument(flink,noteData)
                     
            }else if(finalArray.length){
                showMultipleLinksPopup(pageX,pageY,finalArray,noteData)

            }



        }
    }


    handleTouchInMiddleGap(pageX,pageY){
        
        if(this.isFullScreen ) return
        let selectedFlink = null
        const noteObj = this.rightNotesData[this.selectedRightDocIndex]

        const isLeftDocCollage = this.mainDocType === 'c'
        const isRightDocCollage = noteObj.docType === 'c'
  
        let minVerticalThicknessOfFlink = 10000


        const leftEdgeX = this.docWidth
        const rightEdgeX = this.docWidth + kMiddleGap

       
        const leftDivTop = kLeftDivTop + g.pdm.getCurrentDocTopOffset()

        const rightDivTop = kLeftDivTop + g.pdm.getRightDocTopOffset(noteObj)


        if(!this.currentConnection.activeFlinks)return
        for(let flink of this.currentConnection.activeFlinks){



            let leftY
            let rightY
            
            
               
            let {leftTop,leftBottom} = flink
        
            if(!isLeftDocCollage){
                const leftScrollDiv = document.getElementById("CurrentDocument")
                leftTop += leftDivTop - leftScrollDiv.scrollTop
                leftBottom += leftDivTop - leftScrollDiv.scrollTop

                leftBottom -= flink.bottomIndentHeight

                leftY = (leftTop + leftBottom) / 2
            }



            let {rightTop,rightBottom} = flink
            if(!isRightDocCollage){
                const rightScrollDiv = noteObj.scrollDiv
                rightTop += rightDivTop - rightScrollDiv.scrollTop
                rightBottom += rightDivTop - rightScrollDiv.scrollTop

                rightTop += flink.topIndentHeight
                
                rightY = (rightTop + rightBottom) / 2
            } 
            

            if(isLeftDocCollage && !isRightDocCollage){
                leftY = (rightTop + rightBottom) / 2
            }


            
            if(isRightDocCollage && !isLeftDocCollage){
                rightY = (leftTop + leftBottom) / 2
            }

            

              
                       
                  
            const stubThickness = kFlinkHorizontalThickness

            if(!isLeftDocCollage){
                if(pageX < leftEdgeX + stubThickness){
                    if(pageY > leftTop && pageY < leftBottom){
                        const thickness = leftBottom - leftTop
                        if(thickness < minVerticalThicknessOfFlink){
                            minVerticalThicknessOfFlink = thickness
                            selectedFlink = {flink,noteObj}
                        }
                    }
                }
            }
            if(!isRightDocCollage){
                if(pageX > rightEdgeX - stubThickness){
                    if(pageY > rightTop && pageY < rightBottom){
                        const thickness = rightBottom - rightTop
                        if(thickness < minVerticalThicknessOfFlink){
                            minVerticalThicknessOfFlink = thickness
                            selectedFlink = {flink,noteObj}
                        }
                    }
                }

            }
            
            if(pageX > leftEdgeX + stubThickness && pageX < rightEdgeX - stubThickness){
                const horizDistance = kMiddleGap - 2 * stubThickness
                let topY
                let bottomY
                if(!isLeftDocCollage && !isRightDocCollage){
                
                    const topTan = (rightTop - leftTop) / horizDistance
                    const bottomTan = (rightBottom - leftBottom) / horizDistance
                    const x = pageX - leftEdgeX - stubThickness
                    topY = leftTop + x * topTan
                    bottomY = leftBottom + x * bottomTan
                 
                }else if(!isLeftDocCollage && isRightDocCollage){
                    const topTan = (rightY - leftTop) / horizDistance
                    const bottomTan = (rightY - leftBottom) / horizDistance
                    const x = pageX - leftEdgeX - stubThickness
                    topY = leftTop + x * topTan
                    bottomY = leftBottom + x * bottomTan
                
                }else if(isLeftDocCollage && !isRightDocCollage){
                    const topTan = (rightTop - leftY) / horizDistance
                    const bottomTan = (rightBottom - leftY) / horizDistance
                    const x = pageX - leftEdgeX - stubThickness
                    topY = leftY + x * topTan
                    bottomY = leftY + x * bottomTan
                }

                if(pageY > topY && pageY < bottomY){
                    const thickness = bottomY - topY
                    if(thickness < minVerticalThicknessOfFlink){
                        minVerticalThicknessOfFlink = thickness
                        selectedFlink = {flink,noteObj}
                    }
                }

            }



                

              

        }
            
            
     
        


        if(selectedFlink){
            selectedFlink.flink.isSelected = !selectedFlink.flink.isSelected
            this.changesInReadingModeExist = true

            this.drawFlinksOnMiddleCanvas()
            //this.drawLinks()
        }
    }



    async flinkPressedInLeftDocument(flink,flinksData){
        const topPanelHeight = g.pdm.getCurrentDocTopOffset()
        const mainScrollDocDiv = document.getElementById("CurrentDocument")

        const noteDataIndex = this.getNoteIndexByUrl(flinksData.url)

        if (noteDataIndex === -1) {
            await g.readingManager.downloadOnePage(flinksData.url)
            const noteData = this.rightNotesData[this.rightNotesData.length - 1]

            if(noteData){
                if (noteData.docType === 'c') {
                    this.moveRightCollageInPositionForLink(flink,mainScrollDocDiv.scrollTop, topPanelHeight)
                }else if(noteData.docType === 'h'){
                    const secondScrollDiv = noteData.scrollDiv
                    this.scrollRightDocInPositionForLink(flink,mainScrollDocDiv.scrollTop,secondScrollDiv,noteData)
                }

            }
            return
        }
        const noteData = this.rightNotesData[noteDataIndex]

        if (this.isFullScreen) {
            g.pdm.toggleFullScreen()
        }
        
        if (noteData.docType === 'c') {

            if(this.selectedRightDocIndex !== noteDataIndex){
                g.pdm.showTab(noteDataIndex)
                g.readingManager.redrawFlinks()
            }

            this.moveRightCollageInPositionForLink(flink,mainScrollDocDiv.scrollTop, topPanelHeight)


        }else if(noteData.docType === 'h'){
        

            if(this.selectedRightDocIndex !== noteDataIndex){
                g.pdm.showTab(noteDataIndex)
                g.readingManager.redrawFlinks()
            }

            const secondScrollDiv = noteData.scrollDiv
            this.scrollRightDocInPositionForLink(flink,mainScrollDocDiv.scrollTop,secondScrollDiv,noteData)
            
        }
    }


    async flinkPressedInRightDocument(flink,noteData){
        const secondDiv = noteData.scrollDiv
        if (this.mainDocType === 'c') {
            const scrollTop = secondDiv.scrollTop
            const topPanelHeight = g.pdm.getRightDocTopOffset(noteData)
            this.moveLeftCollageInPositionForLink(flink,scrollTop,topPanelHeight)
        }else if(this.mainDocType === 'h'){
            this.scrollMainDocInPositionForLink(flink,secondDiv,noteData)
        }
    }

    scrollRightDocInPositionForPoint(flink,leftY, rightScrollDiv, rightTopPanelHeight){

        if(flink.rightEndOutOfBounds){
            const neededRightScrollTop = rightScrollDiv.scrollHeight
            this.animateScroll(rightScrollDiv,neededRightScrollTop)
            return
        }

        const {rightTop,rightBottom} = flink

        const currentRightY = kLeftDivTop - rightScrollDiv.scrollTop + (rightTop + flink.topIndentHeight + rightBottom) / 2

        const neededRightScrollTop =  -leftY + rightTopPanelHeight + rightScrollDiv.scrollTop + currentRightY

        this.animateScroll(rightScrollDiv,neededRightScrollTop)

    }

    scrollRightDocInPositionForLink(flink,leftScrollTop, rightScrollDiv, noteData){
        
        if(flink.rightEndOutOfBounds){
            const neededRightScrollTop = rightScrollDiv.scrollHeight
            this.animateScroll(rightScrollDiv,neededRightScrollTop)
            return
        }

        const {leftTop,leftBottom, rightTop,rightBottom} = flink
        const topPanelHeight = g.pdm.getCurrentDocTopOffset()

        const rightTopPanelHeight = g.pdm.getRightDocTopOffset(noteData)

        const currentRightY = kLeftDivTop + rightTopPanelHeight - rightScrollDiv.scrollTop + (rightTop + flink.topIndentHeight + rightBottom) / 2

        const leftY = -leftScrollTop + kLeftDivTop + topPanelHeight + (leftTop - flink.bottomIndentHeight + leftBottom) / 2

        const neededRightScrollTop =  -leftY + rightScrollDiv.scrollTop + currentRightY

        this.animateScroll(rightScrollDiv,neededRightScrollTop)



    }



    scrollRightDocToShowFlink(flink, noteData){
        
        const rightScrollDiv = noteData.scrollDiv
        if(!rightScrollDiv)return

        if(flink.rightEndOutOfBounds){
            const neededRightScrollTop = rightScrollDiv.scrollHeight
            this.animateScroll(rightScrollDiv,neededRightScrollTop)
            return
        }

        const {rightTop,rightBottom} = flink
        const topPanelHeight = g.pdm.getCurrentDocTopOffset()

        const rightTopPanelHeight = g.pdm.getRightDocTopOffset(noteData)

        const currentRightY = kLeftDivTop + rightTopPanelHeight - rightScrollDiv.scrollTop + (rightTop + flink.topIndentHeight + rightBottom) / 2

        const leftY = (window.innerHeight - topPanelHeight) / 2

        const neededRightScrollTop =  -leftY + rightScrollDiv.scrollTop + currentRightY

        this.animateScroll(rightScrollDiv,neededRightScrollTop)



    }

    moveRightCollageInPositionForLink(flink, leftScrollTop, topPanelHeight) {
        const {leftTop,leftBottom} = flink

        const rightEnd = flink.rightEnds[0]
        const {x,y,radius} = rightEnd

        const leftY = -leftScrollTop + topPanelHeight + (leftTop - flink.bottomIndentHeight + leftBottom) / 2

        const noteData = this.rightNotesData[this.selectedRightDocIndex]

        noteData.collageViewer.movePointToCenter(x,y,radius,leftY)
    }


    moveLeftCollageInPositionForLink(flink,rightScrollTop,topPanelHeight){
        const {rightTop,rightBottom} = flink
        const leftEnd = flink.leftEnds[0]
        const {x,y,radius} = leftEnd

        const rightY = -rightScrollTop + topPanelHeight + (rightTop + flink.topIndentHeight + rightBottom) / 2

        this.mainCollageViewer.movePointToCenter(x,y,radius,rightY)

    }




    scrollMainDocInPositionForPoint(flink,rightY, topPanelHeight){

        const leftScrollDiv = document.getElementById("CurrentDocument")

        if(flink.leftEndOutOfBounds){
            const neededLeftScrollTop = leftScrollDiv.scrollHeight
            this.animateScroll(leftScrollDiv,neededLeftScrollTop)
            return
        }


        const {leftTop,leftBottom} = flink



        const currentLeftY = kLeftDivTop - leftScrollDiv.scrollTop + (leftTop - flink.bottomIndentHeight + leftBottom) / 2

        const neededLeftScrollTop =  -rightY + topPanelHeight + leftScrollDiv.scrollTop + currentLeftY

        this.animateScroll(leftScrollDiv,neededLeftScrollTop)

    }

    

    scrollMainDocInPositionForLink(flink,rightScrollDiv,noteData){
      
        const leftScrollDiv = document.getElementById("CurrentDocument")

        if(flink.leftEndOutOfBounds){
            const neededLeftScrollTop = leftScrollDiv.scrollHeight
            this.animateScroll(leftScrollDiv,neededLeftScrollTop)
            return
        }
        const {leftTop,leftBottom, rightTop,rightBottom} = flink


        const topPanelHeight = g.pdm.getCurrentDocTopOffset()

        const rightTopPanelHeight = g.pdm.getRightDocTopOffset(noteData)

        const rightY = kLeftDivTop + rightTopPanelHeight - rightScrollDiv.scrollTop + (rightTop + flink.topIndentHeight + rightBottom) / 2

        const currentLeftY = kLeftDivTop + topPanelHeight - leftScrollDiv.scrollTop + (leftTop - flink.bottomIndentHeight + leftBottom) / 2

        const neededLeftScrollTop =  -rightY + leftScrollDiv.scrollTop + currentLeftY

        this.animateScroll(leftScrollDiv,neededLeftScrollTop)


    }

    scrollMainDocToShowFlink(flink){
      
        const leftScrollDiv = document.getElementById("CurrentDocument")

        if(flink.leftEndOutOfBounds){
            const neededLeftScrollTop = leftScrollDiv.scrollHeight
            this.animateScroll(leftScrollDiv,neededLeftScrollTop)
            return
        }
        const {leftTop,leftBottom} = flink


        const topPanelHeight = g.pdm.getCurrentDocTopOffset()


        const rightY = (window.innerHeight - kLeftDivTop) / 2

        const currentLeftY = kLeftDivTop + topPanelHeight - leftScrollDiv.scrollTop + (leftTop - flink.bottomIndentHeight + leftBottom) / 2

        const neededLeftScrollTop =  -rightY + leftScrollDiv.scrollTop + currentLeftY

        this.animateScroll(leftScrollDiv,neededLeftScrollTop)


    }



      animateScroll(scrollableDiv,targetScrollTop) {
        const duration = 300; // Animation duration in milliseconds
      
        const startTime = performance.now();
        const startScrollTop = scrollableDiv.scrollTop;
      
        const that = this
        function scrollAnimation(currentTime) {
          const elapsedTime = currentTime - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          const easedProgress = that.easeInOutQuad(progress);
          const newScrollTop = startScrollTop + (targetScrollTop - startScrollTop) * easedProgress;
          
          scrollableDiv.scrollTop = newScrollTop;
      
          if (progress < 1) {
            requestAnimationFrame(scrollAnimation);
          }
        }
      
        requestAnimationFrame(scrollAnimation);
      }
      
      // Easing function for smoother animation (optional)
      easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }
    

    
    
    
    fixOneBrokenLink = (flink) => {
        const {leftText,rightText} = this.getLeftAndRightTexts()
        const flinksetHasChanges = this.fixFlink(flink,leftText,rightText)
        
      
        if(flinksetHasChanges){
            g.readingManager.applyFlinksOnTheLeft()
            g.readingManager.applyFlinksOnTheRight()
    
            this.checkIfFlinksWereChangedOnTheLeftSide()
            this.checkIfFlinksWereChangedOnTheRightSide()
    
           this.changesInReadingModeExist = true

        }

    }



    getLeftAndRightTexts = () => {
        const leftPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
        const leftText = this.mainDocType === 'h' ? getTextFromDiv(leftPresentationDiv) : ''

        const noteObj = this.rightNotesData[this.selectedRightDocIndex]


        let rightText = ''

        if(noteObj && noteObj.docType === 'h'){
            const secondDiv = noteObj.scrollDiv
            const secondPresentationDiv = getPresentationDivFrom(secondDiv)
            rightText = noteObj.docType === 'h' ?  getTextFromDiv(secondPresentationDiv) : ''
        }

        return {leftText,rightText}
    }


    fixBrokenFlinksOnTheLeftSide = () => {

        if (this.didFixLeftSideOnce) return

        const { leftText } = this.getLeftAndRightTexts()
        
        for (const flinksData of this.connections) {
            if (!flinksData.activeFlinks) continue
            
            let flinksetHasChanges = false
            for(let flink of flinksData.activeFlinks){
                const changeDetected = this.fixFlink(flink, leftText, '')
                if(changeDetected){
                    flinksetHasChanges = true
                }
            }

            
        }


        g.readingManager.applyFlinksOnTheLeft()


        this.changesInReadingModeExist = true

        this.didFixLeftSideOnce = true
    }

    revertToOriginalFlinks = () => {
        const noteObj = this.rightNotesData[this.selectedRightDocIndex]
        const flinksData = this.connections.find(con => con.url === noteObj.url)
        if (!flinksData || !flinksData.activeFlinks) return
        this.copyOriginalFlinks(flinksData)
        flinksData.flinksWereModifiedOnLeftSide = false
        flinksData.flinksWereModifiedOnRightSide = false
        this.checkIfFlinksAreBroken()
    }

    fixBrokenFlinks = () => {

        const noteObj = this.rightNotesData[this.selectedRightDocIndex]

        const {leftText,rightText} = this.getLeftAndRightTexts()

        const flinksData = this.connections.find(con => con.url === noteObj.url)

        if (!flinksData || !flinksData.activeFlinks) return
        
        let flinksetHasChanges = false
        for(let flink of flinksData.activeFlinks){
            const changeDetected = this.fixFlink(flink,leftText,rightText)
            if(changeDetected){
                flinksetHasChanges = true
            }
        }


        this.checkIfFlinksWereChangedOnTheLeftSide()
        this.checkIfFlinksWereChangedOnTheRightSide()
    

        g.readingManager.applyFlinksOnTheLeft()
        g.readingManager.applyFlinksOnTheRight()

       this.changesInReadingModeExist = true

    }


    fixFlink(flink,leftText,rightText){
        let flinksetHasChanges = false
        if((flink.leftSideIsBroken || flink.leftEndOutOfBounds) && !!leftText){
            const leftEnd = flink.leftEnds[0]
            const newIndices = this.getIndicesForLinkInText(leftText,leftEnd.index,leftEnd.hash,leftEnd.hIndex,leftEnd.hLength,leftEnd.leftHLetter,leftEnd.rightHLetter)
            if(newIndices){
                const {newStartIndex, newStartHIndex} = newIndices
                leftEnd.index = newStartIndex
                leftEnd.hIndex = newStartHIndex
                flink.leftSideIsBroken = false
                flink.leftEndOutOfBounds = false
                flinksetHasChanges = true
            }

        }
        if((flink.rightSideIsBroken || flink.rightEndOutOfBounds) && !!rightText){
            const rightEnd = flink.rightEnds[0]
            const newIndices = this.getIndicesForLinkInText(rightText,rightEnd.index,rightEnd.hash,rightEnd.hIndex,rightEnd.hLength,rightEnd.leftHLetter,rightEnd.rightHLetter)
            if (newIndices) {
                const {newStartIndex, newStartHIndex} = newIndices
                rightEnd.index = newStartIndex
                rightEnd.hIndex = newStartHIndex
                flink.rightSideIsBroken = false
                flink.rightEndOutOfBounds = false
                flinksetHasChanges = true
            }
        }
        return flinksetHasChanges
    }


    getIndicesForLinkInText(text,originalStartIndex,originalHash,originalHIndex,originalHLength,leftHLetter,rightHLetter){
        if (originalHLength.length > text.length) return null

        let newStartHIndex = 0

        let hashSubstring = ''
            
        let newStartIndex = -1

        let result;
        const lengthWithin = originalHLength - 2
        if(lengthWithin < 0)return null
     
        const reg = new RegExp(
        `(?=(${escapeRegExp(leftHLetter)}[\\s\\S]{${lengthWithin}}${escapeRegExp(rightHLetter)}))`,
        'g'
        );

        while ((result = reg.exec(text))) {
            const matchedText = result[1] || ''

            newStartHIndex = result.index

            const newHash = getShortHash(matchedText)
            
            if (newHash === originalHash) {
                newStartIndex = originalStartIndex - originalHIndex + newStartHIndex
                hashSubstring = matchedText
                break
            }

            reg.lastIndex = result.index + 1;
            
        }
        
        
        if(newStartIndex === -1)return null

        if(!hashSubstring)return null

        if (!isSubstringUniqueInText(hashSubstring, text)) {
            return null
        }

        return {newStartIndex, newStartHIndex}

     
    }

    async deleteOneFlink(flink){
        const flinksData = this.currentConnection
        if(!flinksData || !flinksData.activeFlinks)return

        const originalLength = flinksData.activeFlinks.length
        
        flinksData.activeFlinks = flinksData.activeFlinks.filter(item => item !== flink)

        if(flinksData.activeFlinks.length < originalLength){
            g.readingManager.applyFlinksOnTheLeft()
            g.readingManager.applyFlinksOnTheRight()
        }

        this.checkIfFlinksWereChangedOnTheLeftSide()
        this.checkIfFlinksWereChangedOnTheRightSide()


    }

    async deleteSelectedFlinks(){

        const flinksData = this.currentConnection
        if(!flinksData || !flinksData.activeFlinks)return
        const originalLength = flinksData.activeFlinks.length

        flinksData.activeFlinks = flinksData.activeFlinks.filter(item => !item.isSelected)

        if(flinksData.activeFlinks.length < originalLength){
            g.readingManager.applyFlinksOnTheLeft()
            g.readingManager.applyFlinksOnTheRight()
        }

        this.checkIfFlinksWereChangedOnTheLeftSide()
        this.checkIfFlinksWereChangedOnTheRightSide()

        this.redrawFlinks()

    }


    linkCreationButtonPressed(){
        if(this.isFullScreen)return
        const selObj = window.getSelection()
   
        const rightNoteData = this.rightNotesData[this.selectedRightDocIndex]
        if(this.mainCollageViewer && rightNoteData.collageViewer)return
  
        if(selObj.rangeCount !== 1){
            //if(selObj.rangeCount == 0){
                if(this.mainCollageViewer || rightNoteData.collageViewer){
                    this.isSelectingFlinkXY = true
                    if(this.mainCollageViewer)this.mainCollageViewer.changesExist = true
                    if(rightNoteData.collageViewer)rightNoteData.collageViewer.changesExist = true
                }
            //}
            return
        }
        const range = selObj.getRangeAt(0)

        if(range.collapsed){
            const rightNoteData = this.rightNotesData[this.selectedRightDocIndex]
            if(this.mainCollageViewer || rightNoteData.collageViewer){
                this.isSelectingFlinkXY = true
                if(this.mainCollageViewer)this.mainCollageViewer.changesExist = true
                if(rightNoteData.collageViewer)rightNoteData.collageViewer.changesExist = true
            }
            return
        }

        

        let leftPresentationDiv
        if(this.mainDocType === 'h'){
            leftPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
        }
        const noteData = this.rightNotesData[this.selectedRightDocIndex]


        let rightPresentationDiv
        let rightDiv = noteData.scrollDiv
        if(noteData.docType === 'h'){
            rightPresentationDiv = getPresentationDivFrom(rightDiv)
        }


        if(this.mainDocType === 'h' && this.isSelectionInDiv(leftPresentationDiv,selObj)){
            if(!this.partialLeftLink && !this.partialRightLink){
                this.createLeftPartialLink(leftPresentationDiv,range)
            }else if(!this.partialLeftLink && this.partialRightLink){
                this.createFullLink(leftPresentationDiv,rightPresentationDiv,range,null,false)
            }else if(this.partialLeftLink){
                this.removeLeftPartialLink()
                this.createLeftPartialLink(leftPresentationDiv,range)
            }

        }else if(noteData.docType === 'h' && this.isSelectionInDiv(rightPresentationDiv,selObj)){

            if(!this.partialLeftLink && !this.partialRightLink){
                this.createRightPartialLink(rightPresentationDiv,rightDiv,noteData,range)
            }else if(this.partialLeftLink && !this.partialRightLink){
                this.createFullLink(leftPresentationDiv,rightPresentationDiv,range,null,true)
            }else if(this.partialRightLink){
                this.removeRightPartialLink()
                this.createRightPartialLink(rightPresentationDiv,rightDiv,noteData,range)
            }
        }

        selObj.removeAllRanges()

        this.changesInReadingModeExist = true
        this.drawFlinksOnMiddleCanvas()

    }


    createLeftPartialLinkInCollage(x,y,radius){

        if(this.partialRightLink){
            const noteData = this.rightNotesData[this.selectedRightDocIndex]
            const secondDiv = noteData.scrollDiv
            const rightPresentationDiv = getPresentationDivFrom(secondDiv)
            this.createFullLink(null,rightPresentationDiv,null,{x,y,radius},false)
        }else{

            this.partialLeftLink = {
                type:'point',
                x,
                y,
                radius,
                color:addTransparencyToHexColor('#000000',0.3), 
            }
        }
    }

    createRightPartialLinkInCollage(x,y,radius){
        if(this.partialLeftLink){
            const leftPresentationDiv = document.getElementById("CurrentDocumentMainDiv")
            this.createFullLink(leftPresentationDiv,null,null,{x,y,radius},true)
        }else{
            this.partialRightLink = {
                type:'point',
                x,
                y,
                radius,
                color:addTransparencyToHexColor('#000000',0.3), 
            }
        }
    }

    createFullLink(leftDiv,rightDiv,range,pointData,usingLeftPartialLink = false){

        
        let isLeftText = false
        let isRightText = false
       
        const div = usingLeftPartialLink ? rightDiv : leftDiv

        let startIndex
        let length
        if(range){
            const rangeResult = getIndexAndLengthOfSelection(div,range)
            startIndex = rangeResult.startIndex
            length = rangeResult.length
        }

        const noteData = this.rightNotesData[this.selectedRightDocIndex]

        const flinksData = this.currentConnection
       // 
        let floatingLink
        if(usingLeftPartialLink){

            isLeftText = this.partialLeftLink.type === 'text'
            isRightText = !!range


            const leftEnd = isLeftText ? 
            new FLTextEnd(this.partialLeftLink.startIndex,this.partialLeftLink.length) :
            new FLPointEnd(this.partialLeftLink.x,this.partialLeftLink.y,this.partialLeftLink.radius)
            
            const rightEnd = isRightText ? 
            new FLTextEnd(startIndex,length) :
            new FLPointEnd(pointData.x,pointData.y,pointData.radius)

            
            floatingLink = new FloatingLink([leftEnd],[rightEnd],false) 

        }else{

            isLeftText = !!range
            isRightText = this.partialRightLink.type === 'text'

            const leftEnd = isLeftText ? 
            new FLTextEnd(startIndex,length) :
            new FLPointEnd(pointData.x,pointData.y,pointData.radius)
            const rightEnd = isRightText ?
            new FLTextEnd(this.partialRightLink.startIndex,this.partialRightLink.length) : 
            new FLPointEnd(this.partialRightLink.x,this.partialRightLink.y,this.partialRightLink.radius)

            floatingLink = new FloatingLink([leftEnd],[rightEnd],false)

        }

        floatingLink.color = flinksData.color
        floatingLink.color03 = addTransparencyToHexColor(flinksData.color,0.3)
        floatingLink.color05 = addTransparencyToHexColor(flinksData.color,0.5)
        
        
        
        if(!flinksData.activeFlinks)flinksData.activeFlinks = []
        flinksData.activeFlinks.push(floatingLink)

        this.addHashesToLink(floatingLink,isLeftText ? leftDiv : null,isRightText ? rightDiv : null)

        
        if(isLeftText || isRightText){
            if(isLeftText){

                const noteScrollDiv = document.getElementById("CurrentDocument")
        
                const textNodesArray = getTextNodesArrayFromDiv(leftDiv)
        
                const divX = g.pdm.getCurrentDocLeftVerticalPanelWidth()
        
                const topPanelHeight = g.pdm.getCurrentDocTopOffset()
        
                const topY = kLeftDivTop + topPanelHeight
        

                const fullTextLength = textNodesArray.reduce((total, node) => total + node.data.length, 0);


                this.prepareOneLeftLink(floatingLink,noteScrollDiv,textNodesArray,divX,topY,fullTextLength)
                
            }
            
            if(isRightText){
                const rightTextNodesArray = getTextNodesArrayFromDiv(rightDiv)
                const scrollDiv = noteData.scrollDiv

                const rightTextLength = rightTextNodesArray.reduce((total, node) => total + node.data.length, 0);
            
                const leftPanelWidth = noteData.currentDocLeftPanelShowing ? kVerticalPanelWidth : 0

                const divX = this.docWidth + kMiddleGap + leftPanelWidth
                const topY = kLeftDivTop + g.pdm.getRightDocTopOffset(noteData)

                this.prepareOneRightLink(floatingLink,scrollDiv,rightTextNodesArray,divX,topY,rightTextLength)
    
            }
    
            
            
            const fillColor = floatingLink.color03
            const isFlinkBroken = false
            const topLeft = floatingLink.leftTop
            const heightLeft = floatingLink.leftBottom - floatingLink.leftTop 
            
            if(isLeftText){
                this.addOneHightlightToDiv(leftDiv,'something','leftDocFlinkCanvas',fillColor,isFlinkBroken,topLeft,heightLeft,floatingLink.leftRects)
                floatingLink.isLeftSideDrawn = true
            }
            
    
            const topRight =  floatingLink.rightTop
            const heightRight = floatingLink.rightBottom - floatingLink.rightTop
            
            
            if(isRightText){
                this.addOneHightlightToDiv(rightDiv,'something','rightDocFlinkCanvas',fillColor,isFlinkBroken,topRight,heightRight,floatingLink.rightRects)
                floatingLink.isRightSideDrawn = true
            }

        }

       

        if(usingLeftPartialLink){
            this.removeLeftPartialLink()
        }else{
            this.removeRightPartialLink()
        }

        
        this.checkIfFlinksWereChangedOnTheLeftSide()
        this.checkIfFlinksWereChangedOnTheRightSide()
        g.pdm.updateCurrentDocExportButton()
    }


    createLeftPartialLink(notePresentationDiv,range){

       const {startIndex,length} = getIndexAndLengthOfSelection(notePresentationDiv,range)

       const textNodesArray = getTextNodesArrayFromDiv(notePresentationDiv)

       const verticalPanelWidth = g.pdm.getCurrentDocLeftVerticalPanelWidth()

       const divTop = kLeftDivTop + g.pdm.getCurrentDocTopOffset()

       const scrollDiv = document.getElementById("CurrentDocument")

        const leftRects = g.noteDivsManager.calculateHighlightPosition(scrollDiv,textNodesArray,startIndex,length,verticalPanelWidth,divTop)
        

        if(!leftRects.length)return

        const leftBottomRect = leftRects[leftRects.length - 1]


        this.partialLeftLink = {
            type:'text',
            startIndex,
            length,
            leftRects,
            color03:addTransparencyToHexColor('#000000',0.3),
            leftTop:leftRects[0].top,
            leftBottom:leftBottomRect.top + leftBottomRect.height
        }

        

        const fillColor = this.partialLeftLink.color03
        const isFlinkBroken = false
        const top = this.partialLeftLink.leftTop
        const height = this.partialLeftLink.leftBottom - this.partialLeftLink.leftTop 

        this.addOneHightlightToDiv(notePresentationDiv,'something','leftDocPartialLinkCanvas',fillColor,isFlinkBroken,top,height,this.partialLeftLink.leftRects)

    }

    createRightPartialLink(notePresentationDiv,rightScrollDiv, noteData, range){
        const {startIndex,length} = getIndexAndLengthOfSelection(notePresentationDiv,range)
        
        const verticalPanelWidth = noteData.currentDocLeftPanelShowing ? kVerticalPanelWidth : 0

        let rightX = this.docWidth + kMiddleGap + verticalPanelWidth

        const textNodesArray = getTextNodesArrayFromDiv(notePresentationDiv)

        const divTop = kLeftDivTop + g.pdm.getRightDocTopOffset(noteData)


        const rightRects = g.noteDivsManager.calculateHighlightPosition(rightScrollDiv,textNodesArray,startIndex,length,rightX,divTop)
        

        if(!rightRects.length)return

        const rightBottomRect = rightRects[rightRects.length - 1]

        this.partialRightLink = {
            type:'text',
            startIndex,
            length,
            rightRects,
            color03:addTransparencyToHexColor('#000000',0.3),
            rightTop:rightRects[0].top,
            rightBottom:rightBottomRect.top + rightBottomRect.height
        }

        

        const fillColor =  this.partialRightLink.color03
        const isFlinkBroken = false
        const top =  this.partialRightLink.rightTop
        const height =  this.partialRightLink.rightBottom -  this.partialRightLink.rightTop 

        this.addOneHightlightToDiv(notePresentationDiv,'something','rightDocPartialLinkCanvas',fillColor,isFlinkBroken,top,height,this.partialRightLink.rightRects)

    }


    removeLeftPartialLink(){
        const partialLinkCanvases = document.getElementsByClassName("leftDocPartialLinkCanvas")
        
        if(partialLinkCanvases.length){
            partialLinkCanvases[0].parentNode.removeChild(partialLinkCanvases[0])
        }
        this.partialLeftLink = null
    }

    removeRightPartialLink(){
        const partialLinkCanvases = document.getElementsByClassName("rightDocPartialLinkCanvas")
        
        if(partialLinkCanvases.length){
            partialLinkCanvases[0].parentNode.removeChild(partialLinkCanvases[0])
        }
        this.partialRightLink = null
    }


    isSelectionInDiv(divElement, selObj){
        if (!divElement || !selObj.anchorNode || !selObj.focusNode) return false
        return divElement.contains(selObj.anchorNode) && divElement.contains(selObj.focusNode)  
    }



    addHashesToLink(floatingLink,firstPresentationDiv,secondPresentationDiv){

        if(firstPresentationDiv){
            const leftText = getTextFromDiv(firstPresentationDiv) 
            const leftEnd = floatingLink.leftEnds[0]
            const {hashedLineStartIndex:leftHashedLineStart,hashedLineLength:leftHashedLineLength, hash:leftHash} = this.findUniqueHashLineInTextUsingBinarySearch(leftEnd.index,leftEnd.length,leftText)
            leftEnd.hash = leftHash
            leftEnd.hIndex = leftHashedLineStart
            leftEnd.hLength = leftHashedLineLength

            leftEnd.leftHLetter = leftText[leftHashedLineStart]
            leftEnd.rightHLetter = leftText[leftHashedLineStart + leftHashedLineLength - 1]
            

        }
        

        if(secondPresentationDiv){
            const rightText = getTextFromDiv(secondPresentationDiv) 
            const rightEnd = floatingLink.rightEnds[0]
            const {hashedLineStartIndex:rightHashedLineStart,hashedLineLength:rightHashedLineLength, hash:rightHash}  = this.findUniqueHashLineInTextUsingBinarySearch(rightEnd.index,rightEnd.length,rightText)
            rightEnd.hash = rightHash
            rightEnd.hIndex = rightHashedLineStart
            rightEnd.hLength = rightHashedLineLength

            rightEnd.leftHLetter = rightText[rightHashedLineStart]
            rightEnd.rightHLetter = rightText[rightHashedLineStart + rightHashedLineLength - 1]
            

        }
   


    }


    findUniqueHashLineInTextUsingBinarySearch(initialStartIndex,initialLength,text){

        const lineMinLength = Math.min(10,text.length)


        let firstLetterIndex = initialStartIndex
        let lastLetterIndex = firstLetterIndex + initialLength - 1

        let firstHashLetterIndex = firstLetterIndex
        let lastHashLetterIndex = lastLetterIndex

        if(initialLength < lineMinLength){
            initialStartIndex = initialStartIndex - (lineMinLength - initialLength)
            initialLength = lineMinLength
            if(initialStartIndex < 0){
                initialLength += initialStartIndex
                initialStartIndex = 0
            }
        }

    
        const line = text.substring(initialStartIndex,initialStartIndex + initialLength)
        if(isSubstringUniqueInText(line,text)){
            const hash = getShortHash(line)
            return {hashedLineStartIndex:initialStartIndex,hashedLineLength:initialLength, hash}
        }


        if(initialStartIndex > 0){
            //left part
            let leftEndIndex = 0
            let rightEndIndex = initialStartIndex

            const line = text.substring(0,initialStartIndex + initialLength)

            if(isSubstringUniqueInText(line,text)){
                while(rightEndIndex - leftEndIndex > 1){
                    const middleIndex = Math.floor((leftEndIndex + rightEndIndex) / 2)
                    const line = text.substring(middleIndex,lastHashLetterIndex + 1)
                    if(isSubstringUniqueInText(line,text)){
                        leftEndIndex = middleIndex
                    }else{
                        rightEndIndex = middleIndex
                    }
                }

                firstHashLetterIndex = leftEndIndex


                const hashedLineLength = lastHashLetterIndex - firstHashLetterIndex + 1
                const finalLine = text.substring(firstHashLetterIndex,lastHashLetterIndex + 1)
                const hash = getShortHash(finalLine)
                return {hashedLineStartIndex:firstHashLetterIndex,hashedLineLength, hash}
            }else{
                firstHashLetterIndex = 0
            }


        }
        
       
        //right part

        let leftEndIndex = lastLetterIndex
        let rightEndIndex = text.length - 1

        while(rightEndIndex - leftEndIndex > 1){
            const middleIndex = Math.floor((leftEndIndex + rightEndIndex) / 2)
            const line = text.substring(firstHashLetterIndex,middleIndex + 1)

            if(isSubstringUniqueInText(line,text)){
                rightEndIndex = middleIndex
            }else{
                leftEndIndex = middleIndex
            }
        }

        lastHashLetterIndex = rightEndIndex


        const hashedLineLength = lastHashLetterIndex - firstHashLetterIndex + 1
        const finalLine = text.substring(firstHashLetterIndex,lastHashLetterIndex + 1)

        const hash = getShortHash(finalLine)
        return {hashedLineStartIndex:firstHashLetterIndex,hashedLineLength, hash}

    }



    processEscape(){
        if(this.partialLeftLink){
            this.removeLeftPartialLink()
        }
        if(this.partialRightLink){
            this.removeRightPartialLink()
        }
        this.isSelectingFlinkXY = false
        if(this.mainCollageViewer){
            this.mainCollageViewer.changesExist = true
        }
        if(!this.isFullScreen){
            const rightNoteData = this.rightNotesData[this.selectedRightDocIndex]
            if(rightNoteData.collageViewer){
                rightNoteData.collageViewer.changesExist = true
            }

        }

    }


}

export default ReadingManager