import { supabase } from '../lib/supabaseClient.js';
import { createOpenAIClient } from '../lib/openaiClient.js';
import { loadVoiceProfiles, loadVoiceProfilesForDropdown } from './voiceProfiles.js';

/**
 * Initializes Voice Lab: binds the "Analyze Voice" and "Save Profile" buttons.
 * @param {object} user - Supabase user.
 */
export function initVoiceLab(user) {
    const analyzeVoiceBtn = document.getElementById('analyzeVoiceBtn');
    const saveVoiceProfileBtn = document.getElementById('saveVoiceProfileBtn');
    const voiceLabInput = document.getElementById('voiceLabInput');
    const systemPromptEditor = document.getElementById('systemPromptEditor');
    const voiceProfileName = document.getElementById('voiceProfileName');
    const voiceProfileDefault = document.getElementById('voiceProfileDefault');

    // ---- Analyze Voice ----
    if (analyzeVoiceBtn) {
        analyzeVoiceBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const text = voiceLabInput ? voiceLabInput.value.trim() : '';
            if (!text) return alert('Please paste 3-5 examples of your past content.');

            const apiKey = localStorage.getItem('synapse_api_key');
            const model = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';

            if (!apiKey) {
                alert('Please enter your API Key in Settings first.');
                return;
            }

            analyzeVoiceBtn.classList.add('is-loading');
            analyzeVoiceBtn.querySelector('span').textContent = 'Analyzing...';

            try {
                const openai = createOpenAIClient(apiKey);
                const completion = await openai.chat.completions.create({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert ghostwriter and linguist. Analyze the user\'s past social media and blog content. Dissect their tone, vocabulary, pacing, sentence structure, formatting (like emojis, bullet types), and emotional cadence. Then, write a very strict, algorithmic "System Prompt" (under 500 words) that another AI can use to replicate this exact voice. DO NOT output conversational filler; ONLY output the final System Prompt.',
                        },
                        {
                            role: 'user',
                            content: 'Here are my content examples to analyze:\n\n' + text,
                        },
                    ],
                });

                const generatedPrompt = completion.choices[0].message.content;

                const resultEl = document.getElementById('voiceProfileResult');
                if (resultEl) resultEl.style.display = 'block';
                if (systemPromptEditor) systemPromptEditor.value = generatedPrompt;

            } catch (err) {
                console.error('Voice Analysis Error:', err);
                alert('Error analyzing voice: ' + err.message);
            } finally {
                analyzeVoiceBtn.classList.remove('is-loading');
                analyzeVoiceBtn.querySelector('span').textContent = '🧠 Analyze Voice';
            }
        });
    }

    // ---- Save Voice Profile ----
    if (saveVoiceProfileBtn) {
        saveVoiceProfileBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const name = voiceProfileName ? voiceProfileName.value.trim() : '';
            const prompt = systemPromptEditor ? systemPromptEditor.value.trim() : '';
            const isDefault = voiceProfileDefault ? voiceProfileDefault.checked : false;
            const model = localStorage.getItem('synapse_model') || 'openai/gpt-4o';

            if (!name || !prompt) return alert('Please provide a name and ensure a prompt is generated.');

            saveVoiceProfileBtn.textContent = 'Saving...';
            saveVoiceProfileBtn.disabled = true;

            try {
                if (isDefault) {
                    await supabase.from('voice_profiles').update({ is_default: false }).eq('user_id', user.id);
                }

                const { error } = await supabase.from('voice_profiles').insert([{
                    user_id: user.id,
                    name,
                    system_prompt: prompt,
                    model,
                    is_default: isDefault,
                }]);

                if (error) throw error;

                alert('Voice Profile Saved!');

                const resultEl = document.getElementById('voiceProfileResult');
                if (resultEl) resultEl.style.display = 'none';
                if (voiceLabInput) voiceLabInput.value = '';
                if (voiceProfileName) voiceProfileName.value = '';

                loadVoiceProfiles(user);
                loadVoiceProfilesForDropdown(user);
            } catch (err) {
                console.error('Save Profile Error:', err);
                alert('Failed to save profile.');
            } finally {
                saveVoiceProfileBtn.textContent = 'Save Profile';
                saveVoiceProfileBtn.disabled = false;
            }
        });
    }
}
