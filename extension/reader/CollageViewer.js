/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { loadCollageContentFromFile } from './CollageDataLoader.js'
import g from './Globals.js'
import { hideUrlInTheCorner, interpolate, isDotInsideFrame, mapUrlWithMappings, sanitizeUrl, showUrlInTheCorner, timestamp } from './helpers.js'
import Crosshair from './models/Crosshair.js'
import Viewport from './models/Viewport.js'
import { kLeftDivTop } from './PopupDocumentManager.js'

const touchState = {
    NOTHING: 'nothing',
    PANNING: 'panning',
    TWO_FINGER_ZOOM: 'two finger zoom',
}



class CollageViewer{

    vk = 0
    vx = 0
    vy = 0
    biggestZoom = 13000
    kZoomSpeed = 0.10
    zoomX = 0
    zoomY = 0
    isMouseDown = false
    lastMouseX = 0
    lastMouseY = 0
    lastMouseTime = 0
    lastMouseDownTime = 0
    mouseMoved = false
    kRLinkCircleRadius = 10

    currentTouchState = touchState.NOTHING

    numberOfFingers = 0


    collageInfo = null

    canvasWidth = window.innerWidth
    canvasHeight = window.innerHeight


    constructor(xmlString,url, rightDocIndex,docId,canvas,leftX,topY = 0,canvasWidth,callback){
        this.rightDocIndex = rightDocIndex
        this.docId = docId
        this.canvas = canvas
        this.isRight = rightDocIndex > -1
        this.canvasWidth = canvasWidth
        this.canvasHeight = window.innerHeight - topY
        this.url = url


        this.crosshair = new Crosshair(true)

        this.canvas.onwheel = this.zoom
        this.canvas.onmousedown = this.onMouseDown
        this.canvas.onmouseup = this.onMouseUp
        this.canvas.onmouseout = this.onMouseOut
        this.canvas.onmousemove = this.onMouseMove

        this.canvas.ontouchstart = this.canvasTouchStart
        this.canvas.ontouchmove = this.canvasTouchMove
        this.canvas.ontouchend = this.canvasTouchEnd


        this.canvas.ondblclick = this.onMouseDoubleClick
        this.canvas.onclick = this.onMouseClick

        this.ctx = canvas.getContext("2d")

        this.topY = topY
        this.leftX = leftX


        this.canvas.style.width = this.canvasWidth + 'px'
        this.canvas.style.height = `${this.canvasHeight}px`


        this.canvas.width = this.canvasWidth
        this.canvas.height = this.canvasHeight

        this.loadContent(xmlString,url,callback)
            
       
    }


    updateCanvasSize(canvasWidth, topY, leftX) {
        this.canvasWidth = canvasWidth
        this.canvasHeight = window.innerHeight - topY
        this.topY = topY
        this.leftX = leftX
        this.canvas.style.width = this.canvasWidth + 'px'
        this.canvas.style.height = `${this.canvasHeight}px`

        this.canvas.width = this.canvasWidth
        this.canvas.height = this.canvasHeight
    }

 
    centerCollage() {
        if(!this.content)return
        this.canvasWidth = g.readingManager.isFullScreen ? window.innerWidth : g.readingManager.docWidth
        const { k, horizontalOffset, verticalOffset } = this.getCentralPosition()

        const targetVieport = new Viewport(-horizontalOffset / k, -verticalOffset / k, this.canvasWidth, this.canvasHeight)
        

        const startX1 = this.viewport.origin.x
        const startY1 = this.viewport.origin.y
        const startY2 = this.viewport.origin.y + this.viewport.h / this.k

        const endX1 = targetVieport.origin.x
        const endY1 = targetVieport.origin.y
        const endY2 = targetVieport.origin.y + targetVieport.h / k
        
        this.animateViewPort(startX1,startY1,startY2,endX1,endY1,endY2)
        
        this.changesExist = true
    }

    updateViewport(x,y,k){
        if(this.content){
            this.k = k
            this.viewport.origin = {x,y}
            this.changesExist = true
        }else{
            this.updatedViewportParams = {x,y,k}
        }
    }

    

