/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { roundValueForSVG } from "../helpers.js"

class FLPointEnd{

    constructor(x,y,radius){
        this.x = x
        this.y = y
        this.radius = radius

    }

    static fromObject(object){
        const {x,y,r:radius} = object
        return new FLPointEnd(x,y,radius)
    }

    getObject(){

        const {x,y,radius} = this

        return {t:'p',x,y,r:radius}

    }



    getExportString(){
        const array = []

        const {x,y,radius} = this

        array.push({name:'x',value:roundValueForSVG(x)})
        array.push({name:'y',value:roundValueForSVG(y)})
        array.push({name:'r',value:roundValueForSVG(radius)})

        return `p|${array.map(({name,value}) => `${name}:${value}`).join(';')}`
    }


    static fromExportString(exportString){

        const chunks = exportString.split(';')
    
        let xString 
        let yString
        let radiusString
  
        for(const chunk of chunks){
            const keyValueChunks = chunk.split(':')
            if(keyValueChunks.length !== 2)return null
            const [key,value] = keyValueChunks

            if(key === 'x'){
                xString = value
            }
            if(key === 'y'){
                yString = value
            }
            if(key === 'r'){
                radiusString = value
            }
         

        }

        if(!xString || !yString || !radiusString)return null


        const x = parseFloat(xString)
        const y = parseFloat(yString)

        const radius = parseFloat(radiusString)

        return new FLPointEnd(x,y,radius)
    }

}

export default FLPointEnd