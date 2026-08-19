/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

// Private IPC channel — port1 stays in this isolated world permanently.
// port2 is transferred to NetworkManager.js (MAIN world) exactly once via the READER_READY handshake.
const { port1, port2 } = new MessageChannel()

var portSent = false         // prevents double port transfer
var pendingPortSend = false  // set by content.js right before injecting reader; guards the handshake

const whitelistedHostnames = new Set()  // hostnames the user has explicitly approved
const documentHostnames = new Set()     // hostnames declared by the current document (hard ceiling)

// fetchMode ('strict' | 'smart' | 'open') is declared in content.js (runs first).
// bridge.js reads and updates it directly via the shared isolated-world scope.


function isSuspiciousHostname(hostname) {
    if (hostname === 'localhost') return true
    if (/\.(local|internal|corp|lan|home|intranet)$/i.test(hostname)) return true

    const h = hostname.replace(/^\[|\]$/g, '')  // strip IPv6 brackets

    if (h === '::1' || /^f[cd]/i.test(h)) return true  // IPv6 loopback / ULA

    const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4) {
        const [, a, b] = ipv4.map(Number)
        if (a === 10) return true
        if (a === 127) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 192 && b === 168) return true
        if (a === 169 && b === 254) return true
    }

    return false
}


function registerDocumentHostnames(html) {
    function tryAdd(urlStr) {
        if (!urlStr) return
        try { documentHostnames.add(new URL(urlStr.trim()).hostname) } catch {}
    }
    for (const m of html.matchAll(/<doc\s[^>]*url="([^"]+)"/gi)) tryAdd(m[1])
    const cm = html.match(/<comments[^>]*>([^<]+)<\/comments>/i)
    if (cm) tryAdd(cm[1])
    if (/<condoc[\s>]/i.test(html)) {
        const mm = html.match(/<main[^>]*>([^<]+)<\/main>/i)
        if (mm) tryAdd(mm[1])
    }
    try {
        const jm = html.match(/id="hdoc-data"[^>]*>([\s\S]*?)<\/script>/i)
        if (jm) {
            const j = JSON.parse(jm[1].trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]$/, ''))
            for (const con of (j.connections ?? [])) tryAdd(con.url)
            tryAdd(j?.panels?.side?.comments?.url)
        }
    } catch {}
}


// port1 listens for FETCH_WEB_PAGE from NetworkManager.js (private channel — not window)
port1.onmessage = async ({ data }) => {
    const { type, url, id, isUserSpecifiedUrl } = data
    if (type !== 'FETCH_WEB_PAGE') return
    if (!isShowingReader) return

    if(isUserSpecifiedUrl){
        const confirmed = confirm(`Allow fetching a page from another website?\n${url}`)
        chrome.runtime.sendMessage({ action: 'fetchWebPage', url, id })
        return
    }

    let hostname
    try { hostname = new URL(url).hostname } catch { return }

    // Hard security gate: extension never fetches beyond what the document declared
    if (!documentHostnames.has(hostname)) {
        port1.postMessage({ type: 'FETCH_RESULT', id, url, isError: true, html: 'Request not allowed' })
        return
    }

    // User already approved this hostname — pass through in any mode
    if (whitelistedHostnames.has(hostname)) {
        chrome.runtime.sendMessage({ action: 'fetchWebPage', url, id })
        return
    }

    if (fetchMode === 'open') {
        chrome.runtime.sendMessage({ action: 'fetchWebPage', url, id })
        return
    }

    if (fetchMode === 'smart') {
        if (isSuspiciousHostname(hostname)) {
            port1.postMessage({ type: 'FETCH_RESULT', id, url, isError: true,
                html: `Request to private/internal address blocked: ${hostname}` })
        } else {
            chrome.runtime.sendMessage({ action: 'fetchWebPage', url, id })
        }
        return
    }

    // 'strict' — ask user for every new hostname
    const confirmed = confirm(`Allow fetching a page from another website?\n${url}`)
    if (confirmed) {
        whitelistedHostnames.add(hostname)
        chrome.runtime.sendMessage({ action: 'fetchWebPage', url, id })
    } else {
        port1.postMessage({ type: 'FETCH_RESULT', id, url, isError: true, html: 'Request not allowed by the user' })
    }
}


// Listen for messages from the page (window channel — for non-fetch messages only)
window.addEventListener("message", async (event) => {
    if (event.source !== window) return
    const type = event.data.type

    if (type === 'READER_READY' && pendingPortSend && !portSent) {
        portSent = true
        pendingPortSend = false
        window.postMessage({ type: 'VC_INIT' }, '*', [port2])
        return
    }

    if (type === "UPDATE_FETCH_MODE_CONFIG") {
        fetchMode = event.data.mode
    }

    if (type === "RELOAD_PAGE") {
        chrome.storage.local.set({ justReloaded: true })
        location.reload()
    }

    if (type === "SAVE_OBJECT_IN_LOCAL_STORAGE") {
        if (!isShowingReader && !isShowingParsingRulesConstructor) return
        const { objectName, object } = event.data
        chrome.storage.local.set({ [objectName]: object })
    }

    if (type === "GET_OBJECT_FROM_LOCAL_STORAGE") {
        if (!isShowingReader && !isShowingParsingRulesConstructor) return
        const { objectName, id } = event.data
        const result = await chrome.storage.local.get(objectName)
        const savedObject = result[objectName]
        window.postMessage({ type: "LOCAL_STORAGE_RESULT", value: savedObject, id })
    }
})


// Broadcast theme changes to every tab currently showing the reader, so all open
// readers stay in sync. chrome.storage.onChanged fires in every extension context
// with the "storage" permission — including this bridge.js instance in every tab —
// regardless of which tab wrote the change, so no chrome.tabs fan-out is needed.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (!changes.theme) return
    if (!isShowingReader) return

    const newTheme = changes.theme.newValue
    if (!newTheme) return

    window.postMessage({ type: 'THEME_CHANGED', theme: newTheme }, '*')
})


// Listen for results from background — respond via port (not window)
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "fetchResult") {
        if (message.html && !message.isError) registerDocumentHostnames(message.html)
        port1.postMessage({
            type: 'FETCH_RESULT',
            id: message.id,
            url: message.url,
            isError: message.isError,
            html: message.html
        })
    }
})
