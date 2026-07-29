/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from '../Globals.js'

class ImageView{
    constructor(x,y,unitLength,width,height,url){
        this.x = x
        this.y = y
        this.unitLength = unitLength
        this.width = width
        this.height = height
        this.url = url

      

     
        this.image = new Image()
     
        this.image.src = url
        

 

        this.isLoaded = false


        this.image.onerror = () => {
            console.error('failed image obj',this)
            //this.isSelected = true
            //this.isBrokenState = true
        }

        this.image.onload = () => {
            this.isLoaded = true

      
            if(this.collageViewer){
                this.collageViewer.changesExist = true
            
            }else{
                g.changesExist = true
            }
        }



        this.isSelected = false
        
    }


    getBoundingRect(collageFrame,ratio){
        const {x,y,unitLength,width,height} = this

        if(collageFrame){
            const {x,y,width,height} = collageFrame
            const x1 = x + this.x * ratio
            const y1 = y + this.y * ratio
            const x2 = x1 + this.unitLength * this.width * ratio
            const y2 = y1 + this.unitLength * this.height * ratio
            return {x1,y1,x2,y2}
        }else{

            const x1 = x
            const y1 = y

            const x2 = x + unitLength * width
            const y2 = y + unitLength * height

            return {x1,y1,x2,y2}

        }
    }

    isMouseInTheBounds(absMouseX,absMouseY){
        const {x1,y1,x2,y2} = this.getBoundingRect()

        if(absMouseX < x1 || absMouseX > x2)return false
        if(absMouseY < y1 || absMouseY > y2)return false
        
        return true
    }


    getString(){
        let {x,y,unitLength,width,height,path,url,fileName,isManaged} = this
        const obj = {x,y,ul:unitLength,w:width,h:height}
        if(path){
            obj.p = path
        }
        if(url){
            obj.u = url
        }
        if(fileName){
            obj.fn = fileName
        }
        if(isManaged){
            obj.m = 1
        }
        return JSON.stringify(obj)
    }


    getSVGString(){
        let {x,y,unitLength,width,height,path,url,isManaged} = this

        let href = ''
        if(url){
            href = url
        }else if(path && !isManaged){
            href = path
        }

       return `<image href="${href}" x="${roundValueForSVG(x)}" y="${roundValueForSVG(y)}" width="${roundValueForSVG(width)}" height="${roundValueForSVG(height)}"/>`


    }


    static getObjectFromDataString(dataString){
        const {x,y,ul:unitLength,w:width,h:height,p:path,u:url,fn:fileName,m:isManaged} = JSON.parse(dataString)
        return new ImageView(x,y,unitLength,width,height,path,url,fileName,isManaged == 1) 
    }


    getNewObjectBySubtractingPoint(x,y){
        return this.getNewObjectByAddingPoint(-x,-y)
    }
  
    getNewObjectByAddingPoint(_x,_y){
        const {x,y,unitLength,width,height,path,url,fileName,isManaged} = this
        const newImage = new ImageView(
            x + _x,
            y + _y,
            unitLength,width,height,path,url,fileName,isManaged
        )
        return newImage
    }


    getNewObjectByPuttingItIntoFrame(collageInfo,collageViewer){
        const {x:collageX,y:collageY,unitLength:collageUnitLength} = collageInfo
        const {x,y,unitLength,width,height,path,url,fileName,isManaged} = this

        const newWidth = unitLength * width / collageUnitLength 
        const newHeight = unitLength * height / collageUnitLength 
        const newUnitLength = 1

        const newX = (x - collageX) / collageUnitLength
        const newY = (y - collageY) / collageUnitLength
   
        const newImage = new ImageView(
            newX,
            newY,
            newUnitLength,newWidth,newHeight,path,url,fileName,isManaged
        )
        newImage.collageViewer = collageViewer
        return newImage
    }


    getNewObjectByScaling(){
        let {x,y,unitLength,width,height,path,url,fileName,isManaged} = this
        const scalingAnchorPoint = g.movementManager.isOptionPressed ? g.movementManager.scalingCenterAnchorPoint : g.movementManager.scalingAnchorPoint
        const {x:scalingAnchorPointX,y:scalingAnchorPointY} = scalingAnchorPoint
        const tempX1 = x - scalingAnchorPointX
        const tempY1 = y - scalingAnchorPointY
  
        if(!g.movementManager.scalingParams)return
        const {scalingFactor} = g.movementManager.scalingParams
  
        const newX1 = scalingAnchorPointX + tempX1 * scalingFactor
        const newY1 = scalingAnchorPointY + tempY1 * scalingFactor 


        const newUnitLength = unitLength  * scalingFactor



        const newImage = new ImageView(
            newX1,
            newY1,
            newUnitLength,
            width,height,path,url,fileName,isManaged
        )
  
        return newImage
  
    }

