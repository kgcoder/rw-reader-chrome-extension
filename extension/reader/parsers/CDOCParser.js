/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/default-web
*/

import { getFirstElementOfArray, parseCopyInfoFromElement, sanitizeCdocSvg, sanitizeUrl, stripHtmlTags } from "../helpers.js";
import FloatingLink from "../models/FloatingLink.js";
import ImageView from "../models/ImageView.js";
import Line from "../models/Line.js";

export async function parseCDOC(url,contentString){

    const fallbackReg = new RegExp(/<fallback\b[^>]*>[\s\S]*?<\/fallback>/,'mig')
    contentString = contentString.replace(fallbackReg,'')

    const parser = new DOMParser();

    let title = ''

    const xmlDoc = parser.parseFromString(contentString, 'application/xml');


    const rootElement = xmlDoc.documentElement;

    const docmeta = getFirstElementOfArray(rootElement.getElementsByTagName('metadata'))
   
    if(docmeta){
        const titles = docmeta.getElementsByTagName('title')
        if(titles && titles.length){
            title = stripHtmlTags(titles[0].textContent)

        }

    }




    const svgs = rootElement.getElementsByTagName('svg')
    if(!svgs || svgs.length === 0)return null
    const svgElement = svgs[0]

  


    const widthString = svgElement.getAttribute('width');
    const heightString = svgElement.getAttribute('height');



    const width = parseFloat(widthString)
    const height = parseFloat(heightString)

    if(isNaN(width) || isNaN(height))return null


    const elements = svgElement.getElementsByTagName('*');

    // const lineElements = []
    // const textElements = []
    // const imageElements = []
    // const linkElements = []
    // const textViewElements = []

    const lines = []
    const texts = []
    const images = []
    const links = []
    const textViews = []

    const markers = []
    // Iterate through elements

    const elementsToRemove = []
     for (let i = 0; i < elements.length; i++) {
         const element = elements[i];

    if(element.tagName === 'line'){

        const verctorEffect = element.getAttribute('vector-effect')

        if(verctorEffect !== 'non-scaling-stroke')continue
        
        const x1String = element.getAttribute('x1')
        const y1String = element.getAttribute('y1')
        const x2String = element.getAttribute('x2')
        const y2String = element.getAttribute('y2')

        const x1 = parseFloat(x1String)
        const y1 = parseFloat(y1String)
        const x2 = parseFloat(x2String)
        const y2 = parseFloat(y2String)

        if(isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2))continue


        const color = element.getAttribute('stroke') != null ? element.getAttribute('stroke') : 'black'
        const lineWidth = element.getAttribute('stroke-width')



        const isArrow = false
        const isInvisible = false

        const length = Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2))
        const line = new Line(x1,y1,x2,y2,length,color,isArrow,isInvisible)

        lines.push(line)


        elementsToRemove.push(element)



    }else if(element.tagName === 'marker'){

        markers.push({id:element.id,marker:element})
    }


       else if(element.tagName === 'image'){

            const xString = element.getAttribute('x')
            const yString = element.getAttribute('y')

            const widthString = element.getAttribute('width')
            const heightString = element.getAttribute('height')
            
            const url = sanitizeUrl(element.getAttribute('href'));


            const x = parseFloat(xString)
            const y = parseFloat(yString)

            const width = parseFloat(widthString)
            const height = parseFloat(heightString)

            if(isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height))continue

       

            const imageObj = new ImageView(x,y,1,width,height,url)
            images.push(imageObj)


            elementsToRemove.push(element)




}


        
     }



   for(const element of elementsToRemove){
    element.parentElement.removeChild(element)
   }

   
   const serializer = new XMLSerializer();
   const serializedSvg = serializer.serializeToString(svgElement);

   const staticSvg = sanitizeCdocSvg(serializedSvg)
   if (!staticSvg) return null

   const linkRects = await extractLinkRectanglesFromOffscreen(staticSvg)


    const svgBlob = new Blob([staticSvg], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

// Create an Image object
    const img = new Image();
    img.onload = () => {
        img.isLoaded = true
    // Get the canvas and its context
    //const canvas = document.getElementById('myCanvas');
    //const ctx = canvas.getContext('2d');

    // Draw the image on the canvas
    //ctx.drawImage(img, 0, 0);

    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;





    const connectionTags = rootElement.getElementsByTagName('connections')

  const connectedDocsData = []
  if(connectionTags && connectionTags.length){

        const connectionsRoot = connectionTags[0]
        
        const flinkSets = connectionsRoot.getElementsByTagName('doc')
        

        if(flinkSets && flinkSets.length){
            for (let i = 0; i < flinkSets.length; i++) {
                const flinkSet = flinkSets[i];
                const flinkSetUrl = sanitizeUrl(flinkSet.getAttribute('url'))
                const flinkSetTitle = stripHtmlTags(flinkSet.getAttribute('title'))
                const flinkSetHash = flinkSet.getAttribute('hash')
                const flinksString = flinkSet.textContent

         
                const flinks = flinksString ? flinksString.split('\n').map(line => FloatingLink.fromExportString(line.trim())).filter(flink => !!flink) : []

                if(flinkSetUrl){
                    connectedDocsData.push({url:flinkSetUrl,title:flinkSetTitle,hash:flinkSetHash,flinks})
            
                }
            }
        }
    }


    const copyInfoEls = rootElement.getElementsByTagName('copy-info')
    let copyInfo = null
    if (copyInfoEls && copyInfoEls.length) {
        copyInfo = parseCopyInfoFromElement(copyInfoEls[0])
    }

    return {
        url,
        title,
        width,
        height,
        mainImage:img,
        linkRects,
        markers,
        connectedDocsData,
        docType:'c',

        lines,
        texts,
        images,
        links,
        textViews,
        type:'collage',
        xmlString: contentString,
        docSubtype:5,
        copyInfo
    }
}






function extractLinkRectanglesFromOffscreen(svgString) {
    return new Promise((resolve) => {
      // Create an off-screen div
      const offscreenDiv = document.createElement("div");
      offscreenDiv.style.position = "absolute";
      offscreenDiv.style.left = "-9999px";
      offscreenDiv.style.top = "-9999px";
      document.body.appendChild(offscreenDiv);

        
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, "image/svg+xml");
        const svgElement = doc.querySelector("svg");
        if (!svgElement) {
          offscreenDiv.remove();
          resolve([]);
          return;
        }

        //The svg is already sanitized, but this copy goes into the live DOM,
        //so also make sure nothing in it can trigger a network request:
        //getBBox() only needs geometry attributes, not loaded resources.
        const externalFuncIRI = /url\s*\(\s*['"]?(?!#)/i;
        const allElements = [svgElement, ...svgElement.querySelectorAll("*")];
        for (const el of allElements) {
          if (el.tagName === "image") {
            el.removeAttribute("href");
            el.removeAttribute("xlink:href");
          }
          for (const attr of [...el.attributes]) {
            if (externalFuncIRI.test(attr.value)) {
              el.removeAttribute(attr.name);
            }
          }
        }

        offscreenDiv.appendChild(svgElement);

      // Wait for the SVG to render
      setTimeout(() => {
        const rectangles = [];
          const links = svgElement.querySelectorAll("a");
        links.forEach((link) => {
          const targetElement = link.firstElementChild; // Assume one child per link
          if (targetElement) {
            const bbox = targetElement.getBBox(); // Extract bounding box
            rectangles.push({
              url: sanitizeUrl(link.getAttribute("xlink:href") || link.getAttribute("href")),
              minX: bbox.x,
              minY: bbox.y,
              maxX: bbox.x + bbox.width,
                maxY: bbox.y + bbox.height            
            });
          }
        });
  
        // Clean up
        offscreenDiv.remove();
        resolve(rectangles);
      }, 100); // Allow some time for rendering (adjust as needed)
    });
  }
  