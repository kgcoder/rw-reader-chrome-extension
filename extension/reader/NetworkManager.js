/*
Visible Connections Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Default Web project.
All Default Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official spec, see:
https://github.com/kgcoder/default-web
*/

import g from './Globals.js'


// _portReady resolves when the private port arrives from bridge.js via the VC_INIT handshake.
// fetchWebPage awaits this, so calls that arrive before the handshake completes are queued naturally.
// If the port never arrives (e.g. another script called stopImmediatePropagation on the VC_INIT
// event), the promise rejects after a timeout and fetches fail with a clear error.
let _port = null
const _portReady = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        window.removeEventListener('message', capturePort)
        reject(new Error('Reader failed to initialize. Please reload the page.'))
    }, 3000)

    function capturePort(e) {
        if (e.data?.type === 'VC_INIT' && e.ports[0]) {
            clearTimeout(timeout)
            _port = e.ports[0]
            _port.start()  // required when using addEventListener instead of onmessage
            window.removeEventListener('message', capturePort)
            resolve()
        }
    }
    window.addEventListener('message', capturePort)
})

// Signal to bridge.js that this module is ready to receive the port.
window.postMessage({ type: 'READER_READY' }, '*')


const currentRequests = new Set()


export function fetchWebPage(url) {
  if(!g.readingManager.mainDocData)return

  if (currentRequests.has(url)) return
  currentRequests.add(url)

    return new Promise(async (resolve, reject) => {

        const currentPageUrl = g.readingManager.mainDocData.url
        const currentPageHostname = new URL(currentPageUrl).hostname

        try{
          const requestedPageHostname = new URL(url).hostname
          if (requestedPageHostname === currentPageHostname) {

              try {
                  const result = await fetch(url)
                  const text = await result.text()

                  currentRequests.delete(url)
                  resolve({text, error:''})

              } catch (e) {
                  currentRequests.delete(url)
                  resolve({error:e, text:''})
              }

              return

           }

        }catch(e){
          resolve({error:e, text:'Something is wrong with the URL'})
        }


        await _portReady

        const id = Math.random().toString(36).slice(2)

        function handleResponse(event) {
            const msg = event.data
            if (msg.type === "FETCH_RESULT" && msg.id === id) {
                _port.removeEventListener("message", handleResponse)
                currentRequests.delete(msg.url)
                resolve({text: msg.html, error: msg.isError ? msg.html : null})
            }
        }

        _port.addEventListener("message", handleResponse)
        _port.postMessage({ type: "FETCH_WEB_PAGE", url, id })
    })
}
