/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

class Line {


    constructor(x1, y1, x2, y2, length, color = 'black',isArrow = false,isInvisible = false) {
    

      this.x1 = x1
      this.y1 = y1
      this.x2 = x2
      this.y2 = y2
      this.length = length

      this.color = color
      this.isSelected = false
      this.isArrow = isArrow
      

      this.isInvisible = isInvisible
      
 
    }

    getSVGString(){
      const {x1, y1, x2, y2,color,isArrow,isInvisible} = this


      
      return `<line x1="${roundValueForSVG(x1)}" y1="${roundValueForSVG(y1)}" x2="${roundValueForSVG(x2)}" y2="${roundValueForSVG(y2)}" stroke="${color}" stroke-width="1" vector-effect="non-scaling-stroke" />`

    }

    getString(){
      const {x1,y1,x2,y2,length,color,isArrow,isInvisible} = this

      const finalColor = color === 'black' || color === '#000' || color === '#000000' || color === 'rgb(0,0,0)' ? '' : color

     // const newLength = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2)


     const data = {
      x1,y1,x2,y2,l:length
     }

     if(isArrow){
      data.t = 'a'
     }

     if(finalColor){
      data.c = finalColor  //color
     }

     if(isInvisible){
      data.i = 1
     }


      return JSON.stringify(data) 
    }

    static getObjectFromDataString(dataString){


       const dataObj = JSON.parse(dataString)
       const {x1,y1,x2,y2,l:length,t:type,c:color,fid,i:invisible} = dataObj

      const isArrow = type === 'a'

      const finalColor = color ? color : 'black'

      const isInvisible = invisible === 1

      return new Line(x1,y1,x2,y2,length,finalColor,isArrow,isInvisible)
    }



    getNewObjectBySubtractingPoint(x,y){
      return this.getNewObjectByAddingPoint(-x,-y)
    }

    getNewObjectByAddingPoint(x,y){
      const { x1, y1, x2, y2, length, color,isArrow,isInvisible} = this
      const newLine = new Line(
        x1 + x,
        y1 + y,
        x2 + x,
        y2 + y,
        length, color,isArrow,isInvisible
      )
      return newLine
    }


    getNewObjectByPuttingItIntoFrame(collageInfo){
      const {x,y,unitLength} = collageInfo
      const { x1, y1, x2, y2, color,isArrow,isInvisible} = this

      const newX1 = (x1 - x) / unitLength
      const newY1 = (y1 - y) / unitLength
      const newX2 = (x2 - x) / unitLength
      const newY2 = (y2 - y) / unitLength

      const newLength = Math.sqrt(Math.pow(newX2 - newX1,2) + Math.pow(newY2 - newY1,2))

      const newLine = new Line(
        newX1,
        newY1,
        newX2,
        newY2,
        newLength, color,isArrow,isInvisible
      )
      return newLine
    }

    getNewObjectByScaling(){
      let {x1,y1,x2,y2,color,isArrow,isInvisible} = this
      const scalingAnchorPoint = g.movementManager.isOptionPressed ? g.movementManager.scalingCenterAnchorPoint : g.movementManager.scalingAnchorPoint
      const {x:scalingAnchorPointX,y:scalingAnchorPointY} = scalingAnchorPoint
      const tempX1 = x1 - scalingAnchorPointX
      const tempX2 = x2 - scalingAnchorPointX
      const tempY1 = y1 - scalingAnchorPointY
      const tempY2 = y2 - scalingAnchorPointY

      if(!g.movementManager.scalingParams)return
      const {scalingFactor} = g.movementManager.scalingParams

      const newX1 = scalingAnchorPointX + tempX1 * scalingFactor
      const newY1 = scalingAnchorPointY + tempY1 * scalingFactor 

      const newX2 = scalingAnchorPointX + tempX2 * scalingFactor
      const newY2 = scalingAnchorPointY + tempY2 * scalingFactor

      const newLength = Math.sqrt((newX2 - newX1)**2 + (newY2 - newY1)**2)

      const newLine = new Line(
        newX1,
        newY1,
        newX2,
        newY2,
        newLength,color,isArrow,isInvisible
      )

      return newLine

    }

    

    getNewObjectByMakingItRelative(mouseX,mouseY){
      const { x1, y1, x2, y2,color,isArrow,isInvisible} = this
      const {x1rel,y1rel,x2rel,y2rel} = getRelativeBoundingRect(x1, y1, x2, y2)

      const length = Math.sqrt((x2rel-x1rel) ** 2 + (y2rel-y1rel) ** 2) 


      const newLine = new Line(
        x1rel - mouseX,
        y1rel - mouseY,
        x2rel - mouseX,
        y2rel - mouseY,
        length,color,isArrow,isInvisible
      )
      return newLine
    }

    getNewObjectByMakingItAbsolute(mouseX,mouseY){
      const { x1, y1, x2, y2, length,color,isArrow,isInvisible} = this
      const newLine = new Line(
        (x1 + mouseX) / g.k + g.viewport.origin.x,
        (y1 + mouseY) / g.k + g.viewport.origin.y,
        (x2 + mouseX) / g.k + g.viewport.origin.x,
        (y2 + mouseY) / g.k + g.viewport.origin.y,
        length / g.k,color,isArrow,isInvisible
      )
      return newLine


    }

    isOutsideOfWorld(){
      const {x1,y1,x2,y2} = this
      return isRectOutsideOfWorld(x1,y1,x2,y2)
    }


