/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/


import { kFontRoleSets } from './reader/Fonts.js'


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




// Theme colors are duplicated here (from themes/*.css) since popup.js runs in a
// separate extension page and can't read the reader's CSS custom properties directly.
// Keep these in sync if the theme CSS files' --bg-main/--text-main change.
const kThemeOptions = [
    { value: 'light', label: 'Light', bg: '#fafafa', text: '#2c2c2c' },
    { value: 'dark', label: 'Dark', bg: '#1e1e1e', text: '#e0e0e0' },
    { value: 'sepia', label: 'Sepia', bg: '#FBF0D9', text: '#704214' },
    { value: 'mint', label: 'Mint', bg: '#EFFCFC', text: '#1A7162' },
    { value: 'ocean', label: 'Ocean', bg: '#C4D5F9', text: '#133F6A' },
    { value: 'lavender', label: 'Lavender', bg: '#FEFBFE', text: '#551D72' },
    { value: 'rose', label: 'Rose', bg: '#FBD9DE', text: '#701433' },
    { value: 'slate', label: 'Slate', bg: '#C6CEDF', text: '#2D3B4A' },
    { value: 'olive', label: 'Olive', bg: '#C6F1BE', text: '#315F1B' },
    { value: 'matrix', label: 'Matrix', bg: '#13291A', text: '#55E786' },
    { value: 'navy', label: 'Navy', bg: '#131C29', text: '#5592E7' },
]

// Closers for every dropdown created via createCustomDropdown, so opening one closes the rest.
const openDropdownClosers = []
document.addEventListener('click', () => {
    openDropdownClosers.forEach(close => close())
})

function createCustomDropdown({ label, options, selectedValue, renderOption, onSelect }) {
    const wrapper = document.createElement('div')
    wrapper.className = 'rw-dropdown'

    const dropdownLabel = document.createElement('div')
    dropdownLabel.className = 'rw-dropdown-label'
    dropdownLabel.textContent = label
    wrapper.appendChild(dropdownLabel)

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'rw-dropdown-trigger'
    wrapper.appendChild(trigger)

    const panel = document.createElement('div')
    panel.className = 'rw-dropdown-panel'
    panel.style.display = 'none'
    wrapper.appendChild(panel)

    let selected = selectedValue

    function renderTrigger() {
        trigger.innerHTML = ''
        const content = document.createElement('div')
        content.style.flex = '1'
        const opt = options.find(o => o.value === selected) ?? options[0]
        renderOption(content, opt)

        const caret = document.createElement('span')
        caret.textContent = '▾'
        caret.style.marginLeft = '8px'

        trigger.appendChild(content)
        trigger.appendChild(caret)
    }

    function closePanel() {
        panel.style.display = 'none'
    }

    function openPanel() {
        panel.innerHTML = ''
        options.forEach(opt => {
            const row = document.createElement('div')
            row.className = 'rw-dropdown-option'
            renderOption(row, opt)
            row.addEventListener('click', () => {
                selected = opt.value
                renderTrigger()
                onSelect(opt.value)
            })
            panel.appendChild(row)
        })
        panel.style.display = 'block'
    }

    openDropdownClosers.push(closePanel)

    trigger.addEventListener('click', (e) => {
        e.stopPropagation()
        const wasOpen = panel.style.display !== 'none'
        openDropdownClosers.forEach(close => close())
        if (!wasOpen) openPanel()
    })

    renderTrigger()

    return wrapper
}

function renderFontOption(container, opt) {
    const label = document.createElement('div')
    label.textContent = opt.set.label
    label.style.fontSize = '11px'
    label.style.fontWeight = 'bold'
    label.style.color = '#888'
    label.style.marginBottom = '2px'

    const heading = document.createElement('div')
    heading.textContent = 'Example Heading'
    heading.style.fontFamily = opt.set.headers.fontFamily
    heading.style.fontWeight = opt.set.headers.fontWeight ?? 'bold'

    const body = document.createElement('div')
    body.textContent = 'The quick brown fox jumps over the lazy dog.'
    body.style.fontFamily = opt.set.main.fontFamily
    body.style.fontSize = '12px'

    container.appendChild(label)
    container.appendChild(heading)
    container.appendChild(body)
}

function renderThemeOption(container, opt) {
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.alignItems = 'center'
    row.style.gap = '8px'

    const swatch = document.createElement('div')
    swatch.style.width = '28px'
    swatch.style.height = '28px'
    swatch.style.flex = '0 0 auto'
    swatch.style.borderRadius = '4px'
    swatch.style.border = '1px solid #ccc'
    swatch.style.background = opt.bg
    swatch.style.color = opt.text
    swatch.style.display = 'flex'
    swatch.style.alignItems = 'center'
    swatch.style.justifyContent = 'center'
    swatch.style.fontWeight = 'bold'
    swatch.style.fontSize = '13px'
    swatch.textContent = 'Aa'

    const label = document.createElement('span')
    label.textContent = opt.label

    row.appendChild(swatch)
    row.appendChild(label)
    container.appendChild(row)
}


function updatePageMetadata(response) {
    const {areLinksThick,fetchMode,theme,fontSet,isShowingReader,isShowingParsingRulesConstructor, currentLocation, isUnforcedEmbeddedHDOC} = response

    const settingsMenu = document.getElementById("settingsMenu")


    const fontDropdown = createCustomDropdown({
        label: 'Font',
        options: kFontRoleSets.map((set, i) => ({ value: i, set })),
        selectedValue: fontSet ?? 0,
        renderOption: renderFontOption,
        onSelect: (value) => sendMessageToPage({ messageName: 'SetFontSet', fontSet: value })
    })
    settingsMenu.appendChild(fontDropdown)

    const themeDropdown = createCustomDropdown({
        label: 'Theme',
        options: kThemeOptions,
        selectedValue: theme ?? 'light',
        renderOption: renderThemeOption,
        onSelect: (value) => sendMessageToPage({ messageName: 'SetTheme', theme: value })
    })
    settingsMenu.appendChild(themeDropdown)


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
    const examplesLink = document.getElementById("explore-readers-web-link")
    const sourceCodeLink = document.getElementById("source-code-link")

    aboutLink.addEventListener('click',() => window.open('https://readersweb.org','_blank'))
    examplesLink.addEventListener('click',() => window.open('https://readersweb.org/explore-readers-web/','_blank'))
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

