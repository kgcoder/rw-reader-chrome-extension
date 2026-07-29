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
import { copyDataToClipboard, escapeXml, getConnectionsJSON, getConnectionsString, getShortHash, getTextNodesArrayFromDiv, removeAllChildren, roundValueForSVG, showToastMessage, unescapeHTML } from './helpers.js'

import { kLeftDivTop } from './PopupDocumentManager.js'

class ExportPageManager{

    exportFormat = 'xml'

    isRightDoc = false

    constructor(){
  

     
        this.data = [
            {type:'title',text:'Exporting Connections',marginTop:0},
            {type:'input',text:'Title'},

        ]

       
    }


    async renderSourceCode(mainDiv, noteData, isRightDoc = false) {
        this.isRightDoc = isRightDoc
        removeAllChildren(mainDiv)

        const containerHeight =  window.innerHeight - kLeftDivTop
        mainDiv.style.height = containerHeight + 'px'

        let text = noteData.xmlString

        let title = this.getSourceCodeTitleByDocSybtype(noteData.docSubtype) 


        this.addTextDiv(mainDiv,title,text, `${containerHeight - (!isRightDoc && !!g.readingManager.embeddedDocData ? 200 : 100)}px`,true)
    }


    getSourceCodeTitleByDocSybtype(docSubtype) {
        switch (docSubtype) {
            case 1:
                return 'Source code (standalone HDOC)'
            case 2:
                return 'Source code (generated locally using embedded HDOC data)'
            case 3:
                return 'Source code (generated locally using parsing rules)'
            case 4:
                return 'Source code (generated locally using text density analysis)'
            case 5:
                return 'Source code (CDOC)'
            case 7:
                return 'Source code (CONDOC)'
            case 8:
                return 'Source code (generated locally using embedded CDOC data)'
            case 9:
                return 'Source code (generated locally using embedded CONDOC data)'
            default:
                return 'Source code'
        }
    }


    async renderData(){


        const infoDiv = document.getElementById("CurrentDocumentExportContainer")
        removeAllChildren(infoDiv)

        const containerHeight =  window.innerHeight - kLeftDivTop
        infoDiv.style.height = containerHeight + 'px'
        
        for(const item of this.data){
            if(item.type === 'title'){
                this.addTitle(infoDiv,item.text,item.marginTop)
            }else if(item.type === 'input'){
                this.addInput(infoDiv,item.text)
            }
        }
        
        
         this.addTextDiv(infoDiv,'Text to export','')
        

        if(g.readingManager.mainDocType === 'h'){
            await this.getHDocTextForExport()

        }else if(g.readingManager.mainDocType === 'c'){
            await this.getCollageTextForExport()
        }


        this.addBottomButtons()


    }

    addTitle(parentDiv,title,marginTop){
        const titleDiv = document.createElement('div')
        titleDiv.className = "InfoTitle"
        titleDiv.style.marginTop = marginTop + 'px'
        titleDiv.innerText = title
        parentDiv.appendChild(titleDiv)
    }

    addInput(parentDiv,title){
        const containerDiv = document.createElement('div')
        containerDiv.id = 'ExportedHDocTitleContainer'
        containerDiv.className = "InfoLinkContianer"
        const titleDiv = document.createElement('div')
        titleDiv.className = "InfoLinkTitle"
        titleDiv.innerText = title
        containerDiv.appendChild(titleDiv)

        const rowDiv = document.createElement('div')
        rowDiv.className = "InfoLinkRowDiv"
        containerDiv.appendChild(rowDiv)

        const input = document.createElement('input')
        input.id = "ExportedHDocTitleInput"
        input.className = "GeneralInput"
        rowDiv.appendChild(input)

        input.addEventListener('input',this.titleChanged)

        parentDiv.appendChild(containerDiv)
    }

