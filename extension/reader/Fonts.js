/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

// Each entry is a full set of font roles, mapped to CSS custom properties
// (--font-<role>-family / -weight / -line-height) consumed by reader.css,
// themes/light.css, themes/dark.css and themes/sepia.css, so switching to a
// different set and calling applyFonts() re-renders every themed and
// un-themed element that uses that role.
export const kFontRoleSets = [
    // Set 0 (default): sans-serif throughout, matching the original hardcoded CSS.
    {
        label: 'Default (sans-serif)',
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
    },
    // Set 1: classic editorial pairing - serif body text with bold sans-serif
    // headers for contrast, and a serif quote/code treatment to match.
    {
        label: 'Classic serif',
        main: {
            fontFamily: 'Georgia, "Times New Roman", serif',
            lineHeight: 1.6,
        },
        headers: {
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            fontWeight: 700,
            lineHeight: 1.25,
        },
        navigation: {
            fontFamily: "'Inter', sans-serif",
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: '"Palatino Linotype", Palatino, Georgia, serif',
            lineHeight: 1.6,
        },
        sourceView: {
            fontFamily: "'Times New Roman', Times, serif",
        },
    },
    // Set 2 (exotic): comic / playful - Comic Sans everywhere.
    {
        label: 'Comic',
        main: {
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            lineHeight: 1.5,
        },
        headers: {
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            fontWeight: 700,
            lineHeight: 1.3,
        },
        navigation: {
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            lineHeight: 1.5,
        },
        sourceView: {
            fontFamily: '"Courier New", Courier, monospace',
        },
    },
    // Set 3 (exotic): typewriter - monospace body copy throughout, not just code.
    {
        label: 'Typewriter',
        main: {
            fontFamily: '"Courier New", Courier, monospace',
            lineHeight: 1.6,
        },
        headers: {
            fontFamily: '"Courier New", Courier, monospace',
            fontWeight: 700,
            lineHeight: 1.3,
        },
        navigation: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: '"Courier New", Courier, monospace',
            lineHeight: 1.6,
        },
        sourceView: {
            fontFamily: '"Courier New", Courier, monospace',
        },
    },
    // Set 4: poster - big blocky Impact headers over a clean Verdana body.
    {
        label: 'Poster',
        main: {
            fontFamily: 'Verdana, Geneva, sans-serif',
            lineHeight: 1.5,
        },
        headers: {
            fontFamily: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
            lineHeight: 1.1,
        },
        navigation: {
            fontFamily: 'Verdana, Geneva, sans-serif',
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: 'Georgia, serif',
            lineHeight: 1.5,
        },
        sourceView: {
            fontFamily: "'Times New Roman', Times, serif",
        },
    },
    // Set 5 (exotic): elegant script - cursive headers over a classic Garamond body.
    {
        label: 'Elegant script',
        main: {
            fontFamily: 'Garamond, "Book Antiqua", Palatino, serif',
            lineHeight: 1.7,
        },
        headers: {
            fontFamily: '"Brush Script MT", "Segoe Script", cursive',
            lineHeight: 1.4,
        },
        navigation: {
            fontFamily: '"Book Antiqua", Palatino, serif',
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: '"Brush Script MT", "Segoe Script", cursive',
            lineHeight: 1.5,
        },
        sourceView: {
            fontFamily: "'Times New Roman', Times, serif",
        },
    },
    // Set 6: modern minimal - light-weight Segoe UI, Office/Windows aesthetic.
    {
        label: 'Modern minimal',
        main: {
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            lineHeight: 1.5,
        },
        headers: {
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            fontWeight: 300,
            lineHeight: 1.25,
        },
        navigation: {
            fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        },
        code: {
            fontFamily: 'Consolas, "Lucida Console", monospace',
        },
        quotes: {
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
        },
        sourceView: {
            fontFamily: "'Times New Roman', Times, serif",
        },
    },
    // Set 7: geometric editorial - bold Century Gothic headers over a Garamond body.
    {
        label: 'Geometric editorial',
        main: {
            fontFamily: 'Garamond, "Book Antiqua", Palatino, serif',
            lineHeight: 1.7,
        },
        headers: {
            fontFamily: '"Century Gothic", "Trebuchet MS", sans-serif',
            fontWeight: 700,
            lineHeight: 1.25,
        },
        navigation: {
            fontFamily: '"Trebuchet MS", sans-serif',
        },
        code: {
            fontFamily: '"Lucida Console", Monaco, monospace',
        },
        quotes: {
            fontFamily: 'Garamond, "Book Antiqua", serif',
            lineHeight: 1.6,
        },
        sourceView: {
            fontFamily: "'Times New Roman', Times, serif",
        },
    },
    // Set 8 (exotic): retro poster - engraved Copperplate headers over a Georgia body.
    {
        label: 'Retro poster',
        main: {
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
        },
        headers: {
            fontFamily: '"Copperplate", "Copperplate Gothic Light", fantasy',
            lineHeight: 1.3,
        },
        navigation: {
            fontFamily: 'Verdana, Geneva, sans-serif',
        },
        code: {
            fontFamily: '"Courier New", Courier, monospace',
        },
        quotes: {
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
        },
        sourceView: {
            fontFamily: '"Courier New", Courier, monospace',
        },
    },
    // Set 9 (exotic): terminal - Consolas monospace everywhere, hacker reading mode.
    {
        label: 'Terminal',
        main: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            lineHeight: 1.5,
        },
        headers: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            fontWeight: 700,
            lineHeight: 1.2,
        },
        navigation: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        },
        code: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        },
        quotes: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
            lineHeight: 1.5,
        },
        sourceView: {
            fontFamily: 'Consolas, "Lucida Console", Monaco, monospace',
        },
    },
]

export function applyFonts(fonts = kFontRoleSets[0]) {
    const rootEl = document.getElementById('ui-root')
    if (!rootEl) return

    for (const [role, font] of Object.entries(fonts)) {
        if (role === 'label') continue
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
