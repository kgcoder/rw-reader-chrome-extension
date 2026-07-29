/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import { base64Decode, base64Encode } from "../helpers.js"

class FLTextEnd {

    constructor(index,length,hIndex,hLength,hash,leftHLetter,rightHLetter){
        this.index = index
        this.length = length
        this.hIndex = hIndex
        this.hLength = hLength
      
        this.hash = hash
        this.leftHLetter = leftHLetter
        this.rightHLetter = rightHLetter


      
    }

    static fromObject(object){
        let {i:index,l:length,hl:hLength,h:hash,ll:leftHLetter,rl:rightHLetter} = object
        let hIndex = 'hi' in object ? object.hi : undefined
        if(isNaN(hIndex)){
            hIndex = index
        }
        if(!hLength){
            hLength = length
        }

        return new FLTextEnd(index,length,hIndex,hLength,hash,leftHLetter,rightHLetter)
    }

    getObject(){

        let {index,length,hIndex,hLength,hash,leftHLetter,rightHLetter} = this

        if(hIndex == index){
            hIndex = -1
        }
        if(hLength == length){
            hLength = 0
        }
     
        const data = {t:'t',i:index,l:length}

        if(hIndex != -1){
            data.hi = hIndex
        }

        if(hLength){
            data.hl = hLength
        }

        if(hash){
            data.h = hash
        }

        if(leftHLetter){
            data.ll = leftHLetter
        }
        if(rightHLetter){
            data.rl = rightHLetter
        }

        return data
    }



    getExportString(skipHash = false, skipHLetters = false){
        const array = []

        const {index,length,hIndex,hLength,hash,leftHLetter,rightHLetter} = this

        array.push({name:'i',value:index})
        if(hIndex != index){
            array.push({name:'hi',value:hIndex}) 
        }
        array.push({name:'l',value:length})

        if(hLength != length){
            array.push({name:'hl',value:hLength})
        }
        if(hash && !skipHash){
            array.push({name:'h',value:hash})
        }

        if(!skipHLetters && leftHLetter && rightHLetter){
            array.push({name:'e',value:base64Encode(`${leftHLetter}${rightHLetter}`)})
        }

        return `${array.map(({name,value}) => `${name}:${value}`).join(';')}`
    }


    static fromExportString(exportString){
        const chunks = exportString.split(';')
   
        let indexString 
        let lengthString
        let hIndexString
        let hLengthString
        let hash
        let leftHLetter
        let rightHLetter
        for(const chunk of chunks){
            const keyValueChunks = chunk.split(':')
            if(keyValueChunks.length !== 2)return null
            const [key,value] = keyValueChunks

            if(key === 'i'){
                indexString = value
            }
            if(key === 'l'){
                lengthString = value
            }
            if(key === 'hi'){
                hIndexString = value
            }
            if(key === 'hl'){
                hLengthString = value
            }
            if(key === 'h'){
                hash = value
            }
            if (key === 'e') {
                const unescaped = base64Decode(value)
                if (unescaped.length === 2) {
                    leftHLetter = unescaped[0]
                    rightHLetter = unescaped[1]
                    
                }
            }

        }

        if(!indexString || !lengthString)return null

     

        if(!hIndexString){
            hIndexString = indexString
        }

        if(!hLengthString){
            hLengthString = lengthString
        }

        const index = parseInt(indexString,10)
        const length = parseInt(lengthString,10)
        const hIndex = parseInt(hIndexString,10)
        const hLength = parseInt(hLengthString,10)

        return new FLTextEnd(index,length,hIndex,hLength,hash,leftHLetter,rightHLetter)
    }



}

export default FLTextEnd