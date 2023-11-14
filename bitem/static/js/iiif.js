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

let loadingIndicator = document.getElementById('loading-indicator');
// Assuming you have an image element inside the viewer
const imageElement = document.querySelector('.mirador-image-tools');

// Attach an event listener for the 'manifestDataUpdated' event
mirador.store.subscribe(() => {
    const { manifests } = mirador.store.getState();

    // Check if there are manifests (images) loaded
    if (manifests && Object.keys(manifests).length > 0) {
        loadingIndicator.style.display = 'none';
    }
});