    async loadContent(xmlString,url, callback){
        this.content = await loadCollageContentFromFile(xmlString, url, this.docId)


      //  const {url,width,height} = this.content.info
        if(this.content){
            this.collageInfo = this.content.info
            const title = this.content.title ?? ''
            const titleSpan = this.getTitleSpan(title)
            if(titleSpan){
                if(this.rightDocIndex < 0){
                    titleSpan.innerText = url
                }else{
                    titleSpan.innerText = title
                }
            }

            if(this.content.copyInfo && this.content.copyInfo.mediaMappings){
                for(const image of this.content.images){
                    const newUrl = mapUrlWithMappings(image.url, this.content.copyInfo.mediaMappings)
                    if(newUrl !== image.url){
                        image.url = newUrl
                        image.image.src = newUrl
                    }
                }
            }
            

             if (this.content.copyInfo && this.rightDocIndex >= 0) {
                const noteData = g.readingManager.rightNotesData[this.rightDocIndex]
                noteData.copyInfo = this.content.copyInfo
                if (g.readingManager.selectedRightDocIndex === this.rightDocIndex) {
                    const rightDocumentCopyButton = document.getElementById("RightDocumentCopyButton")
                    if (rightDocumentCopyButton) rightDocumentCopyButton.style.display = 'flex'
                    if (this.content.copyInfo.original) {
                        const rightDocumentTitleLink = document.getElementById("RightDocumentTitleLink")
                        if (rightDocumentTitleLink) {
                            rightDocumentTitleLink.href = this.content.copyInfo.original
                            rightDocumentTitleLink.title = this.content.copyInfo.original
                        }
                        const titleSpan2 = document.getElementById("RightDocumentTitleSpan")
                        if (titleSpan2) titleSpan2.innerText = this.content.copyInfo.original
                    }

                 
                }


            }
            

        }

        if(callback)callback()



       
     

        const {k,horizontalOffset,verticalOffset} = this.getCentralPosition()
     
        
        this.kMin = this.getKMin()
        this.k = k


        this.viewport = new Viewport(-horizontalOffset / this.k, -verticalOffset / this.k, this.canvasWidth, this.canvasHeight)
    
        

        this.changesExist = true

        const noUrl = this.collageInfo && !this.collageInfo.url

        if(noUrl){
            

            this.loadContentFromCanvas()
          
        }

        if(this.updatedViewportParams){
            const {x,y,k} = this.updatedViewportParams
            this.k = k
            this.viewport.origin = {x,y}
            this.changesExist = true
            this.updatedViewportParams = null
        }

        setTimeout(() => {
            this.changesExist = true
        },10)


    }

    getTitleSpan(title){
        if(this.rightDocIndex < 0){
            return document.getElementById("CurrentDocumentTitleSpan")
        }else{
            const noteData = g.readingManager.rightNotesData[this.rightDocIndex]
            noteData.title = title
            return noteData.titleSpan
        }
    }

    async loadContentFromCanvas(){
        
        const {x,y,unitLength,width,height} = this.collageInfo

        const x2 = x + unitLength * width
        const y2 = y + unitLength * height
    
        const boundaryRect = {x1:x,y1:y,x2,y2}
    
        
        const result = await loadItemsInFrameIntoCollage(boundaryRect,this.isRight)
    
         

        const {lines,texts,images,links} = result
        const newLines = lines.map(item => item.getNewObjectByPuttingItIntoFrame(this.collageInfo))
        const newTexts = texts.map(item => item.getNewObjectByPuttingItIntoFrame(this.collageInfo))
        const newImages = images.map(item => item.getNewObjectByPuttingItIntoFrame(this.collageInfo,this))
        const newLinks = links.map(item => item.getNewObjectByPuttingItIntoFrame(this.collageInfo))



        this.content.lines = newLines
        this.content.texts = newTexts
        this.content.images = newImages
        this.content.links = newLinks

        

        this.changesExist = true

    }