    getNewObjectByMakingItRelative(mouseX,mouseY){
        const {x,y,unitLength,width,height,path,url,fileName,isManaged} = this
        const xRel = (x - g.viewport.origin.x) * g.k
        const yRel = (y - g.viewport.origin.y) * g.k
        const unitLengthRel = unitLength * g.k
        const newImage = new ImageView(
            xRel - mouseX,
            yRel - mouseY,
            unitLengthRel,width,height,path,url,fileName,isManaged
        )
        return newImage
    }

    getNewObjectByMakingItAbsolute(mouseX,mouseY){
        const {x,y,unitLength,width,height,path,url,fileName,isManaged} = this
        const newImage = new ImageView(
            (x + mouseX) / g.k + g.viewport.origin.x,
            (y + mouseY) / g.k + g.viewport.origin.y,
            unitLength / g.k,
            width,height,path,url,fileName,isManaged
        )
        return newImage
    }


    isOutsideOfWorld(){
        const {x1,y1,x2,y2} = this.getBoundingRect()
        return isRectOutsideOfWorld(x1,y1,x2,y2)
    }


    drawInCollage(collageViewer){
        const ctx = collageViewer.ctx
  
        let {image} = this

        const {x1, y1, x2, y2} = this.getBoundingRect()
        let {x1rel,y1rel,x2rel,y2rel} = collageViewer.getRelativeBoundingRect(x1, y1, x2, y2)
        ctx.globalAlpha = 1.0

        // const xRel = (x  - collageViewer.viewport.origin.x) * collageViewer.k
        // const yRel = (y - collageViewer.viewport.origin.y) * collageViewer.k

        const widthRel = x2rel - x1rel
        const heightRel = y2rel - y1rel


        if(this.isLoaded){
            ctx.beginPath()
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                x1rel,
                y1rel,
                widthRel,
                heightRel
            );
            ctx.stroke();

        }




        if(!this.isLoaded){
            ctx.beginPath()
            ctx.strokeStyle = "blue"
            ctx.moveTo(x1rel,y1rel)
            ctx.lineTo(x2rel,y1rel)
            ctx.lineTo(x2rel,y2rel)
            ctx.lineTo(x1rel,y2rel)
            ctx.lineTo(x1rel,y1rel)
            ctx.lineTo(x2rel,y2rel)
            ctx.moveTo(x1rel,y2rel)
            ctx.lineTo(x2rel,y1rel)
            ctx.stroke()

        }

        // if(this.url || this.path){
        //     if(selectionManager.selectionModeOn || selectionManager.squaresWithSelections.length){
        //         ctx.beginPath()
        //         const rTextSize = 16 * this.unitLength * collageViewer.k
        //         ctx.fillStyle = 'blue'
        //         ctx.font = `${rTextSize}px Inter`
        //         ctx.textAlign = 'left'
        //         const text = this.url ? this.url : this.path
        //         ctx.fillText(text, x1rel, y1rel - 2 * this.unitLength * collageViewer.k)
        //     }

