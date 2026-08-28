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
import SHA256 from './hashing/sha256-es/src/sha256.js'
import DOMPurify from './dompurify/purify.es.mjs';
import FloatingLink from "./models/FloatingLink.js";

export function timestamp() {
    return window.performance && window.performance.now
        ? window.performance.now()
        : new Date().getTime();
}

//@@@
export async function setTheme(themeName, shouldSave = false) {

    if (!themeName) return

    const rootEl = document.getElementById("ui-root")
  
    rootEl.classList.forEach(cls => {
         if (cls.startsWith('theme-')) {
            rootEl.classList.remove(cls);
        }
    })
    // Add the new theme class
    rootEl.classList.add('theme-' + themeName); // e.g. "theme-dark"
    g.currentTheme = themeName
    
    if (shouldSave) {
        g.hostAdapter.saveSetting('theme', themeName)
    }

    g.readingManager.recolorConnectionsForCurrentTheme()

    g.readingManager.applyFlinksOnTheLeft()

    g.readingManager.applyFlinksOnTheRight()
     

}


export function createOneIconComponent(parent,iconPath,componentId,className,width = 24,height = 0){
    const div = document.createElement('div')

    if(!height){
        height = width
    }
    if(componentId){
        div.id = componentId

    }

    div.className = className
    
    div.innerHTML = `
        <img src="${iconPath}" width="${width}px" height="${height}px" />
    `
    parent.appendChild(div)
    return div
}

export function createOneSVGIconComponent(parent,svgString,componentId,className){
    //@@@
    const div = document.createElement('div')

    
    if(componentId){
        div.id = componentId

    }
    div.className = className
    div.innerHTML = svgString
    parent.appendChild(div)
    return div
}




export function getFirstElementOfArray(array) {
    if (array && array.length) {
        return array[0]
    }
    return null
}

export function createHtmlWrapper(text, tag, classesString = '') {
    if (!text || !text.trim()) return null
    const el = document.createElement(tag)
    el.textContent = text
    if (classesString) {
        el.className = classesString
    }
    return el
}

export function escapeXml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
}

export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters
}