    movePointToCenter(x,y,radius,targetYRel){

        if(!this.viewport)return
        const targetK = 10 / radius


        const targetXRel = g.readingManager.docWidth / 2

     
        const targetViewportX = x - (targetXRel/ targetK)
        const targetViewportY = y - (targetYRel/ targetK)



        const startX1 = this.viewport.origin.x
        const startY1 = this.viewport.origin.y
        const startY2 = this.viewport.origin.y + this.viewport.h / this.k

        const endX1 = targetViewportX
        const endY1 = targetViewportY
        const endY2 = targetViewportY + this.viewport.h / targetK

   
        
        this.animateViewPort(startX1,startY1,startY2,endX1,endY1,endY2)
        
    }


    animateViewPort(startX1,startY1,startY2,endX1,endY1,endY2){
        const time = 500
    
        const animationStartTime = Date.now()

        this.navigationAnimationParams = {startX1,startY1,startY2,endX1,endY1,endY2,animationStartTime,animationTime:time}

        
        this.isAnimatingNavigation = true


    }

    getCentralPosition() {
        const minGap = 40// px

        const { width, height } = this.content.info
        const canvasAspectRatio = this.canvasHeight / this.canvasWidth
        
        const collageAspectRatio = height / width

        const alignHorizontally = canvasAspectRatio > collageAspectRatio

        if (alignHorizontally) {

            const visibleWidth = this.canvasWidth - minGap * 2
            const k = visibleWidth / width
            const visibleHeight = height * k
            const horizontalOffset = minGap
            const verticalOffset = (this.canvasHeight - visibleHeight) / 2
            
            return {k,horizontalOffset,verticalOffset}

        } else {

            const visibleHeight = this.canvasHeight - minGap * 2
            const k = visibleHeight / height
            const visibleWidth = width * k
            const verticalOffset = minGap
            const horizontalOffset = (this.canvasWidth - visibleWidth) / 2
            return {k,horizontalOffset,verticalOffset}



            
        }

    }
    getKMin(){
        const minRDimenstion = 200

        const { width, height } = this.content.info
        
        if (width > height) {
            return minRDimenstion / width
        } else {
            return minRDimenstion / height 
        }
 
    }


    frame(dt){

      

       if(!this.changesExist && !this.isAnimatingNavigation)return
      

        if(this.content && this.viewport){
            this.update(dt)
            this.render()
        }

        this.changesExist = false
    }


