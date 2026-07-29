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
import { kMinVisibleElementSize } from '../constants.js';
class Crosshair {
  
  
    constructor(isInCollage = false){
      this.x = 0;
      this.y = 0;
      this.isInCollage = isInCollage
    }
  
    mouseMoved(x, y) {
      
      this.x = x;
      this.y = y;

      const spinner = document.getElementById('spinner');
      spinner.style.left = `${x + 10}px`;
      spinner.style.top = `${y + 5 }px`;

      if(!this.isInCollage){
        if(selectionManager.selectionModeOn || selectionManager.selectionRectangleAnchor || g.dm.tempImage || ['textMode','lineMode','editingLines','arrowMode','docConnectionMode','docConnectionCreation','lineCreation','arrowCreation','placingFile','placingLink','placingLocalLink','placingMagnet','placingTextView','pickingAnchorPointForScaling','moving','scaling','carrying','noteCreationMode','widgetCreationMode','placingCollage','placingEditingFrame'].includes(g.editor.editingMode)){
          g.changesExist = true
        }
  
        if(selectionManager.squaresWithSelections.length){
          g.changesExist = true
        }
  
      
  
        
  
        
        this.changeCursorIfNeeded()

      }

    
      
    }


    showSpinner() {
      const spinner = document.getElementById('spinner');
      spinner.style.display = 'block';
      g.canvas.style.cursor = 'none'
    }
  
    hideSpinner() {
      const spinner = document.getElementById('spinner');
      spinner.style.display = 'none';
      g.canvas.style.cursor = 'default'

    }

    changeCursorIfNeeded(){

      if(g.readingManager.isReading)return

      const mouseAbsX = this.x / g.k + g.viewport.origin.x - g.pdm.getMainLeftOffset()
      const mouseAbsY = this.y / g.k + g.viewport.origin.y

      for(let square of selectionManager.squaresWithSelections){

        for(let text of square.texts){
            if(!text.isSelected)continue
            const {left,right,top,bottom} = text.isMouseCloseToLine()
            if(left){
              g.canvas.style.cursor = 'ew-resize'
              return
            }
            if(right){
              g.canvas.style.cursor = 'ew-resize'
              return
            }
            if(top){
              g.canvas.style.cursor = 'ns-resize'
              return
            }
            // if(bottom){
            //   canvas.style.cursor = 'ns-resize'
            //   return
            // }
        }

        for(let link of square.links){
          if(!link.isSelected)continue
          const {left,right,top,bottom} = link.isMouseCloseToLine()
          if(left){
            g.canvas.style.cursor = 'ew-resize'
            return
          }
          if(right){
            g.canvas.style.cursor = 'ew-resize'
            return
          }
          if(top){
            g.canvas.style.cursor = 'ns-resize'
            return
          }
          // if(bottom){
          //   canvas.style.cursor = 'ns-resize'
          //   return
          // }
      }


      }


      for(let square of g.dm.visibleSquares){
        if(square.empty)continue


          for (let file of square.files){
            if(file.didMouseHitFile(mouseAbsX,mouseAbsY)){
  
              const visibleIconSize = file.iconSize * g.k
  
              if(visibleIconSize > 2000 || visibleIconSize < kMinVisibleElementSize)continue
              if(!g.movementManager.areSelectedItemsPackaged){
                canvas.style.cursor = 'pointer'
              }
              if(file.isManaged){
                showUrlInTheCorner('Managed file')
              }else{
                showUrlInTheCorner(file.path)
              }
  
              return
  
            }
          
          }

        for (let link of square.links){
            if(g.editor.editingMode === 'carrying' && g.movementManager.areSelectedItemsPackaged && !link.isLocal)continue
            if(link.didMouseHitLink(mouseAbsX,mouseAbsY)){
              const  heightRel = link.totalHeight * g.k
              if(heightRel < kMinVisibleElementSize || heightRel > 2000)continue
              g.canvas.style.cursor = 'pointer'
              showUrlInTheCorner(link.linkAddress)
              return
              
            }
        }

        for(let frame of square.collageFrames){

          if(!frame.collageId && !frame.url)continue
          
          let result = frame.didMouseHitLinkFromSVG(mouseAbsX, mouseAbsY)
          
          if(result && result.url){
            g.canvas.style.cursor = 'pointer'
            showUrlInTheCorner(result.url)
            return
          }
          const hitResult = frame.didMouseHitAnyContent(mouseAbsX,mouseAbsY,g.worldSize)
        
          if(!hitResult)continue
          const {smallestWidth,selectedType,selectedObj} = hitResult
          if(selectedType === 'link'){

            if(g.editor.editingMode === 'carrying' && g.movementManager.areSelectedItemsPackaged && !link.isLocal)continue

            g.canvas.style.cursor = 'pointer'
            showUrlInTheCorner(selectedObj.linkAddress)
            return

          }
        }

       

        

      }

      hideUrlInTheCorner()
      g.canvas.style.cursor = 'default'

    }


    draw(){

      if(g.editor.editingMode === 'carrying' && g.movementManager.areSelectedItemsPackaged && g.packageIcon.isLoaded){
        
        const squareSize = 15
        const gap = 15
    

          g.topCtx.drawImage(
              g.packageIcon,
              0,
              0,
              g.packageIcon.width,
              g.packageIcon.height,
              this.x + gap,
              this.y,
              squareSize,
              squareSize
          );
         

        
        return
      }

      if(['lineCreation','arrowCreation','lineMode','editingLines','arrowMode','docConnectionMode','docConnectionCreation','pickingAnchorPointForScaling'].includes(g.editor.editingMode)){
       

       
        g.topCtx.strokeStyle = 'black';
        g.topCtx.lineWidth = 1;
        g.topCtx.beginPath();
       
        g.topCtx.moveTo(this.x - 50, this.y);
        g.topCtx.lineTo(this.x + 50, this.y);
        g.topCtx.moveTo(this.x, this.y - 50);
        g.topCtx.lineTo(this.x, this.y + 50);
        g.topCtx.stroke();
      }
    }
  
   
}

export default Crosshair
  