export function escapeHTML(html){
    return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


export function unescapeHTML(html) {
    return new DOMParser()
        .parseFromString('<!doctype html><body>' + html, 'text/html')
        .body.textContent;
}

export function stripHtmlTags(text) {
    if (typeof text !== 'string') return ''
    return text.replace(/<[^>]*>/g, '').replace(/[\r\n]+/g, ' ').trim()
}

export function sanitizeUrl(url) {
    if (typeof url !== 'string') return ''
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/[<>"]/.test(trimmed)) return ''
    let parsed
    try {
        parsed = new URL(trimmed, 'https://relative-base.invalid/')
    } catch (e) {
        return ''
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return trimmed
}

export function getBaseFromHtmlDoc(unsanitizedHtmlDoc) {
    const baseEl = unsanitizedHtmlDoc.querySelector('base[href]');
    const baseHref = baseEl ? baseEl.getAttribute('href') : null;
    return baseHref
}

export function getBaseOuterXML(base) {
    if(!base)return ''
    return `<base href="${escapeXml(base)}" />\n`
}


export function removeAllChildren(div){
    while(div.firstChild){
        div.removeChild(div.firstChild)
    }
}


export function showToastMessage(message){
    
    let div = document.getElementById('ToastMessageDiv')
    if(!div){
        div = document.createElement('div')
        div.id = "ToastMessageDiv"
    }
    div.innerText = message
    const mainConainerDiv = document.body
    mainConainerDiv.appendChild(div)

    setTimeout(() => {
        const div = document.getElementById('ToastMessageDiv')
        if(div){
            mainConainerDiv.removeChild(div)
        }
    },2000)
}


export function absolutizeUrls(html, baseUrl, pageUrl) {
    pageUrl = pageUrl.split('#')[0]
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const effectiveUrl = baseUrl ? new URL(baseUrl, pageUrl).href : pageUrl;
   

    function abs(url) {
        if (url.startsWith('#')) {
            return new URL(url, pageUrl).href;
        }
        const originBase = new URL(effectiveUrl).origin + '/';
        const pageBase = effectiveUrl.endsWith('/') ? effectiveUrl : effectiveUrl.replace(/[^/]+$/, '');
        
        if (url.startsWith('/')) return new URL(url, originBase).href;
        return new URL(url, pageBase).href;
    }


    // Helper for srcset-like attributes
    function absSrcset(value) {
        return value.split(',')
        .map(part => {
            const [url, size] = part.trim().split(/\s+/);
            return size ? `${abs(url)} ${size}` : abs(url);
        })
        .join(', ');
    }

    // --- Images ---
    doc.querySelectorAll('img[src]').forEach(img => {
        img.src = abs(img.getAttribute('src'));

    });
    doc.querySelectorAll('img[srcset]').forEach(img => {
        img.srcset = absSrcset(img.getAttribute('srcset'));
    });
    doc.querySelectorAll('img[data-src]').forEach(img => {
        img.setAttribute('data-src', abs(img.getAttribute('data-src')));
    });
    doc.querySelectorAll('img[data-srcset]').forEach(img => {
        img.setAttribute('data-srcset', absSrcset(img.getAttribute('data-srcset')));
    });
    doc.querySelectorAll('img[data-file]').forEach(img => {
        img.setAttribute('data-file', abs(img.getAttribute('data-file')));
    });
    doc.querySelectorAll('img[data-mw-file-element]').forEach(img => {
        img.setAttribute('data-mw-file-element', abs(img.getAttribute('data-mw-file-element')));
    });

    // --- Links ---
    doc.querySelectorAll('a[href]').forEach(a => {

        const raw = a.getAttribute('href');
        a.href = abs(raw);
        
    });

    // --- Media (audio/video) ---
    doc.querySelectorAll('audio[src], video[src]').forEach(el => {
        el.src = abs(el.getAttribute('src'));
    });
    doc.querySelectorAll('audio source[src], video source[src]').forEach(source => {
        source.src = abs(source.getAttribute('src'));
    });
    doc.querySelectorAll('track[src]').forEach(track => {
        track.src = abs(track.getAttribute('src'));
    });

    // --- Iframes ---
    doc.querySelectorAll('iframe[src]').forEach(el => {
        el.src = abs(el.getAttribute('src'));
    });

    return doc.body.innerHTML
}


export function replaceMediaTagsWithLinksInDiv(div, tagName) {
    const iconPaths = g.iconsInfo.iconPaths

    let imagePath = null
    if(tagName === 'audio'){
        imagePath = iconPaths.ic_audio
    }else if(tagName === 'video'){
        imagePath = iconPaths.ic_video
    }else{
        return
    }
    const mediaTags =  div.querySelectorAll(tagName)

    for(let i = 0; i < mediaTags.length; i++){
        const item = mediaTags.item(i)
        const sources = item.getElementsByTagName('source')
        let url = ''
        if(sources.length){
            url = sources[0].src
        }

        if(url){
            const card = document.createElement('div')

            card.innerHTML = `<div class="media-card"><a href="${url}" target="_blank"><img src="${imagePath}" width="24px" height="24px"/></a></div>`

          
            item.replaceWith(card)
        }else{
            item.remove()
        }
    }
}


export function mapUrlWithMappings(url, mediaMappings) {
    for (const m of mediaMappings) {
        if (url.startsWith(m.from)) {
            return m.to + url.slice(m.from.length)
        }
    }
    return url
}

export function applyMediaMappings(container, mediaMappings) {
    if (!mediaMappings || mediaMappings.length === 0) return

    function mapUrl(url) { return mapUrlWithMappings(url, mediaMappings) }

    function mapSrcset(srcset) {
        return srcset.split(',').map(entry => {
            const parts = entry.trim().split(/\s+/)
            parts[0] = mapUrl(parts[0])
            return parts.join(' ')
        }).join(', ')
    }

    container.querySelectorAll('img, source, audio, video').forEach(el => {
        if (el.hasAttribute('src')) el.setAttribute('src', mapUrl(el.getAttribute('src')))
        if (el.hasAttribute('srcset')) el.setAttribute('srcset', mapSrcset(el.getAttribute('srcset')))
    })
}


export function getTextColumnWidth() {
    let textColumnWidth
    if(g.readingManager.isFullScreen && !g.isMobileMode){
        textColumnWidth = window.innerWidth * 0.6
    }else if(g.isMobileMode){
        textColumnWidth = g.readingManager.docWidth
    }else{
        textColumnWidth = g.readingManager.docWidth - 20 - 30
    }
    return textColumnWidth
}


export function cleanConnectedDocURL(originalUrl) {
    if(!originalUrl)return `${Math.random()}` //if there is no url try to mess up the comparisons (cleanConnectedDocURL is only used to compare urls)
    return originalUrl.split('#')[0]
}


export function isoToHumanReadableDate(isoString, onlyDate = false) {
    if(!isoString)return ''
    const dateObject = new Date(isoString);

    const optionsDate = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };
    const optionsTime = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // 24-hour format
    };
    
    const formattedDate = new Intl.DateTimeFormat('en-GB', optionsDate).format(dateObject);
    
    if (onlyDate) {
        return formattedDate 
    } else {
        const formattedTime = new Intl.DateTimeFormat('en-GB', optionsTime).format(dateObject);
        
        return `${formattedDate}, ${formattedTime}`;
        
    }

 
}



export function formatFileSize(bytes, useBinary = false) {
    const binaryUnits = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    const decimalUnits = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const units = useBinary ? binaryUnits : decimalUnits;

    const factor = useBinary ? 1024 : 1000; // Choose base
    let size = bytes;
    let unitIndex = 0;

    while (size >= factor && unitIndex < units.length - 1) {
        size /= factor;
        unitIndex++;
    }

    const precision = unitIndex === 0 ? 0 : 2; // No decimals for 'bytes'
    const formattedSize = size.toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    });

    return `${formattedSize} ${units[unitIndex]}`;
}