    update(deltaT) {
        if(!this.content)return

        this.canvasWidth = !g.readingManager.isFullScreen ? g.readingManager.docWidth : window.innerWidth
        this.canvasHeight = window.innerHeight - this.topY
        
        this.viewport.w = this.canvasWidth
        this.viewport.h = this.canvasHeight
    
        this.fps = 1/deltaT
        //  this.verticalSideOffset = window.innerWidth * 0.1
        this.kMin = this.getKMin()
        const sideOffset = 50// kMin * this.content.info.width / 2

        

    
        if(this.isAnimatingNavigation){
            this.vx = 0
            this.vy = 0
            this.vk = 0
    
            const {
                startX1,startY1,startY2,
                endX1,endY1,endY2,
                animationStartTime,animationTime
            } = this.navigationAnimationParams
    
    
    
            const now = Date.now()
          //   
           //  if(now - animationStartTime > 20){
                 const currentX1 = interpolate(animationStartTime, 0, startX1, endX1, now, animationTime,'easeInOut')
                 const currentY1 = interpolate(animationStartTime, 0, startY1, endY1, now, animationTime,'easeInOut')
                 const currentY2 = interpolate(animationStartTime, 0, startY2, endY2, now, animationTime,'easeInOut')
         
              
                 const currentHeight = currentY2 - currentY1

                 const viewHeight = window.innerHeight - kLeftDivTop
         
                 const currentK = viewHeight / currentHeight
         
                
                 this.viewport.updateOrigin(currentX1,currentY1)
         
              //   
              //   
                // isAnimatingNavigation = false
                 this.k = currentK
                 
                 if(now > animationStartTime + animationTime){
                     this.isAnimatingNavigation = false
                     const endHeight = endY2 - endY1
                     const endK = viewHeight / endHeight
                     this.viewport.updateOrigin(endX1,endY1)
                     this.k = endK
         
                    // stopsNavigator.createStop()
    
                     this.shouldRecalculateHighlightsPositions = true
                 }
    
           //  }
    
    
            
        }
    
    
    
        const oldVk = this.vk
        this.vk -= (this.vk / 0.2) * deltaT

        
    
        if ((oldVk > 0 && this.vk < 0) || (oldVk < 0 && this.vk > 0) || Math.abs(this.vk) <= 0.002) {
            if(this.vk !== 0){
                this.vk = 0
            }
    
        }
        const oldK = this.k
        const oldOffsetX = this.viewport.origin.x
        const oldOffsetY = this.viewport.origin.y
    
       // 
        let newK = this.k + this.vk * this.k
    
        this.vk = 0
        
    
    
        if (newK > this.kMin && newK < this.biggestZoom || (oldK < this.kMin || oldK > this.biggestZoom)) {
            if (oldK >= this.kMin || newK > oldK) {
                this.k = newK
            }
        } else {
            if(newK > this.biggestZoom){
                this.k = this.biggestZoom
            }else if(newK < this.kMin){
                // 
                // 
                this.k = this.kMin
            }
            this.vk = 0
        }
    
        let newOffsetX = (this.zoomX / oldK) - (this.zoomX / this.k) + oldOffsetX
        let newOffsetY = (this.zoomY / oldK) - (this.zoomY / this.k) + oldOffsetY
    
        if (newOffsetX * this.k < sideOffset - this.canvasWidth) {
            newOffsetX = (sideOffset - this.canvasWidth) / this.k
            this.vx = 0
            this.vy = 0
            // vk = 0
        }
    
        if (this.content.info.width - newOffsetX < sideOffset / this.k) {
            newOffsetX = this.content.info.width - sideOffset / this.k
            this.vx = 0
            this.vy = 0
            //vk = 0
        }

        


        if (newOffsetY * this.k < sideOffset - this.canvasHeight) {
            newOffsetY = (sideOffset - this.canvasHeight) / this.k
            this.vx = 0
            this.vy = 0
            // vk = 0
        }
    
        if (this.content.info.height - newOffsetY < sideOffset / this.k) {
            newOffsetY = this.content.info.height - sideOffset / this.k
            this.vx = 0
            this.vy = 0
            //vk = 0
        }
    
   
        this.viewport.updateOrigin(newOffsetX,newOffsetY)
    
    
        
    
     //   updateConnectionLines()
    
       // this.movementManager.updateScalingParams()
    
    
        this.vx -= (this.vx / 0.20) * deltaT
        if (Math.abs(this.vx) * this.k <= 5.0) {
            if(this.vx !== 0){
                this.vx = 0
            }
        }
    
        this.vy -= (this.vy / 0.20) * deltaT
        if (Math.abs(this.vy) * this.k <= 5.0) {
            if(this.vy !== 0){
                this.vy = 0
            }
        }

        

        this.changesExist = true

       // if(!g.readingManager.isFullScreen){
            g.readingManager.changesInReadingModeExist = true
            g.readingManager.drawFlinksOnMiddleCanvas()
      //  }

    }


    render() {

        this.canvas.style.width = `${this.canvasWidth}px`
        this.canvas.style.height = `${this.canvasHeight}px`

   
        this.viewport.w = this.canvasWidth
        this.viewport.h = this.canvasHeight



        this.setupDPR()

  
    
        this.drawMainRect()

        const {lines,images,texts,links,linkRects} = this.content

        for (const image of images) {
            image.drawInCollage(this)
        }
        for(const text of texts){
            text.drawInCollage(this)
        }
        for(const link of links){
            link.drawInCollage(this)
        }
        for(const line of lines){
            line.drawInCollage(this)
        }


        // if(linkRects){
        //     for(const linkRect of linkRects){
        //         const {minX,minY,maxX,maxY} = linkRect
        //         let {x1rel,y1rel,x2rel,y2rel} = this.getRelativeBoundingRect(minX, minY, maxX, maxY)

        //         this.ctx.beginPath()
        //         this.ctx.rect(x1rel,y1rel,x2rel - x1rel,y2rel - y1rel)
        //         this.ctx.strokeStyle = "orange";
        //         this.ctx.stroke();
        //     }
        // }





        if(g.readingManager.isSelectingFlinkXY){
            const {x,y} = this.crosshair
            this.ctx.beginPath()
            this.ctx.arc(x, y, this.kRLinkCircleRadius , 0, 2 * Math.PI);
            this.ctx.fillStyle = "orange";
            this.ctx.fill();
        }

        this.drawPartialLink()


    }

