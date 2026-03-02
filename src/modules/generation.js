import { supabase } from '../lib/supabaseClient.js';
import { createOpenAIClient } from '../lib/openaiClient.js';

/**
 * Handles the full "Make Magic" content generation flow:
 * saves the raw idea, calls OpenRouter, parses JSON, renders cards.
 * @param {object} user - Supabase user.
 * @param {HTMLTextAreaElement} inputEl - The main brain-dump textarea.
 * @param {HTMLButtonElement} generateBtn - The "Make Magic" button element.
 * @param {HTMLElement} feedList - The feed container element.
 * @param {HTMLElement} emptyState - The empty state placeholder element.
 * @param {Function} switchView - Navigation function to redirect to settings on missing key.
 */
export async function handleGenerate(user, inputEl, generateBtn, feedList, emptyState, switchView) {
    const text = inputEl.value.trim();
    if (!text) return;

    // --- Update UI to loading state ---
    generateBtn.classList.add('is-loading');
    generateBtn.querySelector('span').textContent = 'Processing...';
    inputEl.disabled = true;

    // 1. Save raw idea to Supabase
    let ideaId = null;
    try {
        const { data, error } = await supabase
            .from('ideas')
            .insert([{ user_id: user.id, raw_text: text }])
            .select();
        if (error) throw error;
        if (data && data.length > 0) ideaId = data[0].id;
    } catch (err) {
        console.error('Error saving idea:', err);
    }

    // 2. Call LLM via BYOK
    try {
        const apiKey = localStorage.getItem('synapse_api_key');
        let model = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';
        let systemPrompt = 'You are an expert social media ghostwriter. You must transform the user\'s raw thought into two formats:\n1. A professional, engaging LinkedIn post.\n2. A concise, punchy Twitter thread.\nReturn a JSON object with two keys: "linkedin" and "twitter". The values should be the raw text strings. DO NOT wrap the output with json codeblocks.';

        if (!apiKey) {
            alert('Please set your API key in Settings first.');
            switchView('settings');
            throw new Error('No API Key');
        }

        // Check if a Voice Profile is selected
        const activeVoiceProfileDropdown = document.getElementById('activeVoiceProfile');
        if (activeVoiceProfileDropdown && activeVoiceProfileDropdown.value) {
            const { data: profile } = await supabase
                .from('voice_profiles')
                .select('system_prompt, model')
                .eq('id', activeVoiceProfileDropdown.value)
                .single();

            if (profile) {
                systemPrompt = profile.system_prompt + '\n\nIMPORTANT INSTRUCTION: You must transform the user\'s raw thought into two formats: 1. A LinkedIn post. 2. A Twitter thread. You MUST return ONLY a valid JSON object with the keys "linkedin" and "twitter". DO NOT wrap the JSON in formatting blocks.';
                if (profile.model) model = profile.model;
            }
        }

        const openai = createOpenAIClient(apiKey);
        const response = await openai.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
        });

        let contentStr = response.choices[0].message.content;

        // Extract JSON block, ignoring any conversational filler the model may add
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) contentStr = jsonMatch[0];

        let parsedContent;
        try {
            parsedContent = JSON.parse(contentStr);
        } catch (e) {
            console.error('Failed to parse JSON, falling back to raw:', contentStr);
            parsedContent = { linkedin: contentStr, twitter: 'Failed to distinguish Twitter thread. See LinkedIn output.' };
        }

        // Normalize to strings (models sometimes return arrays)
        let linkedinText = parsedContent.linkedin || 'No LinkedIn content generated.';
        let twitterText = parsedContent.twitter || 'No Twitter content generated.';
        if (Array.isArray(linkedinText)) linkedinText = linkedinText.join('\n\n');
        if (typeof linkedinText !== 'string') linkedinText = JSON.stringify(linkedinText);
        if (Array.isArray(twitterText)) twitterText = twitterText.join('\n\n');
        if (typeof twitterText !== 'string') twitterText = JSON.stringify(twitterText);

        // 3. Persist generated output back to Supabase
        if (ideaId) {
            await supabase.from('generated_content').insert([
                { idea_id: ideaId, user_id: user.id, content_type: 'linkedin', content: linkedinText },
                { idea_id: ideaId, user_id: user.id, content_type: 'twitter', content: twitterText },
            ]);
        }

        // 4. Render result cards
        if (emptyState) emptyState.style.display = 'none';
        feedList.prepend(_buildLinkedInCard(linkedinText));
        feedList.prepend(_buildTwitterCard(twitterText));

    } catch (err) {
        console.error('Error generating content:', err);
        alert('AI Generation Error: ' + (err.message || 'Check your API Key and Model.'));
    }

    // --- Reset UI ---
    generateBtn.classList.remove('is-loading');
    generateBtn.querySelector('span').textContent = '✨ Make Magic';
    inputEl.value = '';
    inputEl.disabled = false;
    inputEl.focus();
}

// ---- Private card builder helpers ----

function _buildTwitterCard(twitterText) {
    const tweets = twitterText.split('\n\n').filter((t) => t.trim().length > 0 && !t.startsWith('---'));
    const twitterHtml = tweets
        .map((t) => {
            const clean = t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim();
            return `<div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--glass-border); line-height: 1.5; font-size: 0.95rem;">${clean.replace(/\n/g, '<br/>')}</div>`;
        })
        .join('');

    const copyableText = tweets
        .map((t) => t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim())
        .join('\n\n');

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
    <div class="card-tag twitter">Twitter Thread</div>
    <div class="card-title">Generated Thread</div>
    <div class="card-content" style="display: flex; flex-direction: column; gap: 4px;">${twitterHtml}</div>
    <div class="card-actions">
      <button class="copy-btn copy-twitter">Copy Full Thread</button>
      <button class="copy-btn export-md" style="background: var(--glass-bg); color: var(--accent-1); border-color: var(--accent-1);">Export as Markdown</button>
    </div>
  `;

    card.querySelector('.copy-twitter').addEventListener('click', (e) => {
        const btn = e.target;
        navigator.clipboard.writeText(copyableText);
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-2)';
        setTimeout(() => { btn.textContent = 'Copy Full Thread'; btn.style.color = ''; }, 2000);
    });

    card.querySelector('.export-md').addEventListener('click', () => {
        const blob = new Blob([copyableText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: `Synapse_Draft_${new Date().toISOString().split('T')[0]}.txt`, style: 'display:none' });
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    return card;
}

function _buildLinkedInCard(linkedinText) {
    const formatted = linkedinText.replace(/\n/g, '<br/>');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
    <div class="card-tag linkedin">LinkedIn Post</div>
    <div class="card-title">Generated Post</div>
    <div class="card-content" style="line-height: 1.6; font-size: 0.95rem;"><p>${formatted}</p></div>
    <div class="card-actions">
      <button class="copy-btn copy-linkedin">Copy to Clipboard</button>
    </div>
  `;

    card.querySelector('.copy-linkedin').addEventListener('click', (e) => {
        const btn = e.target;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formatted;
        navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText);
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-2)';
        setTimeout(() => { btn.textContent = 'Copy to Clipboard'; btn.style.color = ''; }, 2000);
    });

    return card;
}