    drawInCollage(collageViewer){
      const ctx = collageViewer.ctx

      let {x1,y1,x2,y2,length,color} = this
      let {x1rel,y1rel,x2rel,y2rel} = collageViewer.getRelativeBoundingRect(x1, y1, x2, y2)

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

      if(!this.isInvisible || selectionManager.shouldShowInvisibleItems()){
        
        ctx.beginPath();

       
        ctx.moveTo(x1rel, y1rel);
        ctx.lineTo(x2rel, y2rel);
  
        ctx.stroke();

        ctx.setLineDash([])


        if(this.isArrow){
          drawArrowHead(x1rel,y1rel,x2rel,y2rel,color,ctx)
        }

      }

    }
  
    
  
    draw(onTheMove = false,frame, isPlacingCollage = false) {

      if(g.readingManager.isReading && g.readingManager.isFullScreen)return
     
      let {x1,y1,x2,y2,length} = this;

      if(frame){
        const {x1:frameX1,y1:frameY1,ratio} = frame
        x1 = frameX1 + x1 * ratio
        y1 = frameY1 + y1 * ratio
        x2 = frameX1 + x2 * ratio
        y2 = frameY1 + y2 * ratio
        length *= ratio
      }


      const lengthRel = length * (onTheMove && g.editor.editingMode === 'carrying' ? 1 : g.k)
      if(lengthRel < 4)return


      let {x1rel,y1rel,x2rel,y2rel} = getRelativeBoundingRect(x1, y1, x2, y2)

     
      if(onTheMove){

          const {x,y} = g.crosshair

          if(g.editor.editingMode === 'moving'){
            x1rel = x1 * g.k + x - g.movementManager.snappingDisplacement.x * g.k
            y1rel = y1 * g.k + y - g.movementManager.snappingDisplacement.y * g.k
            x2rel = x2 * g.k + x - g.movementManager.snappingDisplacement.x * g.k
            y2rel = y2 * g.k + y - g.movementManager.snappingDisplacement.y * g.k

          }else if(g.editor.editingMode === 'carrying'){
            x1rel = x1 + x - g.movementManager.snappingDisplacement.x * g.k
            y1rel = y1 + y - g.movementManager.snappingDisplacement.y * g.k
            x2rel = x2 + x - g.movementManager.snappingDisplacement.x * g.k
            y2rel = y2 + y - g.movementManager.snappingDisplacement.y * g.k
          }

          if (g.editor.editingMode === 'scaling'){
           // let {x1,y1,x2,y2} = this
            const scalingAnchorPoint = g.movementManager.isOptionPressed ? g.movementManager.scalingCenterAnchorPoint : g.movementManager.scalingAnchorPoint
            const {x:scalingAnchorPointX,y:scalingAnchorPointY} = scalingAnchorPoint
            const tempX1 = x1 - scalingAnchorPointX
            const tempX2 = x2 - scalingAnchorPointX
            const tempY1 = y1 - scalingAnchorPointY
            const tempY2 = y2 - scalingAnchorPointY

            if(!g.movementManager.scalingParams)return
            const {scalingFactor} = g.movementManager.scalingParams

            x1rel = (scalingAnchorPointX + tempX1 * scalingFactor - g.viewport.origin.x) * g.k
            y1rel = (scalingAnchorPointY + tempY1 * scalingFactor - g.viewport.origin.y) * g.k

            x2rel = (scalingAnchorPointX + tempX2 * scalingFactor - g.viewport.origin.x) * g.k
            y2rel = (scalingAnchorPointY + tempY2 * scalingFactor - g.viewport.origin.y) * g.k


        }
      }


      let color = this.color

      if(!onTheMove && !frame && g.editor.editingMode === 'none' && selectionManager.selectionModeOn && !selectionManager.selectionRectangleAnchor && isMouseCloseToLine(x1rel,y1rel,x2rel,y2rel)){
          color = 'blue'
      }
  
      if((!onTheMove && this.isSelected && ['moving','scaling','carrying'].includes(g.editor.editingMode)) || this.isBeingEdited){
        color =  'rgba(0,0,0,0.3)'
      }

   
    

      const context = isPlacingCollage && frame ? g.topCtx : g.ctx
      
      context.strokeStyle = color;
      context.lineWidth = 1;

      if(!this.isInvisible || selectionManager.shouldShowInvisibleItems()){
        
        context.beginPath();

       
        context.moveTo(x1rel, y1rel);
        context.lineTo(x2rel, y2rel);
  
        context.stroke();

        context.setLineDash([])


        if(this.isArrow){
          drawArrowHead(x1rel,y1rel,x2rel,y2rel,color,context)
        }

      }






      if(g.editor.editingMode !== 'scaling' && this.isSelected){

        g.ctx.beginPath()
        g.ctx.fillStyle = g.editor.editingMode != 'scaling' && isMouseCloseToDotOnScreen(x1rel,y1rel) ? "yellow" : "blue"
        g.ctx.rect(x1rel - 3, y1rel - 3, 6, 6)
        g.ctx.fill()
        g.ctx.beginPath()
        g.ctx.fillStyle = g.editor.editingMode != 'scaling' && isMouseCloseToDotOnScreen(x2rel,y2rel) ? "yellow" : "blue"
        g.ctx.rect(x2rel - 3, y2rel - 3, 6, 6)
        g.ctx.fill()

      }


      g.totalLinesCount++
    }
  }

  export default Line