    setupDPR() {
        var dpr = window.devicePixelRatio || 1
        var rect = this.canvas.getBoundingClientRect()
        this.canvas.width = rect.width * dpr
     
        this.canvas.height = rect.height * dpr
    
        this.ctx.scale(dpr, dpr)

    }


    drawMainRect(){
        //
        const {width,height} = this.content.info
        const mainImage = this.content.mainImage

        const x = (0 - this.viewport.origin.x) * this.k
        const y =( 0 - this.viewport.origin.y) * this.k

        const rWidth = width * this.k 
        const rHeight = height * this.k

        if(this.collageInfo.backgroundColor){
            this.ctx.beginPath()
            this.ctx.fillStyle = this.collageInfo.backgroundColor
            this.ctx.rect(x,y,rWidth,rHeight)
            this.ctx.fill()
        }


        if(mainImage && mainImage.isLoaded){
            this.ctx.beginPath()
            this.ctx.drawImage(
                mainImage,  
                 0,
                0,
                width,
                height,
                x,
                y,
                rWidth,
                rHeight);
        }





        this.ctx.beginPath()
        this.ctx.strokeStyle = '#C5C5C5'
        this.ctx.rect(x,y,rWidth,rHeight)
        this.ctx.stroke()
    }


    drawPartialLink(){
        if(!this.viewport || !this.viewport.origin)return
        let x
        let y
        let radius
        if(this.isRight){
            if(g.readingManager.partialRightLink){
                x = g.readingManager.partialRightLink.x
                y = g.readingManager.partialRightLink.y
                radius = g.readingManager.partialRightLink.radius
            }else{
                return
            }
        }else{
            if(g.readingManager.partialLeftLink){
                x = g.readingManager.partialLeftLink.x
                y = g.readingManager.partialLeftLink.y
                radius = g.readingManager.partialLeftLink.radius
            }else{
                return
            }
        }


         const relCoordinates = this.getRelativePoint(x,y) 
        if(!relCoordinates)return
        const {xRel, yRel} = relCoordinates

        this.ctx.beginPath()
        this.ctx.arc(xRel, yRel, radius * this.k , 0, 2 * Math.PI);
        this.ctx.fillStyle = "orange";
        this.ctx.fill();


    }



    getRelativeBoundingRect(x1, y1, x2, y2){

        const x1rel = (x1 - this.viewport.origin.x) * this.k
        const x2rel = (x2 - this.viewport.origin.x) * this.k
    
        const y1rel = (y1 - this.viewport.origin.y) * this.k
        const y2rel = (y2 - this.viewport.origin.y) * this.k
    
        return {x1rel,y1rel,x2rel,y2rel}
    }

    getAbsolutePoint(xRel,yRel){
        const x = this.viewport.origin.x + (xRel / this.k)
        const y = this.viewport.origin.y + (yRel / this.k)

        return {x,y}

    }

    getRelativePoint(x, y){
        if(!this.viewport || !this.viewport.origin)return null
        const xRel = (x - this.viewport.origin.x) * this.k - this.canvas.scrollLeft
    
        const yRel = (y - this.viewport.origin.y) * this.k - this.canvas.scrollTop
    
        return {xRel,yRel}
    }

    updateWidth = (width) => {
        this.canvasWidth = width
        if(this.isLoaded){
            this.onresize()
        }
    }


