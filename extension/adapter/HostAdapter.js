/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/


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
        if (e.data && e.data.type === 'VC_INIT' && e.ports[0]) {
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

export default class HostAdapter {

    mainDocumentTitleSpanId = "CurrentDocumentTitleSpan"
    mainDocumentInfoButtonId = "CurrentDocumentInfoButton"

    async fetchWebPage(url, options = {}) {
        await _portReady

        return new Promise((resolve) => {
            const id = Math.random().toString(36).slice(2)

            function handleResponse(event) {
                const msg = event.data
                if (msg.type === "FETCH_RESULT" && msg.id === id) {
                    _port.removeEventListener("message", handleResponse)
                    resolve({text: msg.html, error: msg.isError ? msg.html : null})
                }
            }

            _port.addEventListener("message", handleResponse)
            _port.postMessage({ type: "FETCH_WEB_PAGE", url, id, isUserSpecifiedUrl: options.isUserSpecifiedUrl })
        })
    }

    getSetting(key) {
        return new Promise((resolve) => {
        const id = Math.random().toString(36).slice(2)

        function handleResponse(event) {
            if (event.source !== window) return
            const msg = event.data
            if (msg.type === "LOCAL_STORAGE_RESULT" && msg.id === id) {
                window.removeEventListener("message", handleResponse)
                resolve(msg.value)
            }
        }

        window.addEventListener("message", handleResponse)
        window.postMessage({ type: "GET_OBJECT_FROM_LOCAL_STORAGE", objectName: key, id }, "*")
    })
    }

    saveSetting(key, value) {
        window.postMessage({ type: "SAVE_OBJECT_IN_LOCAL_STORAGE", objectName: key, object: value }, "*")
    }
}
