/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { removeAllChildren } from "./helpers.js"
import g from './Globals.js'


export function showMultipleLinksPopup(pageX,pageY, touchedLinks, noteData = null){
    g.pdm.isMultiplePopupOpen = true
    const popup = document.getElementById("multiple-links-popup")

    removeAllChildren(popup)
    popup.style.left = pageX + 'px'
    popup.style.top = pageY + 'px'
    popup.style.display = 'flex'

    popup.style.width = '250px'
    popup.style.height = touchedLinks.length * 30 + 'px'

    for(const link of touchedLinks){
        const row = document.createElement('a')
        

        row.className = 'multiple-links-popup-row'

        popup.appendChild(row)

        
        
        if(link.type === 'flink'){
            row.style.backgroundColor = link.flink.color03
            row.innerText = link.text
            row.href = link.flinksData.url


            row.addEventListener('click',(e) => {
                e.preventDefault()
                hideMultipleLinksPopup()
                if(noteData){
                    g.readingManager.flinkPressedInRightDocument(link.flink,noteData)
                }else{
                    g.readingManager.flinkPressedInLeftDocument(link.flink,link.flinksData)

                }

            })

        }else if(link.type === 'hyperlink'){
            row.innerHTML = `<a href="${link.url}"${link.target ? ' target="' + link.target + '"' : ''}>${link.text}</a>`
        }
    }


}


export function hideMultipleLinksPopup(timeout = 0){

    const popup = document.getElementById("multiple-links-popup")

    if(timeout == 0){
        popup.style.display = 'none'

        g.pdm.isMultiplePopupOpen = false
        return
    }else if(g.pdm.multipleLinksPopupTimeout){
        clearTimeout(g.pdm.multipleLinksPopupTimeout)
    }

    g.pdm.multipleLinksPopupTimeout = setTimeout(() => {

        const {pageX,pageY } = g.pdm.movementEvent

        const rect = popup.getBoundingClientRect();


        const inside =
            pageX >= rect.left &&
            pageX <= rect.right &&
            pageY >= rect.top &&
            pageY <= rect.bottom;



        if(!inside){
            popup.style.display = 'none'
            g.pdm.isMultiplePopupOpen = false
        }

     
        clearTimeout(g.pdm.multipleLinksPopupTimeout)


    },timeout)

}