export function getBoundingRectForGenericElement(x,y,unitLength,width,height,collageFrame = null){
    if(collageFrame){
        const {x1:frameX1,y1:frameY1,width,height,ratio} = collageFrame
        const x1 = frameX1 + x * ratio
        const y1 = frameY1 + y * ratio
        const x2 = x1 + unitLength * width * ratio
        const y2 = y1 + unitLength * height * ratio
        return {x1,y1,x2,y2}
    }else{
        const x1 = x
        const y1 = y
        const x2 = x + unitLength * width
        const y2 = y + unitLength * height
        return {x1,y1,x2,y2}

    }
}


export function getDesiredConnectionsFromHdocDataJson(dataJSON) {
    const connections = dataJSON.connections
    if (!connections) return []
    const desiredConnections = connections.map(item => ({ url: item.url, title: item.title }))
    return desiredConnections
}


export function sanitizeHtml(htmlString, additionalForbiddenTags = []) {
    
    const htmlParser = new DOMParser();

    const htmlDoc = htmlParser.parseFromString(htmlString, 'text/html');


    htmlDoc.querySelectorAll('[style]').forEach(el => {
        el.removeAttribute('style');
    });

    htmlDoc.querySelectorAll('font[size]').forEach(el => {
        el.removeAttribute('size');
    });

    htmlDoc.querySelectorAll("img.lazyload").forEach(img => {
    const realSrc = img.getAttribute("data-src") || img.getAttribute("data-lazy");
    if (realSrc) {
      img.setAttribute("src", realSrc);
    }
    img.classList.remove("lazyload");
  });


    const forbiddenTags = ["script", "object", "embed", "link", "style", "meta", "form", "base", "head",
        "webview", "button", "input", "textarea", "select", "option", "optgroup", "label", "fieldset", "legend", "datalist", ".hdoc-remove", ...additionalForbiddenTags];
    
    forbiddenTags.forEach(tag => {
        try{
            htmlDoc.querySelectorAll(tag).forEach(el => el.remove());
        }catch(e){
            //invalid selector
        }
    });

    htmlDoc.querySelectorAll("*").forEach(el => {
        [...el.attributes].forEach(attr => {
            if (attr.name.startsWith("on") || attr.value.trim().toLowerCase().startsWith("javascript:")) {
                el.removeAttribute(attr.name);
            }
        });
    });

    let sanitizedHtml = htmlDoc.body.innerHTML
    sanitizedHtml = sanitizedHtml.replace(/<iframe([^<]*?)\/>/gim,'<iframe$1></iframe>')


    const allowedTags = ['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'select', 'shadow', 'slot', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr'];

    const purifiedHtml = DOMPurify.sanitize(sanitizedHtml,{
        ALLOWED_TAGS: allowedTags,   // allow all tags (except obviously unsafe ones)
        ALLOWED_ATTR: false,   // allow all safe attributes
        ADD_TAGS: ['iframe'],  // explicitly allow <iframe>
        ADD_ATTR: ['target','allow', 'allowfullscreen', 'frameborder', 'src', 'height', 'width', 'referrerpolicy', 'loading', 'href', 'class', 'id'],
    });



    return purifiedHtml ?? ''//@@@






}

