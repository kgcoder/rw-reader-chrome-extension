/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import FLEnd from './FLEnd.js'
import FLPointEnd from './FLPointEnd.js'
import FLTextEnd from './FLTextEnd.js'

class FloatingLink {
    constructor(leftEnds, rightEnds, inverted = false){
        
        this.leftEnds = leftEnds
        this.rightEnds = rightEnds
        
        this.inverted = inverted
    }


    getString(){
        const {leftEnds,rightEnds,inverted} = this
        
        const finalLeftEnds = inverted ? rightEnds : leftEnds
        const finalRightEnds = inverted ? leftEnds : rightEnds


        const finalLeftEndsObjects = finalLeftEnds.map(end => end.getObject())
        const finalRightEndsObjects = finalRightEnds.map(end => end.getObject())

        const data = {l:finalLeftEndsObjects,r:finalRightEndsObjects}

        return JSON.stringify(data)
       
    
    }


    static getObjectFromDataString(dataString, inverted = false){

        let {l:leftEndObjects,r:rightEndObjects} = JSON.parse(dataString)

        const finalLeftEndObjects = inverted ? rightEndObjects : leftEndObjects
        const finalRightEndObjects = inverted ? leftEndObjects : rightEndObjects

        const leftEnds = finalLeftEndObjects.map(end => FLEnd.fromObject(end))
        const rightEnds = finalRightEndObjects.map(end => FLEnd.fromObject(end))


        return new FloatingLink(leftEnds,rightEnds,inverted)

    }



    getExportString() {
        const {leftEnds,rightEnds,inverted} = this

        if(inverted)return null

        if(!leftEnds || !leftEnds.length)return null
        if(!rightEnds || !rightEnds.length)return null

     
        const leftEnd = leftEnds[0]

        const leftEndString = leftEnd.getExportString()
        
        const rightEnd = rightEnds[0]

        const skipRightHash = leftEnd.hash && rightEnd.hash && leftEnd.hash === rightEnd.hash
    
        const skipRightHLetters = leftEnd.leftHLetter && leftEnd.rightHLetter &&
            rightEnd.leftHLetter && rightEnd.rightHLetter &&
            leftEnd.leftHLetter === rightEnd.leftHLetter && leftEnd.rightHLetter === rightEnd.rightHLetter
        const rightEndString = rightEnd.getExportString(skipRightHash, skipRightHLetters)
        
        return `${leftEndString}_${rightEndString}`
    }


    static fromExportString(line) {
        if(!line || typeof line !== 'string' || !line.trim())return null
        let leftEnd = null
        let rightEnd = null

        const sides = line.split('_')
        if(sides.length !== 2)return null
        const [leftSide,rightSide] = sides

        const leftEnds = leftSide.split('^')
        const rightEnds = rightSide.split('^')

        if(!leftEnds.length || !rightEnds.length)return null

        //for now we only use the first end if there are multiple ends on one side
        const leftEndString = leftEnds[0]
        const rightEndString = rightEnds[0] 



        const firstLeftEndMatch = leftEndString.match(/^(([pt])\|)?(.*?)$/)
        const firstRightEndMatch = rightEndString.match(/^(([pt])\|)?(.*?)$/)

        if(!firstLeftEndMatch || !firstRightEndMatch)return null
            
        const leftType = firstLeftEndMatch[2]
        const leftString = firstLeftEndMatch[3]
        const rightType = firstRightEndMatch[2]
        const rightString = firstRightEndMatch[3]


        let leftTextHash = ''
        let leftHLetter = ''
        let rightHLetter = ''
        if(!leftType || leftType === 't'){
            leftEnd = FLTextEnd.fromExportString(leftString)
            if(leftEnd){
                leftTextHash = leftEnd.hash
                leftHLetter = leftEnd.leftHLetter
                rightHLetter = leftEnd.rightHLetter
            }
        }else if(leftType === 'p'){
            leftEnd = FLPointEnd.fromExportString(leftString)
        }

        if(!rightType || rightType === 't'){
            rightEnd = FLTextEnd.fromExportString(rightString)
            if(rightEnd && !rightEnd.hash && leftTextHash){
                rightEnd.hash = leftTextHash
            }
            if(rightEnd && !rightEnd.leftHLetter && leftHLetter){
                rightEnd.leftHLetter = leftHLetter
            }
            if(rightEnd && !rightEnd.rightHLetter && rightHLetter){
                rightEnd.rightHLetter = rightHLetter
            }
        }else if(rightType === 'p'){
            rightEnd = FLPointEnd.fromExportString(rightString)
        }

        if (!leftEnd || !rightEnd) return null
        
        if (leftType === 't' && (!leftEnd.leftHLetter || !leftEnd.rightHLetter)) return null
        if (rightType === 't' && (!rightEnd.leftHLetter || !rightEnd.rightHLetter))return null

        return new FloatingLink([leftEnd],[rightEnd],false)
    }
}

export default FloatingLink