        // }

    }


    draw(onTheMove = false, frame = undefined, dataTransfer = false, isPlacingCollage = false){

        let {x,y,unitLength,width,height,image} = this

        if(frame){
            const {x1:frameX1,y1:frameY1,ratio} = frame
            x = frameX1 + x * ratio
            y = frameY1 + y * ratio
            
            width *= ratio
            height *= ratio

          }



        if(dataTransfer){

           // const {x:mouseX,y:mouseY} = g.crosshair

            

            //const {selectionX1Rel,selectionY1Rel,mouseX,mouseY,selectionWidth,selectionHeight,finalFrameWidth,finalFrameHeight} = transferData

            //const ratio = finalFrameWidth / (selectionWidth * g.k)


            
            // const selectionX1Rel = (selectionX1 - g.viewport.origin.x) * g.k
            // const selectionY1Rel = (selectionY1 - g.viewport.origin.y) * g.k

            let xRel = x// (x + mouseX - selectionX1Rel) * ratio
            let yRel = y// (y + mouseY - selectionY1Rel) * ratio
       

            let widthRel = (width * unitLength )// * ratio
            let heightRel = (height * unitLength)// * ratio
            

            
            
            
            

            

            if(this.isLoaded){
                g.dataTransferCtx.beginPath()
                g.dataTransferCtx.drawImage(
                    image,
                    0,
                    0,
                    image.width,
                    image.height,
                    xRel,
                    yRel,
                    widthRel,
                    heightRel
                );
                g.dataTransferCtx.stroke();
    
            }else{

                

                const x2rel = xRel + widthRel
                const y2rel = yRel + heightRel

                g.dataTransferCtx.beginPath()
                g.dataTransferCtx.strokeStyle = "blue"
                g.dataTransferCtx.moveTo(xRel,yRel)
                g.dataTransferCtx.lineTo(x2rel,yRel)
                g.dataTransferCtx.lineTo(x2rel,y2rel)
                g.dataTransferCtx.lineTo(xRel,y2rel)
                g.dataTransferCtx.lineTo(xRel,yRel)
                g.dataTransferCtx.lineTo(x2rel,y2rel)
                g.dataTransferCtx.moveTo(xRel,y2rel)
                g.dataTransferCtx.lineTo(x2rel,yRel)
                g.dataTransferCtx.stroke()
            }

            return
        }


        let xRel = (x - g.viewport.origin.x) * g.k
        let yRel = (y - g.viewport.origin.y) * g.k

        const relevantK = onTheMove && g.editor.editingMode === 'carrying' ? 1 : g.k
        let widthRel = unitLength * width * relevantK
        let heightRel = unitLength * height * relevantK

        if(widthRel < kMinVisibleElementSize || heightRel < kMinVisibleElementSize)return

        if(onTheMove){
           // let {x,y} = this
    
            const {x:mouseX,y:mouseY} = g.crosshair


    
            if(g.editor.editingMode === 'moving'){
                xRel = x * g.k + mouseX - g.movementManager.snappingDisplacement.x * g.k
                yRel = y * g.k + mouseY - g.movementManager.snappingDisplacement.y * g.k


            }else if(g.editor.editingMode === 'carrying'){
                xRel = x + mouseX - g.movementManager.snappingDisplacement.x * g.k
                yRel = y + mouseY - g.movementManager.snappingDisplacement.y * g.k
            }


    
            if (g.editor.editingMode === 'scaling'){
                const scalingAnchorPoint = g.movementManager.isOptionPressed ? g.movementManager.scalingCenterAnchorPoint : g.movementManager.scalingAnchorPoint
                const {x:scalingAnchorPointX,y:scalingAnchorPointY} = scalingAnchorPoint
                const tempX = x - scalingAnchorPointX
                const tempY = y - scalingAnchorPointY
    
                if(!g.movementManager.scalingParams)return
                const {scalingFactor} = g.movementManager.scalingParams
    
                xRel = (scalingAnchorPointX + tempX * scalingFactor - g.viewport.origin.x) * g.k
                yRel = (scalingAnchorPointY + tempY * scalingFactor - g.viewport.origin.y) * g.k
    
              
                widthRel *= scalingFactor
                heightRel *= scalingFactor
            }
          }


        if(!onTheMove && this.isSelected && ['moving','scaling','carrying'].includes(g.editor.editingMode)){
            g.ctx.globalAlpha = 0.5
        }else{
            g.ctx.globalAlpha = 1.0
        }

        const context = isPlacingCollage && frame ? g.topCtx : g.ctx


        if(this.isLoaded){
            context.beginPath()
            context.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                xRel,// - widthRel / 2,
                yRel,// - heightRel,
                widthRel,
                heightRel
            );
            context.stroke();

        }

        context.globalAlpha = 1.0

        g.ctx.globalAlpha = 1.0


        const {x1,y1,x2,y2} = this.getBoundingRect(frame)
        let {x1rel,y1rel,x2rel,y2rel} = getRelativeBoundingRect(x1,y1,x2,y2)

        // if(g.editor.editingMode !== 'scaling' && this.isSelected){
        //     g.ctx.beginPath()
        //     g.ctx.fillStyle = "blue"
    
        //     g.ctx.rect(x1rel - 3, y1rel - 3, 6, 6)
        //     g.ctx.rect(x2rel - 3, y1rel - 3, 6, 6)
        //     g.ctx.rect(x2rel - 3, y2rel - 3, 6, 6)
        //     g.ctx.rect(x1rel - 3, y2rel - 3, 6, 6)
    
        //     g.ctx.fill()

        // }

        if(!this.isLoaded){
            context.beginPath()
            context.strokeStyle = "blue"
            context.moveTo(x1rel,y1rel)
            context.lineTo(x2rel,y1rel)
            context.lineTo(x2rel,y2rel)
            context.lineTo(x1rel,y2rel)
            context.lineTo(x1rel,y1rel)
            context.lineTo(x2rel,y2rel)
            context.moveTo(x1rel,y2rel)
            context.lineTo(x2rel,y1rel)
            context.stroke()

        }

        if(this.url || this.path){
            if(selectionManager.selectionModeOn || selectionManager.squaresWithSelections.length || onTheMove){
                context.beginPath()
                const rTextSize = 8 * (width / 100.0) * this.unitLength * relevantK
                context.fillStyle = this.url && this.fileName ? 'white' : 'blue'
                context.font = `${rTextSize}px Inter`
                context.textAlign = 'left'
                const text = this.url ? this.url : (this.isManaged ? this.fileNameFromPath : this.path)
                context.fillText(text, xRel, yRel - 2 * (width / 100.0) * this.unitLength * relevantK)
            }

        }
    }
}

export default ImageView