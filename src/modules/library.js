import { supabase } from '../lib/supabaseClient.js';

/**
 * Fetches and renders all previously generated content (LinkedIn + Twitter) from Supabase.
 * @param {object} user - Supabase user.
 */
export async function loadLibrary(user) {
    const libraryList = document.getElementById('libraryList');
    const libraryEmptyState = document.getElementById('libraryEmptyState');

    if (!libraryList) return;

    libraryList.innerHTML = '';
    if (libraryEmptyState) {
        libraryList.appendChild(libraryEmptyState);
        libraryEmptyState.style.display = 'block';
    }

    try {
        const { data, error } = await supabase
            .from('generated_content')
            .select(`id, content_type, content, created_at, ideas ( raw_text )`)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (libraryEmptyState) libraryEmptyState.style.display = 'none';

        if (!data || data.length === 0) {
            libraryList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-style: italic;">Your library is empty.</div>`;
            return;
        }

        data.forEach((item) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.animation = 'none';

            const formattedText = item.content.replace(/\n/g, '<br/>');
            const originalIdea = item.ideas ? item.ideas.raw_text : 'Unknown Input';
            const dateStr = new Date(item.created_at).toLocaleDateString();

            if (item.content_type === 'twitter') {
                const tweets = item.content.split('\n\n').filter((t) => t.trim().length > 0 && !t.startsWith('---'));
                const twitterHtml = tweets
                    .map((t) => {
                        const clean = t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim();
                        return `<div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--glass-border); line-height: 1.5; font-size: 0.95rem;">${clean.replace(/\n/g, '<br/>')}</div>`;
                    })
                    .join('');

                cardEl.innerHTML = `
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Based on: "${originalIdea.substring(0, 60)}..." • ${dateStr}</div>
          <div class="card-tag twitter">Twitter Thread</div>
          <div class="card-title">Archived Thread</div>
          <div class="card-content" style="display: flex; flex-direction: column; gap: 4px;">${twitterHtml}</div>
        `;
            } else {
                cardEl.innerHTML = `
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Based on: "${originalIdea.substring(0, 60)}..." • ${dateStr}</div>
          <div class="card-tag linkedin">LinkedIn Post</div>
          <div class="card-title">Archived Post</div>
          <div class="card-content" style="line-height: 1.6; font-size: 0.95rem;"><p>${formattedText}</p></div>
        `;
            }

            libraryList.appendChild(cardEl);
        });
    } catch (err) {
        console.error('Error loading library:', err);
        libraryList.innerHTML = `<div style="color: #ef4444; text-align: center;">Error loading library data.</div>`;
    }
}
