/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

import g from './Globals.js'


const currentRequests = new Set()
const responseCache = new Map()


export function fetchWebPage(url, options = {}) {
  if (!g.readingManager.mainDocData) return

  if (responseCache.has(url)) return Promise.resolve(responseCache.get(url))
  if (currentRequests.has(url)) return
  currentRequests.add(url)

  return new Promise(async (resolve) => {

    const currentPageUrl = g.readingManager.mainDocData.url
    const currentPageHostname = new URL(currentPageUrl).hostname

    try {
      const requestedPageHostname = new URL(url).hostname

      if (requestedPageHostname === currentPageHostname) {
        try {
          const result = await fetch(url)
          const text = await result.text()
          const response = {text, error: ''}
          currentRequests.delete(url)
          responseCache.set(url, response)
          resolve(response)
        } catch (e) {
          currentRequests.delete(url)
          resolve({error: e, text: ''})
        }
        return
      }

      const response = await g.hostAdapter.fetchWebPage(url, { ...options, currentPageUrl })
      currentRequests.delete(url)
      if (!response.error) responseCache.set(url, response)
      resolve(response)

    } catch (e) {
      currentRequests.delete(url)
      resolve({error: e, text: 'Something is wrong with the URL'})
    }
  })
}

export function invalidateCacheForUrl(url) {
  for (const key of responseCache.keys()) {
    if (key.startsWith(url)) {
      responseCache.delete(key)
    }
  }
}
