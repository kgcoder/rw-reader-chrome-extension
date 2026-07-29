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

class Viewport {
    constructor(x,y, w, h) {
      this.origin = {
        x: 0,
        y: 0
      };
    
      this.w = 1000;
      this.h = 600;


      this.w = w;
      this.h = h;
      this.origin = {x,y}
   
    }

    getCenter(){
      const x = (this.origin.x + (this.w / 2) / g.k )
      const y = (this.origin.y + (this.h / 2) / g.k)
      return {x,y}
    }

    getBoundingRect(){
      const x1 = this.origin.x
      const y1 = this.origin.y
      const x2 = x1 + this.w / g.k
      const y2 = y1 + this.h / g.k
      return {x1,y1,x2,y2}
    }

    updateOrigin(x,y){
        this.origin.x = x
        this.origin.y = y
    }
    
  
    updateSize(w, h) {
      this.w = w;
      this.h = h;
    }

    draw() {
        g.ctx.beginPath();
        g.ctx.rect(0, 0, this.w, this.h);
        g.ctx.stroke();
      }
}

export default Viewport