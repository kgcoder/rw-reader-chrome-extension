/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.action === 'fetchWebPage') {
    try {
      const result = await fetch(msg.url,{
        //  cache: "no-store",   // or "reload" or "no-store"
        //   headers: {
        //     "Cache-Control": "no-cache"
        //   }
      })
      const text = await result.text()
  
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'fetchResult',
        id: msg.id,
        html: text,
        url:msg.url
      });
      
    } catch (e) {
      chrome.tabs.sendMessage(sender.tab.id, {
          action: 'fetchResult',
          id: msg.id,
          isError: true,
          url:msg.url,
          html: `ERROR: ${e.message}`
      });
    }
  }

});

