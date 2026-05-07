type SortDirection = "asc" | "desc";

const withShortcut = (label: string, shortcut: string): string =>
  `${label} (${shortcut})`;

export const TOOLTIPS = {
  timeline: {
    split: withShortcut("Split clip at playhead", "S"),
    merge: withShortcut("Merge selected clips", "M"),
    delete: withShortcut("Delete selected clips", "Del"),
    undo: withShortcut("Undo last edit", "Ctrl+Z"),
    redo: withShortcut("Redo last edit", "Ctrl+Y"),
    zoomOut: "Zoom out timeline",
    zoomIn: "Zoom in timeline",
    fitToScreen: "Fit timeline to view",
  },
  clips: {
    download: "Download clip",
    addToTimeline: "Add clip to timeline",
    removeFromTimeline: "Remove clip from timeline",
  },
  colorPicker: {
    open: "Pick color",
    presetPrefix: "Use color",
  },
  console: {
    copy: "Copy console logs",
    clear: "Clear console logs",
  },
  preview: {
    browseOutputFolder: "Browse output folder",
  },
  general: {
    defaultEpisodesPath: "Default (App Data)",
  },
  crop: {
    reset: "Reset all changes",
    rotateLeft: "Rotate left (-90deg)",
    rotateRight: "Rotate right (+90deg)",
    flipHorizontal: "Flip horizontal",
    flipVertical: "Flip vertical",
  },
  exportProfile: {
    useCustomIcon: "Use custom icon",
    deleteCustomIcon: "Delete custom icon",
    addCustomIcon: "Add custom icon",
    chooseIcon: "Choose icon",
    pinQuickIcon: "Pin to quick icons",
    unpinQuickIcon: "Unpin from quick icons",
  },
  sidebar: {
    home: "Open Home page",
    menu: "Open Menu page",
    settings: "Open Settings page",
  },
  episodePanel: {
    sortAsc: "Sort A to Z",
    sortDesc: "Sort Z to A",
    newFolder: "Create new folder",
    clearCache: "Clear episode panel cache",
    collapseFolder: "Collapse folder",
    expandFolder: "Expand folder",
  },
} as const;

export function getTimelineToggleTooltip(isSelected: boolean): string {
  return isSelected
    ? TOOLTIPS.clips.removeFromTimeline
    : TOOLTIPS.clips.addToTimeline;
}

export function getColorPresetTooltip(color: string): string {
  return `${TOOLTIPS.colorPicker.presetPrefix}: ${color.toUpperCase()}`;
}

export function getSortTooltip(direction: SortDirection): string {
  return direction === "asc"
    ? TOOLTIPS.episodePanel.sortAsc
    : TOOLTIPS.episodePanel.sortDesc;
}

export function getPinQuickIconTooltip(isPinned: boolean): string {
  return isPinned
    ? TOOLTIPS.exportProfile.unpinQuickIcon
    : TOOLTIPS.exportProfile.pinQuickIcon;
}

export function getProfileIconTooltip(label: string): string {
  return `Use icon: ${label}`;
}

export function getEpisodesPathTooltip(path: string | null | undefined): string {
  return path || TOOLTIPS.general.defaultEpisodesPath;
}
