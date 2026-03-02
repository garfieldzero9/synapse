import { supabase } from '../lib/supabaseClient.js';

/**
 * Fetches voice profiles and populates the active profile dropdown on the Home view.
 * @param {object} user - Supabase user.
 */
export async function loadVoiceProfilesForDropdown(user) {
    const dropdown = document.getElementById('activeVoiceProfile');
    if (!dropdown) return;

    try {
        const { data, error } = await supabase
            .from('voice_profiles')
            .select('id, name, is_default')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false });

        if (error) throw error;

        dropdown.innerHTML = '<option value="">Default AI Voice (No Profile)</option>';
        if (data) {
            data.forEach((profile) => {
                const option = document.createElement('option');
                option.value = profile.id;
                option.textContent = profile.name + (profile.is_default ? ' (Default)' : '');
                if (profile.is_default) option.selected = true;
                dropdown.appendChild(option);
            });
        }
    } catch (err) {
        console.error('Error loading voice profiles for dropdown:', err);
    }
}

/**
 * Fetches voice profiles and renders them as cards in the Voice Lab section.
 * @param {object} user - Supabase user.
 */
export async function loadVoiceProfiles(user) {
    const voiceProfilesList = document.getElementById('voiceProfilesList');
    if (!voiceProfilesList) return;

    const emptyState = document.getElementById('voiceProfilesEmptyState');
    voiceProfilesList.innerHTML = '';
    if (emptyState) {
        voiceProfilesList.appendChild(emptyState);
        emptyState.style.display = 'block';
    }

    try {
        const { data, error } = await supabase
            .from('voice_profiles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (emptyState) emptyState.style.display = 'none';

        if (!data || data.length === 0) {
            voiceProfilesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-style: italic;">No custom voices saved yet. Generate one above!</div>`;
            return;
        }

        data.forEach((profile) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.animation = 'none';
            cardEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <div>
            <div class="card-tag" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">${profile.is_default ? '🟢 Default Profile' : 'Profile'}</div>
            <div class="card-title" style="margin-top: 8px;">${profile.name}</div>
          </div>
          <button class="delete-profile-btn" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.9rem;" data-id="${profile.id}">Delete</button>
        </div>
        <div class="card-content" style="max-height: 80px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; line-height: 1.6; font-size: 0.85rem; font-family: monospace; color: var(--text-muted);">
          ${profile.system_prompt}
        </div>
        <div style="margin-top: 10px; font-size: 0.8rem; color: #aaa;">Model: ${profile.model || localStorage.getItem('synapse_model') || 'Default'}</div>
      `;

            cardEl.querySelector('.delete-profile-btn').addEventListener('click', async () => {
                if (confirm('Delete this voice profile?')) {
                    await supabase.from('voice_profiles').delete().eq('id', profile.id);
                    loadVoiceProfiles(user);
                }
            });

            voiceProfilesList.appendChild(cardEl);
        });
    } catch (err) {
        console.error('Error loading voice profiles:', err);
        voiceProfilesList.innerHTML = `<div style="color: #ef4444; text-align: center;">Error loading profiles.</div>`;
    }
}