    onresize = () => {
        

        const newWidth = this.canvasWidth
        const newHeight = window.innerHeight - this.topY

        this.canvas.width = newWidth
        this.canvas.height = newHeight
        this.canvas.style.width = `${newWidth}px`
        this.canvas.style.height = `${newHeight}px`

        this.viewport.w = newWidth
        this.viewport.h = newHeight

        this.changesExist = true

    }



    //Actions

    zoom = (e) => {
        
        if(this.mouseIdlenessTimer){
            clearTimeout(this.mouseIdlenessTimer)
        }


        
       // hideTooltip()


        
        //if(g.editor.editingMode === 'typingLink')return
        this.vx = 0
        this.vy = 0
        this.zoomX = this.crosshair.x
        this.zoomY = this.crosshair.y


        if (e.deltaY < 0) {
            if(this.k > this.biggestZoom){
                this.vk = 0
            }else{
                this.vk = this.kZoomSpeed
            }
        } else if (e.deltaY > 0) {
            if(this.k < this.kMin){
                this.vk = 0
            }else{
                this.vk = -this.kZoomSpeed

            }
        }


       // if(g.editor.editingMode === 'typingText')cancelTypingText()

        this.changesExist = true
       

        this.crosshair.changeCursorIfNeeded()

       // if(!g.readingManager.isFullScreen){
            g.readingManager.changesInReadingModeExist = true
            g.readingManager.drawFlinksOnMiddleCanvas()
       // }
    }
    onMouseDown = (e) => {
        if (e.button !== 0) return
        if(!this.viewport || !this.viewport.origin)return
        const mouseX = e.pageX - this.leftX - g.pdm.getMainLeftOffset()
        const mouseY = e.pageY - this.topY

        if(this.vk !== 0){
            this.vk = 0
        }
        this.offsetXOnMouseDown = this.viewport.origin.x
        this.offsetYOnMouseDown = this.viewport.origin.y
        

        
        this.vx = 0
        this.vy = 0

        
        this.isMouseDown = true
        this.lastMouseX = mouseX
        this.lastMouseY = mouseY
        this.mouseAbsX = mouseX/ this.k + this.viewport.origin.x
        this.mouseAbsY = mouseY / this.k + this.viewport.origin.y
        this.lastMouseTime = timestamp()
        this.lastMouseDownTime = timestamp()

        this.mouseMoved = false

    }
    onMouseUp = (e) => {
        if (this.isMouseDown) {
            this.isMouseDown = false

            if(!this.mouseMoved){
                if(g.readingManager.isSelectingFlinkXY){
                    const mouseX = e.pageX - this.leftX - g.pdm.getMainLeftOffset()
                    const mouseY = e.pageY - this.topY

                    const {x,y} = this.getAbsolutePoint(mouseX,mouseY)

                    const absRadius = this.kRLinkCircleRadius / this.k
                    

                    g.readingManager.isSelectingFlinkXY = false

                    if(this.isRight){
                        g.readingManager.createRightPartialLinkInCollage(x,y,absRadius)
                    }else{
                        g.readingManager.createLeftPartialLinkInCollage(x,y,absRadius)
                    }

                    this.changesExist = true
                }
            }
        }
    }
    onMouseOut = () => {
        this.isMouseDown = false
        this.vx = 0
        this.vy = 0
        g.readingManager.isSelectingFlinkXY = false
    }
    onMouseMove = (e) => {

        this.mouseMoved = true
        if (!this.viewport) return

        const mouseX = e.pageX - this.leftX - g.pdm.getMainLeftOffset()
        const mouseY = e.pageY - this.topY
        this.crosshair.mouseMoved(mouseX, mouseY)

        // 


        if (this.isMouseDown) {
            this.changesExist = true


            const now = timestamp()
            const dt = (now - this.lastMouseTime) / 1000

        
            this.vx = -(mouseX - this.lastMouseX) / (this.k * dt)
            this.vy = -(mouseY - this.lastMouseY) / (this.k * dt)


            this.lastMouseX = mouseX
            this.lastMouseY = mouseY


            const newOffsetX = this.mouseAbsX - mouseX / this.k
            const newOffsetY = this.mouseAbsY - mouseY / this.k


            this.viewport.origin.x = newOffsetX
            this.viewport.origin.y = newOffsetY


            
        

            this.lastMouseTime = now


          //  if(!g.readingManager.isFullScreen){
                g.readingManager.changesInReadingModeExist = true
                g.readingManager.drawFlinksOnMiddleCanvas()
          //  }

        }else{
            this.mouseAbsX = mouseX / this.k + this.viewport.origin.x
            this.mouseAbsY = mouseY / this.k + this.viewport.origin.y


           // 

            let linkThatMouseTouches = null
            for (let link of this.content.links){
                if(link.isLocal)continue
                
                
                

                if(link.didMouseHitLink(this.mouseAbsX,this.mouseAbsY)){
                    
                  const  heightRel = link.totalHeight * this.k
                  if(heightRel < kMinVisibleElementSize || heightRel > 2000)continue

                  linkThatMouseTouches = link.linkAddress
                  
                  break
                  
                }
            }


            if(this.content.linkRects){
                for(const linkRect of this.content.linkRects){
    
                    if(isDotInsideFrame(this.mouseAbsX,this.mouseAbsY,linkRect)){
                        linkThatMouseTouches = linkRect.url
                    }
                }
            }

            if(this.showPointerForFlink){
                this.canvas.style.cursor = 'pointer'
                hideUrlInTheCorner()
            }else if(linkThatMouseTouches){
                this.canvas.style.cursor = 'pointer'
                showUrlInTheCorner(linkThatMouseTouches)
            }else{
                this.canvas.style.cursor = 'default'
                hideUrlInTheCorner()
            }



     
        }

        if(g.readingManager.isSelectingFlinkXY){
            this.changesExist = true
        }

    }
    onMouseDoubleClick = () => {

    }
    onMouseClick = (e) => {
        if(!this.content)return

        const mouseX = e.pageX - this.leftX - g.pdm.getMainLeftOffset()
        const mouseY = e.pageY - this.topY

        const {x,y} = this.getAbsolutePoint(mouseX,mouseY)


        const {links,linkRects} = this.content



        let smallestWidth = g.worldSize

        let selectedType = ''
        let selectedObj = null


        for (const link of links){
            
            if(link.didMouseHitLink(x,y)){
                e.stopPropagation()
                const  heightRel = link.totalHeight * this.k
                if(heightRel < kMinVisibleElementSize || heightRel > 2000)continue

                const width = link.textWidth * this.k


                if(width < smallestWidth && (g.editor.editingMode === 'none' || link.isLocal) ){
                    smallestWidth = width
                    selectedType = 'link'
                    selectedObj = link
                }
                                    
            }
        }

        if(linkRects){
            for(const linkRect of linkRects){
                if(isDotInsideFrame(x,y,linkRect)){
                    e.stopPropagation()
                    hideUrlInTheCorner()
                    window.open(linkRect.url)

                   return
                }
            }
        }


        if(selectedObj){
            switch(selectedType){
                // case 'image':{
                //     let ratio = undefined
                //     if(parentFrame){
                //         const {x1,x2} = parentFrame.getBoundingRect()
                //         ratio = (x2 - x1) / parentFrame.width
                        
                //     }
                //   // 

                  

                //     g.wn.navigateToImage(selectedObj,parentFrame,ratio)
                //     break}
             
                case 'link':{
                    const link = selectedObj
                    hideUrlInTheCorner()
                    const linkUrl = sanitizeUrl(link.linkAddress)
                    if (linkUrl) {
                        window.open(linkUrl)
                    }

                    break
                }
                // case 'textView':{
                //     if(g.movementManager.areSelectedItemsPackaged)return
                //     const note = selectedObj
                //     g.pdm.loadDocumentIn2D(note,selectedSquare)
                //     break
                // }
               
                
                break
                default:
                    break
            }
        }




    }


