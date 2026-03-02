import { supabase } from '../lib/supabaseClient.js';
import { createOpenAIClient } from '../lib/openaiClient.js';

/**
 * Initializes the Settings section: loads saved values from localStorage,
 * handles saving new settings, and dynamically fetches available models from OpenRouter.
 * @param {object} user - The authenticated Supabase user object.
 */
export function initSettings(user) {
    const settingsApiKey = document.getElementById('settingsApiKey');
    const settingsModel = document.getElementById('settingsModel');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const settingsSaveStatus = document.getElementById('settingsSaveStatus');
    const settingsEmailView = document.getElementById('settingsEmailView');
    const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');

    // Populate fields from localStorage on load
    if (settingsApiKey) settingsApiKey.value = localStorage.getItem('synapse_api_key') || '';
    if (settingsModel) settingsModel.value = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';
    if (settingsEmailView) settingsEmailView.textContent = user.email || 'No email';

    // Logout button
    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
        });
    }

    // Save settings button
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const newKey = settingsApiKey ? settingsApiKey.value.trim() : '';
            const newModel = settingsModel ? settingsModel.value : '';
            localStorage.setItem('synapse_api_key', newKey);
            localStorage.setItem('synapse_model', newModel);

            if (settingsSaveStatus) {
                settingsSaveStatus.style.opacity = '1';
                setTimeout(() => { settingsSaveStatus.style.opacity = '0'; }, 2000);
            }

            // Reload model list if a key was just added
            if (newKey.length > 0) loadAvailableModels(settingsModel);
        });
    }

    // Auto-load models if a key already exists
    loadAvailableModels(settingsModel);
}

/**
 * Fetches the list of available models from OpenRouter via the OpenAI SDK
 * and populates the model <select> element.
 * @param {HTMLSelectElement|null} selectEl - The <select> element to populate.
 */
export async function loadAvailableModels(selectEl) {
    if (!selectEl) return;
    const apiKey = localStorage.getItem('synapse_api_key') || '';
    if (!apiKey) return;

    const savedModel = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';

    try {
        const openai = createOpenAIClient(apiKey);
        const response = await openai.models.list();
        const models = response.data;

        if (models && models.length > 0) {
            selectEl.innerHTML = '';
            models.forEach((m) => {
                const option = document.createElement('option');
                option.value = m.id;
                option.textContent = m.name || m.id;
                if (m.id === savedModel) option.selected = true;
                selectEl.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error fetching models via OpenAI SDK:', err);
    }
}
