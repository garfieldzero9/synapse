import { loadDrafts } from './drafts.js';
import { loadLibrary } from './library.js';
import { loadVoiceProfiles, loadVoiceProfilesForDropdown } from './voiceProfiles.js';

/**
 * Sets up all navigation event listeners and the switchView function.
 * @param {object} user - Supabase user.
 * @param {HTMLTextAreaElement} inputEl - The main brain-dump textarea.
 * @returns {Function} switchView - Call switchView('home'|'library'|'drafts'|'voicelab'|'settings') to navigate.
 */
export function initNavigation(user, inputEl) {
    const sections = {
        home: document.getElementById('homeSection'),
        library: document.getElementById('librarySection'),
        drafts: document.getElementById('draftsSection'),
        voicelab: document.getElementById('voiceLabSection'),
        settings: document.getElementById('settingsSection'),
    };

    const navBtns = {
        home: document.getElementById('navHomeBtn'),
        drafts: document.getElementById('navNewDraftBtn'),
        library: document.getElementById('navLibraryBtn'),
        voicelab: document.getElementById('navVoiceLabBtn'),
        settings: document.getElementById('navSettingsBtn'),
    };

    /**
     * Switches the active dashboard section.
     * @param {'home'|'library'|'drafts'|'voicelab'|'settings'} view
     */
    const switchView = (view) => {
        // Deactivate all nav items and hide all sections
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        Object.values(sections).forEach((s) => { if (s) s.style.display = 'none'; });

        const section = sections[view];
        const btn = navBtns[view];

        if (section) section.style.display = 'block';
        if (btn) btn.classList.add('active');

        // Trigger data loading for views that need it
        if (view === 'home') {
            loadVoiceProfilesForDropdown(user);
            setTimeout(() => { if (inputEl) inputEl.focus(); }, 100);
        } else if (view === 'library') {
            loadLibrary(user);
        } else if (view === 'drafts') {
            loadDrafts(user, switchView, inputEl);
        } else if (view === 'voicelab') {
            loadVoiceProfiles(user);
        }
    };

    // Bind nav buttons
    if (navBtns.home) navBtns.home.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
    if (navBtns.library) navBtns.library.addEventListener('click', (e) => { e.preventDefault(); switchView('library'); });
    if (navBtns.drafts) navBtns.drafts.addEventListener('click', (e) => { e.preventDefault(); switchView('drafts'); });
    if (navBtns.voicelab) navBtns.voicelab.addEventListener('click', (e) => { e.preventDefault(); switchView('voicelab'); });
    if (navBtns.settings) navBtns.settings.addEventListener('click', (e) => { e.preventDefault(); switchView('settings'); });

    return switchView;
}