//Enforces the CDOC static dialect: geometry, text, images and links only.
//No scripts, event handlers, animation, filters, style sheets/attributes, foreignObject or use/symbol/defs.
export function sanitizeCdocSvg(svgString) {
    if (typeof svgString !== 'string' || !svgString) return ''
    const sanitized = DOMPurify.sanitize(svgString, {
        NAMESPACE: 'http://www.w3.org/2000/svg',
        ALLOWED_TAGS: ['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line',
            'polyline', 'polygon', 'text', 'tspan', 'title', 'desc', 'a', 'image'],
        ALLOWED_ATTR: ['xmlns', 'xmlns:xlink', 'width', 'height', 'viewbox',
            'preserveaspectratio', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy',
            'r', 'rx', 'ry', 'd', 'points', 'fill', 'stroke', 'stroke-width',
            'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity',
            'fill-opacity', 'stroke-opacity', 'transform', 'font-size',
            'font-family', 'font-weight', 'font-style', 'text-anchor', 'dx', 'dy',
            'id', 'class', 'href', 'xlink:href', 'target', 'vector-effect'],
    })
    return sanitized != null ? sanitized : ''
}

export function removeTitleFromContent(htmlString, titleText, titleSelector) {

    const htmlParser = new DOMParser();

    const htmlDoc = htmlParser.parseFromString(htmlString, 'text/html');

    try{
        const titleEl = htmlDoc.querySelector(titleSelector ?? 'h1')//@@@
        if (titleEl && titleEl.textContent.trim() === titleText.trim()) {
            titleEl.parentElement.removeChild(titleEl)  
        }
     }catch(e){
        //invalid selector (shouldn't get here)
    }

    return htmlDoc.body.innerHTML

}



export function getH1TitleFromDoc(htmlDoc, titleSelector) {

    try{
        const headerEl = htmlDoc.querySelector(titleSelector ?? 'h1')//@@@

        if (headerEl) {
            return headerEl.textContent
        }

    }catch(e){
        //invalid selector
    }
    return ''

}


export function getShortHash(string,length = 6){
    const longHash =  SHA256.hash(string)
    return longHash.substring(0,length)
}

export function isDotInsideFrame(x,y,frame){
    const {minX,minY,maxX,maxY} = frame
    return x > minX && x < maxX && y > minY && y < maxY
}

export function showUrlInTheCorner(url){
    const urlDiv = document.getElementById('CurrentUrl')
    urlDiv.innerText = url
    urlDiv.style.display = 'flex'
}

export function hideUrlInTheCorner(){
    const urlDiv = document.getElementById('CurrentUrl')
    urlDiv.innerText = ''
    urlDiv.style.display = 'none'

}


export function base64Encode(str) {
  // Convert to UTF-8 bytes
  const bytes = new TextEncoder().encode(str);
  // Convert bytes → binary string → base64
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary);
}

