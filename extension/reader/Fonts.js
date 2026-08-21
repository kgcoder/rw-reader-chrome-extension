/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

// Font roles collected from reader.css, themes/light.css, themes/dark.css and themes/sepia.css.
// Each role maps to CSS custom properties (--font-<role>-family / -weight / -line-height)
// consumed by those same stylesheets, so changing a value here and calling applyFonts()
// re-renders every themed and un-themed element that uses that role.
export const kFontRoles = {
    main: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1.55,
    },
    headers: {
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        fontWeight: 600,
        lineHeight: 1.3,
    },
    navigation: {
        fontFamily: "'Inter', sans-serif",
    },
    code: {
        fontFamily: '"Fira Code", monospace',
    },
    quotes: {
        fontFamily: 'Georgia, serif',
        lineHeight: 1.6,
    },
    sourceView: {
        fontFamily: "'Times New Roman', Times, serif",
    },
}

export function applyFonts(fonts = kFontRoles) {
    const rootEl = document.getElementById('ui-root')
    if (!rootEl) return

    for (const [role, font] of Object.entries(fonts)) {
        const cssRole = role.replace(/([A-Z])/g, '-$1').toLowerCase()
        rootEl.style.setProperty(`--font-${cssRole}-family`, font.fontFamily)
        if (font.fontWeight !== undefined) {
            rootEl.style.setProperty(`--font-${cssRole}-weight`, font.fontWeight)
        }
        if (font.lineHeight !== undefined) {
            rootEl.style.setProperty(`--font-${cssRole}-line-height`, font.lineHeight)
        }
    }
}