    addTextDiv(parentDiv, title = 'Text to export', text, textDivHeight = '300px', isForSourceCode = false) {
        const containerDiv = document.createElement('div')
        containerDiv.className = "ExportHDocContainer"
        

        if (isForSourceCode && !this.isRightDoc && g.readingManager.embeddedDocData) {
            const switchDiv = document.createElement('div')
                
                switchDiv.innerHTML = `
                <div id="docTypeSelectorInSourceCodeViewer">
                    <div id="docTypeSelectorCondocButton" class="linkInputTypeSelectorButton linkInputTypeSelectedButton">CONDOC</div>
                    <div id="linkInputTypeSelectorSeparator"></div>
                    <div id="docTypeSelectorEmbeddedDocButton" class="linkInputTypeSelectorButton linkInputTypeUnselectedButton">Main document</div>
                  </div>`
                
            containerDiv.appendChild(switchDiv)
    
            const leftButton = containerDiv.querySelector("#docTypeSelectorCondocButton")
            const rightButton = containerDiv.querySelector("#docTypeSelectorEmbeddedDocButton")
    
            leftButton.addEventListener('click', this.leftSwitchButtonPressed)
            rightButton.addEventListener('click',this.rightSwitchButtonPressed)
            
        }
        

        const titleDiv = document.createElement('div')
        titleDiv.id = 'SourceCodeTitleDiv'
        titleDiv.className = "InfoLinkTitle"
        titleDiv.innerText = title
        containerDiv.appendChild(titleDiv)

        const textDiv = document.createElement('div')
        textDiv.id = isForSourceCode ? "SourceCodeTextDiv" : "ExportTextDiv"
        textDiv.style.height = textDivHeight

        // textDiv.className = "InfoLinkRowDiv"   
        textDiv.style.marginBottom = '20px'   
        // textDiv.style.backgroundColor = 'yellow'  

       // textDiv.className = "ExportTextContainer"
        containerDiv.appendChild(textDiv)

        textDiv.innerText = text


        // const input = document.createElement('input')
        // input.className = "GeneralInput"
        // rowDiv.appendChild(input)

        parentDiv.appendChild(containerDiv)
    }



    titleChanged = (e) => {
        const title = e.target.value
        this.docmeta = title.trim() ? `\n\n<metadata>\n<title>${escapeXml(title.trim())}</title>\n</metadata>` : ''
        this.header = title.trim() ? `\n\n<header>\n<h1>${escapeXml(title.trim())}</h1>\n</header>` : ''

        const exportTextDiv = document.getElementById("ExportTextDiv")
        exportTextDiv.innerText = this.firstContentPart + this.docmeta + this.header + this.secondContentPart
    }






    async getHDocTextForExport() {
        
        const connectionsString = getConnectionsString()
        const exportTextDiv = document.getElementById("ExportTextDiv")
        exportTextDiv.textContent = connectionsString
        exportTextDiv.scrollTop = 0

        const inputContainer = document.getElementById("ExportedHDocTitleContainer")
        inputContainer.style.display = 'none'

    }



    async getCollageTextForExport(){
     
        const connectionsString = getConnectionsString()
        const exportTextDiv = document.getElementById("ExportTextDiv")
        exportTextDiv.textContent = connectionsString
        exportTextDiv.scrollTop = 0

        const inputContainer = document.getElementById("ExportedHDocTitleContainer")
        inputContainer.style.display = 'none'

    }


 

    leftSwitchButtonPressed = () => {
        const leftButton = document.querySelector("#docTypeSelectorCondocButton")
        leftButton.classList.add("linkInputTypeSelectedButton")
        leftButton.classList.remove("linkInputTypeUnselectedButton")
        
        const rightButton = document.querySelector("#docTypeSelectorEmbeddedDocButton")
        rightButton.classList.add("linkInputTypeUnselectedButton")
        rightButton.classList.remove("linkInputTypeSelectedButton")


        const sourceCodeTextDiv = document.querySelector("#SourceCodeTextDiv")

        sourceCodeTextDiv.innerText = g.readingManager.mainDocData.xmlString

        const titleEl = document.querySelector("#SourceCodeTitleDiv")

        titleEl.innerText = this.getSourceCodeTitleByDocSybtype(g.readingManager.mainDocData.docSubtype) 



    }