export function base64Decode(base64) {
  // Decode base64 → binary string
  const binary = atob(base64);
  // Convert binary string → bytes → UTF-8 text
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function roundValueForSVG(value){
    return Math.round(value * 1000) / 1000
}

export function stickBottomLineRectToTheTopOne(firstLineRect,secondLineRect){
    const top = firstLineRect.top + firstLineRect.height
    const height = secondLineRect.top - firstLineRect.top - firstLineRect.height + secondLineRect.height
    secondLineRect.top = top
    secondLineRect.height = height
}

export function addTransparencyToHexColor(color, alpha) {

    
    color = color === 'black' ? '#000000' : color
    color = color === 'white' ? '#FFFFFF' : color

    const red = parseInt(color.slice(1, 3), 16);
    const green = parseInt(color.slice(3, 5), 16);
    const blue = parseInt(color.slice(5, 7), 16);
  
    // Create the RGBA color string with the specified alpha value
    const rgbaColor = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    
    return rgbaColor;
}



export function getTextNodesArrayFromDiv(div){
    const textNodesArray = []

    const getTextNodesArray = (node) => {
        if (node.nodeType === 3) { 
            textNodesArray.push(node)
        }
        if (node = node.firstChild) do {
            getTextNodesArray(node);
        } while (node = node.nextSibling);
    }
    getTextNodesArray(div)

    return textNodesArray
}


export function getTextFromDiv(div){
    const textNodesArray = getTextNodesArrayFromDiv(div)
   // 
    return textNodesArray.map(node => node.data).join('')
}


export function isSubstringUniqueInText(substring,text){

    if (typeof substring !== "string" || typeof text !== "string") {
        throw new Error("Both substring and text must be strings");
    }

    if (substring === "") return false; // Edge case: Empty substring


    const first = text.indexOf(substring);
    if (first === -1) return false; // doesn't occur at all (shouldn't happen in practice)

    const last = text.lastIndexOf(substring);
    return first === last; // only one occurrence

}



export function interpolate(startX, endX = 0, startY, endY, currentX, totalDiffX = 0, easing = 'linear') {
    if (!totalDiffX) {
        totalDiffX = endX - startX;
    }

    if(easing === 'linear'){
        const currentY = startY + (currentX - startX) * (endY - startY) / totalDiffX
        return currentY
    }

    let t = currentX - startX
    const c = endY - startY

    if ((t /= totalDiffX / 2) < 1) return c / 2 * t * t * t + startY;
    return c / 2 * ((t -= 2) * t * t + 2) + startY;

}


export function getTopBarDivFrom(div){
        const childNodes = Array.from(div.childNodes).filter(node => node.nodeType === 1)
        return childNodes[0]
    }

export function getHeaderDivFrom(div){
    return div.querySelector('.HeaderDiv')
}

export function getPresentationDivFrom(div) {
    return div.querySelector('.PresentationDiv')
}



export function getConnectionsJSON() {

    const flinkSets = g.readingManager.connections
    
    if (!flinkSets.length) return ''
    

    const docsArray = []

    for(let flinkSet of flinkSets){
    
        const flinksetEl = {}

        docsArray.push(flinksetEl)

        if(flinkSet.url){
            flinksetEl.url = flinkSet.url
        }
        if (flinkSet.title) {
            flinksetEl.title = unescapeHTML(flinkSet.title)
        }

        flinksetEl.flinks = []
    
        for (let flink of flinkSet.activeFlinks) {
            
            const string = flink.getExportString()
            if (!string) continue
            
            flinksetEl.flinks.push(string)
            
        }

    }

    const finalObject = {connections:docsArray}
    
    return JSON.stringify(finalObject,null,4)
}


export function getConnectionsString(){
        
    const flinkSets = g.readingManager.connections

    if(!flinkSets.length)return ''

    const xmlDoc = document.implementation.createDocument(null, 'connections', null)    

    for(let flinkSet of flinkSets){
    
        const flinksetEl = xmlDoc.createElement('doc')

        xmlDoc.documentElement.appendChild(flinksetEl)

        if(flinkSet.url){
            flinksetEl.setAttribute('url', flinkSet.url)
        }
        if (flinkSet.title) {
            flinksetEl.setAttribute('title', unescapeHTML(flinkSet.title))
        }

        const flinkLines = []

        for (let flink of flinkSet.activeFlinks) {
            
            const string = flink.getExportString()
            if (!string) continue
            
            flinkLines.push(string)

        }

        const textNode = xmlDoc.createTextNode('\n' + flinkLines.join('\n') + '\n');
        flinksetEl.appendChild(textNode)




    
    }

    const xmlSerializer = new XMLSerializer();

    

    return xmlSerializer.serializeToString(xmlDoc)
    
    
}


export function scrollToIdInContainer(containerDiv, targetId, docTopOffset) {
    let el = document.getElementById(targetId);
    if (!el) {
        const elements = document.getElementsByName(targetId)
        if (elements.length) {
            el = elements[0]
        }
    }

  if (containerDiv && el) {
    containerDiv.scrollTo({
      top: el.offsetTop - containerDiv.offsetTop + docTopOffset,
      behavior: "smooth"
    });
  }
}


export function getIndexAndLengthOfSelection(div,range){
    const startEl = range.startContainer
    const endEl = range.endContainer

    const startOffset = range.startOffset
    const endOffset = range.endOffset

    const textNodesArray = getTextNodesArrayFromDiv(div)

  

    let startIndex = 0
    let selectionLength = 0

    let didFind = false

    for(let node of textNodesArray){
        if(node === startEl && node === endEl){
            startIndex += startOffset
            selectionLength = endOffset - startOffset
            break
        }else if(node === startEl || node.parentNode === startEl){
            
            startIndex += startOffset
            selectionLength = startEl.data.length - startOffset
            didFind = true
        }else if(node === endEl || node.parentNode === endEl){
            
            selectionLength += endOffset
            break
        }else{
            if(didFind){
                selectionLength += node.data.length
            }else{
                startIndex += node.data.length
            }
        }
    }

    
    

    return {startIndex,length:selectionLength}

}


export function getDataFromCondocXML(condocXML) {
    let mainPageUrl = ''
    let condocTitle = ''
    let condocDescription = ''
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(condocXML, 'application/xml');
    const rootElement = xmlDoc.documentElement;
    const mainEl = rootElement.querySelector('main')
    if (mainEl) {
        mainPageUrl = sanitizeUrl(mainEl.textContent)
    }
    const titleEl = rootElement.querySelector('title')
    if (titleEl) {
        condocTitle = stripHtmlTags(titleEl.textContent)
    }
    const descriptionEl = rootElement.querySelector('description')
    if (descriptionEl) {
        condocDescription = stripHtmlTags(descriptionEl.textContent)
    }



    return {condocTitle, condocDescription, mainPageUrl}
}

export function getXMlAndDataArrayFromJSONConnections(mainDataJSON) {
    let connectionsString = ''

    const connectedDocsData = []

    const connectionsFromJSON = mainDataJSON["connections"]
    if (!connectionsFromJSON) {
        return {connectionsString, connectedDocsData}
    }
    if (connectionsFromJSON && Array.isArray(connectionsFromJSON) && connectionsFromJSON.length) {

        connectionsString = connectionsFromJSON.map(item => {
            const url = item.url
            if (!url) return ''
            const title = item.title != null ? item.title : ''

            const flinksFromJSON = item.flinks

            const flinks = flinksFromJSON ? flinksFromJSON.map(line => FloatingLink.fromExportString(line.trim())).filter(flink => !!flink) : []

            let flinksString = ''
            if (flinksFromJSON && Array.isArray(flinksFromJSON) && flinksFromJSON.length) {
                flinksString = flinksFromJSON.filter(item => !!item).join('\n')
                if(flinksString)flinksString = '\n' + flinksString + '\n'
            }


            const cleanUrl = sanitizeUrl(url)
            if (cleanUrl) {
                connectedDocsData.push({url:cleanUrl,title:stripHtmlTags(title),flinks})
            }

            return `<doc url="${escapeXml(url)}"${title ? ` title="${escapeXml(title)}"` : ''}>${flinksString}</doc>`

        }).filter(item => !!item).join('\n')

        if(connectionsString)connectionsString = `<connections>\n${connectionsString}\n</connections>\n\n`

        
    }

    return {connectionsString, connectedDocsData}
}


export function getProtocolAndDomainFromUrl(url){
     const match = url.match(/^(?<protocol>https?):\/\/(?<domain>[^/]+)\/?(?<rest>.*?)$/)

    if (!match) {
        showToastMessage('Parsing error')
        return null
    }


    const protocol = match.groups.protocol
    const domain = match.groups.domain

    return {protocol,domain}
}


export async function copyDataToClipboard(dataString){
        try {
            // Use clipboard API directly in popup (this will work)
            await navigator.clipboard.writeText(dataString);
        } catch (err) {
            //console.error('Failed to copy to clipboard:', err);
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = dataString;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    //console.log('Data copied to clipboard (fallback):', dataString);
                } else {
                    //console.error('Fallback copy method failed');
                }
            } catch (fallbackErr) {
                //console.error('Both clipboard methods failed:', fallbackErr);
            }
        }
}


