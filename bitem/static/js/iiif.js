var mirador = Mirador.viewer({
    "selectedTheme": "dark",
    "id": "my-mirador",
    "windows": [
        {
            "manifestId": img_manifest
        }
    ],
    language: language,
    availableLanguages: { // All the languages available in the language switcher
        de: 'Deutsch',
        en: 'English'
    },
    window: {
        allowClose: false,
        defaultSideBarPanel: 'attribution',
        sideBarOpenByDefault: false,
        allowMaximize: false, // Configure if windows can be maximized or not
        allowTopMenuButton: false, // Configure if window view and thumbnail display menu are visible or not
        defaultView: 'single',  // Configure which viewing mode (e.g. single, book, gallery) for windows to be opened in
        sideBarOpen: false, // Configure if the sidebar (and its content panel) is open by default
    },
    workspace: {
        allowNewWindows: false,
        showZoomControls: false,
        type: 'mosaic', // Which workspace type to load by default. Other possible values are "elastic"
    },
    workspaceControlPanel: {
        enabled: false,
    }
});