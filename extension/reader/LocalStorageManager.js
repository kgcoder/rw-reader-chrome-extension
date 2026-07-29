/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

export function getObjectFromLocalStorage(objectName) {

    return new Promise(async (resolve, reject) => {
        
        
    const id = Math.random().toString(36).slice(2);


    function handleResponse(event) {
      if (event.source !== window) return;
        const msg = event.data;
        if (msg.type === "LOCAL_STORAGE_RESULT" && msg.id === id) {
          
        window.removeEventListener("message", handleResponse);
        resolve({value: msg.value});
      }
    }

    window.addEventListener("message", handleResponse);
    window.postMessage({ type: "GET_OBJECT_FROM_LOCAL_STORAGE", objectName, id }, "*");
  });
}


export function saveObjectInLocalStorage(objectName, object) {
    window.postMessage({ type: "SAVE_OBJECT_IN_LOCAL_STORAGE", objectName, object }, "*");
}