    rightSwitchButtonPressed = () => {
        const leftButton = document.querySelector("#docTypeSelectorCondocButton")
        leftButton.classList.add("linkInputTypeUnselectedButton")
        leftButton.classList.remove("linkInputTypeSelectedButton")
        
        const rightButton = document.querySelector("#docTypeSelectorEmbeddedDocButton")
        rightButton.classList.add("linkInputTypeSelectedButton")
        rightButton.classList.remove("linkInputTypeUnselectedButton")

        const sourceCodeTextDiv = document.querySelector("#SourceCodeTextDiv")
        sourceCodeTextDiv.textContent = g.readingManager.embeddedDocData.xmlString

        const titleEl = document.querySelector("#SourceCodeTitleDiv")


        titleEl.textContent = this.getSourceCodeTitleByDocSybtype(g.readingManager.embeddedDocData.docSubtype)



    }



    addTriangle(x2, y2, color, angle = 0) {
        const size = 10; // Size of the triangle
        const halfSize = size / 2;
      
        // Calculate points for the triangle
        const points = [
          { x: x2 - halfSize, y: y2 - halfSize },
          { x: x2, y: y2 },
          { x: x2 - halfSize, y: y2 + halfSize }
        ];
      
        // Rotate the triangle around (x2, y2) if needed
        const rotatedPoints = points.map(({ x, y }) => {
          const dx = x - x2;
          const dy = y - y2;
          return {
            x: roundValueForSVG(x2 + dx * Math.cos(angle) - dy * Math.sin(angle)),
            y: roundValueForSVG(y2 + dx * Math.sin(angle) + dy * Math.cos(angle))
          };
        });
      
        // Convert points to a string
        const pointsString = rotatedPoints
          .map(({ x, y }) => `${x},${y}`)
          .join(" ");
      
        // Return the serialized triangle
        return `<polygon points="${pointsString}" fill="${color}" />`;
      }


    copySourceCode = async () => {
        const exportTextDiv = document.getElementById("ExportTextDiv")
        const textFromDiv = exportTextDiv.textContent

        copyDataToClipboard(textFromDiv)

        showToastMessage('Source code was copied to clipboard')

    }

    changeExportFormat = async (e) => {
        e.stopPropagation()
        this.exportFormat = this.exportFormat === 'xml' ? 'json' : 'xml'

        const formatButton = document.getElementById("ExportFormatButton")
        formatButton.textContent = this.exportFormat === 'xml' ? 'Show JSON' : 'Show XML'


        let connectionsString
        if (this.exportFormat === 'xml') {
            connectionsString = getConnectionsString()
        } else {
            connectionsString = getConnectionsJSON()
        }
        
        const exportTextDiv = document.getElementById("ExportTextDiv")
        exportTextDiv.textContent = connectionsString
        exportTextDiv.scrollTop = 0
    
    }

    addBottomButtons(){
        const infoDiv = document.getElementById("CurrentDocumentExportContainer")


        const buttonsDiv = document.createElement('div')
        infoDiv.appendChild(buttonsDiv)

        buttonsDiv.style.display = 'flex'
        buttonsDiv.style.gap = '20px'



        const copyButton = document.createElement('div')
        copyButton.className = 'SimpleBlueButton'
        copyButton.innerHTML = 'Copy source code'
        buttonsDiv.appendChild(copyButton)
        copyButton.addEventListener('click', this.copySourceCode)

        const changeExportFormatButton = document.createElement('div')
        changeExportFormatButton.id = 'ExportFormatButton'
        changeExportFormatButton.className = 'SimpleBlueButton'
        changeExportFormatButton.innerHTML = 'Show JSON'
        buttonsDiv.appendChild(changeExportFormatButton)
        changeExportFormatButton.addEventListener('click', this.changeExportFormat)
            
    


    }


   


}


export default ExportPageManager