export function parseCopyInfoFromElement(copyInfoEl) {
    const original = sanitizeUrl(copyInfoEl.getAttribute('original'))
    const copiedAt = stripHtmlTags(copyInfoEl.getAttribute('copied-at'))
    const via = [...copyInfoEl.getElementsByTagName('via')].map(v => ({
        copiedAt: stripHtmlTags(v.getAttribute('copied-at')),
        url: sanitizeUrl(v.textContent)
    }))
    const mediaMappingsEl = copyInfoEl.querySelector('media-mappings')
    let mediaMappings = null
    if (mediaMappingsEl) {
        mediaMappings = [...mediaMappingsEl.querySelectorAll('mapping')].map(m => ({
            from: m.getAttribute('from'),
            to: sanitizeUrl(m.getAttribute('to'))
        })).filter(m => m.from && m.to)
    }
    return { original, copiedAt, via, mediaMappings }
}


export function addScrollEndListener(element, callback) {
    if ('onscrollend' in window) {
        element.addEventListener('scrollend', callback);
    } else {
        // Older Safari (pre-18.4) never fires 'scrollend'
        let scrollEndTimer = null;
        element.addEventListener('scroll', () => {
            if (scrollEndTimer) clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(callback, 150);
        }, { passive: true });
    }
}
