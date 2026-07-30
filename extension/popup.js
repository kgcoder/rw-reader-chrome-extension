/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/


document.addEventListener('DOMContentLoaded', function () {

    getPageMetadata()

}, false)


chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'pageMetadata') {
        updatePageMetadata(message.payload);
    }
});


function getPageMetadata() {

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return;

        chrome.tabs.sendMessage(tab.id, 'giveMePageMetadata');
    });
  
}




function updatePageMetadata(response) {
    const {areLinksThick,fetchMode,isShowingReader,isShowingParsingRulesConstructor, currentLocation, isUnforcedEmbeddedHDOC} = response

    const settingsMenu = document.getElementById("settingsMenu")

    const thickLinksLabel = document.createElement('label')
    thickLinksLabel.style.display = 'flex'
    thickLinksLabel.style.alignItems = 'center'
    thickLinksLabel.style.gap = '8px'
    thickLinksLabel.style.marginBottom = '8px'

    const thickLinksCheckbox = document.createElement('input')
    thickLinksCheckbox.type = 'checkbox'
    thickLinksCheckbox.id = 'thick-links-checkbox'
    thickLinksCheckbox.checked = areLinksThick

    thickLinksLabel.appendChild(thickLinksCheckbox)
    thickLinksLabel.appendChild(document.createTextNode('Thick links'))

    settingsMenu.appendChild(thickLinksLabel)

    thickLinksCheckbox.addEventListener('change', () => {
        sendMessageToPage({ messageName: 'ToggleThickLinks', enabled: thickLinksCheckbox.checked })
    })


    const fetchModeSubheader = document.createElement('div')
    fetchModeSubheader.textContent = 'When fetching pages from other websites'
    fetchModeSubheader.style.fontWeight = 'bold'
    fetchModeSubheader.style.marginBottom = '6px'
    fetchModeSubheader.style.marginTop = '4px'
    settingsMenu.appendChild(fetchModeSubheader)

    const fetchModeOptions = [
        { value: 'strict', label: 'Ask for confirmation each time' },
        { value: 'smart',  label: 'Ask only for private/internal addresses' },
        { value: 'open',   label: 'Never ask' },
    ]

    for (const { value, label } of fetchModeOptions) {
        const optionLabel = document.createElement('label')
        optionLabel.style.display = 'flex'
        optionLabel.style.alignItems = 'center'
        optionLabel.style.gap = '8px'
        optionLabel.style.marginBottom = '6px'

        const radio = document.createElement('input')
        radio.type = 'radio'
        radio.name = 'fetch-mode'
        radio.value = value
        radio.checked = (fetchMode ?? 'strict') === value

        radio.addEventListener('change', () => {
            if (radio.checked) sendMessageToPage({ messageName: 'SetFetchMode', fetchMode: value })
        })

        optionLabel.appendChild(radio)
        optionLabel.appendChild(document.createTextNode(label))
        settingsMenu.appendChild(optionLabel)
    }

    if(isUnforcedEmbeddedHDOC){
        //show nothing
    }else if(isShowingReader){
        const rightPageUrlContainer = document.getElementById("right-page-url-container")
        rightPageUrlContainer.style.display = 'flex'

        const button = document.getElementById("right-doc-download-button")


        button.addEventListener('click', () => {
            const input = document.getElementById("right-doc-url-input")
            sendMessageToPage({ messageName: 'DownloadConnectedPage', url: input.value.trim() })
        })

    }else if(!isShowingParsingRulesConstructor){
        const openInPlaygroundButton = document.getElementById("open-in-playground-button")
        openInPlaygroundButton.addEventListener('click',() => {
            sendMessageToPage({ messageName: 'OpenInParsingRulesConstructor' })
            
            window.close()
        })
        openInPlaygroundButton.style.display = 'flex'

    }




    


    const aboutLink = document.getElementById("about-link")
    const howToLink = document.getElementById("how-to-link")
    const examplesLink = document.getElementById("visible-connections-examples-link")
    const sourceCodeLink = document.getElementById("source-code-link")

    aboutLink.addEventListener('click',() => window.open('https://readersweb.org','_blank'))
    examplesLink.addEventListener('click',() => window.open('https://readersweb.org/community-resources/','_blank'))
    howToLink.addEventListener('click',() => window.open('https://readersweb.org/how-to-create-visible-connections/','_blank'))
    sourceCodeLink.addEventListener('click',() => window.open('https://github.com/kgcoder/rw-reader-chrome-extension','_blank'))


    const mainContainer = document.getElementById("mainContainer")
    mainContainer.style.display = 'flex'

    const fallbackMessage = document.getElementById("fallback-message")
    fallbackMessage.style.display = 'none'



}



function sendMessageToPage(message) {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message)
    })
}

