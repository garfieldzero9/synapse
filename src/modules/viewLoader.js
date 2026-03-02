/**
 * viewLoader.js — Dynamic HTML View Loader
 *
 * Fetches each view's HTML partial from src/views/ and injects it
 * into the #views-container element in app.html. Views are fetched
 * once and cached so navigation is instant on subsequent visits.
 */

const VIEW_FILES = {
    home: '/src/views/home.html',
    drafts: '/src/views/drafts.html',
    library: '/src/views/library.html',
    voicelab: '/src/views/voiceLab.html',
    settings: '/src/views/settings.html',
};

/**
 * Fetches all view partials and appends them to #views-container.
 * Resolves once all views are in the DOM and ready for JS to bind.
 */
export async function loadAllViews() {
    const container = document.getElementById('views-container');
    if (!container) throw new Error('#views-container not found in app.html');

    const fetchPromises = Object.entries(VIEW_FILES).map(async ([, path]) => {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load view: ${path} (${res.status})`);
        return res.text();
    });

    const htmlParts = await Promise.all(fetchPromises);
    container.innerHTML = htmlParts.join('\n');
}
