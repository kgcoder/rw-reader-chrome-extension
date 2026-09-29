/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from "./Globals.js"
//@@@
import { addScrollEndListener, setTheme } from "./helpers.js";
import { setFontSet } from "./Fonts.js";
//@@@
import IconsInfo from "./Icons.js";
import { checkKey } from "./KeyboardManager.js";


export function addListenersToContainer(container){

    //snapping
    container.addEventListener('scroll',() => {

        if (g.pdm.isFlinksListOpen) {
            g.pdm.toggleFlinksList()
        }
    })

    const snapToNearestEdge = () => {
        const halfway = container.scrollWidth / 4;

        if (container.scrollLeft > halfway) {
            container.scrollTo({
                left: container.scrollWidth,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        }
    };

    addScrollEndListener(container, snapToNearestEdge);


}

export async function loadUIAndIcons() {

    g.flinksCanvas = document.getElementById('flinks-canvas')
    g.flinksCtx = g.flinksCanvas.getContext("2d")
    g.iconsInfo = new IconsInfo()

    g.iconsInfo.loadAllIcons()
    g.pdm.loadUI()


    document.onkeydown = checkKey



}


export async function applyAllSavedSettings(){
    await useSavedTheme()
    await useSavedFontSize()
    await useSavedFontSet()
    await useSavedFavorites()
}


async function useSavedTheme() {
    let saved = await g.hostAdapter.getSetting('theme')
    if (!saved) {
        saved = "light"
    }
    setTheme(saved)
    g.currentTheme = saved
}


async function useSavedFontSet() {
    const saved = await g.hostAdapter.getSetting('fontSet')
    await setFontSet(saved, false)
}


async function useSavedFavorites() {
    const saved = await g.hostAdapter.getSetting('favorites')
    g.favorites = saved != null ? saved : []
}


async function useSavedFontSize() {
    const saved = await g.hostAdapter.getSetting('fontSize')
    if (saved) {
        g.pdm.fontSize = saved
    }
}



export function dispatchReaderReady(url) {
    if (window.swpReaderReadyFired) return
    window.swpReaderReadyFired = true
    document.dispatchEvent(new CustomEvent('swpReaderReady', { detail: { url } }))
}

