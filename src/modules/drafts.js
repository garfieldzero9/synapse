import { supabase } from '../lib/supabaseClient.js';

/**
 * Loads and renders the user's saved drafts (ideas without generated content).
 * @param {object} user - Supabase user.
 * @param {Function} switchView - Function to switch the active dashboard view.
 * @param {HTMLTextAreaElement} inputEl - The main brain-dump textarea.
 */
export async function loadDrafts(user, switchView, inputEl) {
    const draftsList = document.getElementById('draftsList');
    const draftsEmptyState = document.getElementById('draftsEmptyState');

    if (!draftsList) return;

    draftsList.innerHTML = '';
    if (draftsEmptyState) {
        draftsList.appendChild(draftsEmptyState);
        draftsEmptyState.style.display = 'block';
    }

    try {
        const { data, error } = await supabase
            .from('ideas')
            .select(`id, raw_text, created_at, generated_content!left ( id )`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (draftsEmptyState) draftsEmptyState.style.display = 'none';

        const savedDrafts = data.filter((idea) => idea.generated_content.length === 0);

        if (!savedDrafts || savedDrafts.length === 0) {
            draftsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-style: italic;">You have no saved drafts.</div>`;
            return;
        }

        savedDrafts.forEach((draft) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.animation = 'none';
            const dateStr = new Date(draft.created_at).toLocaleDateString();

            cardEl.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Saved on: ${dateStr}</div>
        <div class="card-tag" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--glass-border);">Draft</div>
        <div class="card-content" style="line-height: 1.6; font-size: 0.95rem;">
          <p>${draft.raw_text.replace(/\n/g, '<br/>')}</p>
        </div>
        <div class="card-actions">
          <button class="copy-btn copy-draft-btn">Copy Text</button>
          <button class="copy-btn load-draft-btn" style="background: var(--glass-bg); color: var(--accent-1); border-color: var(--accent-1);" data-text="${encodeURIComponent(draft.raw_text)}">Load into Editor</button>
        </div>
      `;

            cardEl.querySelector('.copy-draft-btn').addEventListener('click', (e) => {
                const btn = e.target;
                navigator.clipboard.writeText(draft.raw_text);
                btn.textContent = 'Copied!';
                btn.style.color = 'var(--accent-2)';
                setTimeout(() => { btn.textContent = 'Copy Text'; btn.style.color = ''; }, 2000);
            });

            cardEl.querySelector('.load-draft-btn').addEventListener('click', (e) => {
                const text = decodeURIComponent(e.target.dataset.text);
                switchView('home');
                if (inputEl) {
                    inputEl.value = text;
                    inputEl.style.height = 'auto';
                    setTimeout(() => { inputEl.style.height = (inputEl.scrollHeight) + 'px'; inputEl.focus(); }, 50);
                }
            });

            draftsList.appendChild(cardEl);
        });
    } catch (err) {
        console.error('Error loading drafts:', err);
        draftsList.innerHTML = `<div style="color: #ef4444; text-align: center;">Error loading drafts.</div>`;
    }
}

/**
 * Binds the "Save Text" button to save the current input as a draft idea in Supabase.
 * @param {object} user - Supabase user.
 * @param {HTMLTextAreaElement} inputEl - The main brain-dump textarea.
 */
export function initSaveDraft(user, inputEl) {
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (!saveDraftBtn) return;

    saveDraftBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const text = inputEl ? inputEl.value.trim() : '';
        if (!text) {
            alert('Your second brain is empty. Type something first!');
            return;
        }

        saveDraftBtn.textContent = 'Saving...';
        saveDraftBtn.style.opacity = '0.7';
        saveDraftBtn.disabled = true;

        try {
            const { error } = await supabase
                .from('ideas')
                .insert([{ user_id: user.id, raw_text: text }]);

            if (error) throw error;

            saveDraftBtn.textContent = 'Saved!';
            saveDraftBtn.style.color = 'var(--accent-2)';
            setTimeout(() => {
                saveDraftBtn.textContent = 'Save Text';
                saveDraftBtn.style.opacity = '1';
                saveDraftBtn.disabled = false;
                saveDraftBtn.style.color = '';
                saveDraftBtn.style.borderColor = '';
            }, 2000);
        } catch (err) {
            console.error('Error saving draft:', err);
            alert('Could not save draft.');
            saveDraftBtn.textContent = 'Save Text';
            saveDraftBtn.style.opacity = '1';
            saveDraftBtn.disabled = false;
            saveDraftBtn.style.color = '';
            saveDraftBtn.style.borderColor = '';
        }
    });
}