    //Touches

    canvasTouchStart = (e) =>  {
        e.stopPropagation()

        this.numberOfFingers = e.touches.length
        this.vx = 0
        this.vy = 0



    if (this.numberOfFingers === 2) {
        this.currentTouchState = touchState.TWO_FINGER_ZOOM
        const x1 = e.touches[0].pageX
        const y1 = e.touches[0].pageY
        const touch1Id = e.touches[0].identifier
        const x2 = e.touches[1].pageX
        const y2 = e.touches[1].pageY
        const touch2Id = e.touches[1].identifier


      const finger1AbsX = this.viewport.origin.x + x1 / this.k
      const finger1AbsY = this.viewport.origin.y + y1 / this.k
      const finger2AbsX = this.viewport.origin.x + x2 / this.k
      const finger2AbsY = this.viewport.origin.y + y2 / this.k
      this.twoTouches = {
          [touch1Id]:{absX: finger1AbsX, absY:finger1AbsY},
          [touch2Id]:{absX: finger2AbsX, absY:finger2AbsY},
      }


    } else if (this.numberOfFingers === 1) {

        this.currentTouchState = touchState.PANNING

        const pageX = e.touches[0].pageX
        const pageY = e.touches[0].pageY
        this.singleFingerX = pageX
        this.singleFingerY = pageY
        this.singleTouchAbsX = this.viewport.origin.x + pageX / this.k
        this.singleTouchAbsY = this.viewport.origin.y + pageY / this.k

        this.isSingleFingerDown = true

        this.lastFingerX = pageX
        this.lastFingerY = pageY
        this.lastFingerTime = timestamp()
        this.lastFingerDownTime = timestamp()

        this.longPressFingerX = pageX
        this.longPressFingerY = pageY

    }
}


canvasTouchMove = (e) => {
    e.stopPropagation()

    e = e.originalEvent || e;
    if (e.scale !== 1) {
        e.preventDefault();
    }





    if (this.numberOfFingers === 2 && this.currentTouchState === touchState.TWO_FINGER_ZOOM) {

        const x1 = e.touches[0].pageX 
        const y1 = e.touches[0].pageY
        const touch1Id = e.touches[0].identifier

        const x2 = e.touches[1].pageX
        const y2 = e.touches[1].pageY
        const touch2Id = e.touches[1].identifier


        const touch1Data = this.twoTouches[touch1Id]
        const touch2Data = this.twoTouches[touch2Id]

        const absDistance = Math.sqrt((touch2Data.absX - touch1Data.absX) ** 2 + (touch2Data.absY - touch1Data.absY) ** 2)
        const rDistance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        
        const newK = rDistance / absDistance

        this.kMin = this.getKMin()


        const oldK = this.k

        this.k = Math.max(newK,this.kMin)

        const originX = touch1Data.absX - x1 / this.k    
        const originY = touch1Data.absY - y1 / this.k    


        this.viewport.updateOrigin(originX,originY)

        this.changesExist = true

    } else if (this.numberOfFingers === 1 && this.currentTouchState === touchState.PANNING) {
        const pageX = e.touches[0].pageX
        const pageY = e.touches[0].pageY
 
        const now = timestamp()
        const dt = (now - this.lastFingerTime) / 1000


        if (dt === 0) {
            this.vx = 0
        } else {
            this.vx = -(pageX - this.lastFingerX) / (this.k * dt)
            this.vy = -(pageY - this.lastFingerY) / (this.k * dt)

        }

        this.lastFingerX = pageX
        this.lastFingerY = pageY

        const newOffsetX = this.singleTouchAbsX - pageX / this.k
        const newOffsetY = this.singleTouchAbsY - pageY / this.k

        this.viewport.origin.x = newOffsetX
        this.viewport.origin.y = newOffsetY

        this.lastFingerTime = now

        this.changesExist = true

    }


}




canvasTouchEnd = (e) => {
    e.stopPropagation()
    this.numberOfFingers = e.touches.length

    switch (this.currentTouchState) {
        case touchState.PANNING: {

            if (this.numberOfFingers === 0) {
                this.currentTouchState = touchState.NOTHING   
            }
            break
        }
        case touchState.TWO_FINGER_ZOOM: {
            if (this.numberOfFingers < 2) {
                this.currentTouchState = touchState.NOTHING
            }
            break
        }
    }


}



    //Touches - end


}


export default CollageViewer