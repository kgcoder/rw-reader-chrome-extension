/*
RW Reader Chrome Extension
Copyright (c) 2025 Karen Grigorian
Licensed under the MIT License (code)

This extension uses document types defined by the Reader's Web project.
All Reader's Web document types (current and future) are licensed under CC BY-ND 4.0.

For the official list of document types and specifications, see:
https://github.com/kgcoder/readers-web-specs
*/

export const kMinVisibleElementSize = 5

export const minSizeForNoteDivToBeVisible = 2000000

export const minSizeForWidgetDivToBeVisible = 80

export const kDefaultHeightOfNote = 160

export const maxFlinksNumberBeforeOptimization = 50

export const kSidebarWidthToScreenWidthRatio = 0.2



export const kColorsForFlinks = ['#FF0000', '#0000FF', '#FF8000', '#8000FF','#119FFF','#FF41A0','#36B952','#F3655C']

// Per-theme overrides for flink colors/rendering. A theme entry may override `colors`
// (falls back to kColorsForFlinks when absent) and/or `useOutlineOnlyHighlights` (falls
// back to false). dark/matrix/navy are the only themes with a genuinely dark background,
// where translucent color fills behind highlighted text look bad.
export const kFlinkThemeSettings = {
    dark:   { useOutlineOnlyHighlights: true },
    matrix: { useOutlineOnlyHighlights: true },
    navy:   { useOutlineOnlyHighlights: true },
    lavender: {colors:['#e139a6', '#0000FF', '#FF8000', '#8000FF','#119FFF','#FF41A0','#36B952','#F3655C']}
}

export function getFlinkColorsForTheme(themeName) {
    const settings = kFlinkThemeSettings[themeName]
    return (settings && settings.colors) ? settings.colors : kColorsForFlinks
}

export function getUseOutlineOnlyForTheme(themeName) {
    const settings = kFlinkThemeSettings[themeName]
    return !!(settings && settings.useOutlineOnlyHighlights)
}




