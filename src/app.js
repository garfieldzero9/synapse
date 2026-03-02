import './style.css';
import './app.css';
import { supabase } from './supabaseClient';
import OpenAI from 'openai';

// Dashboard Logic 
document.addEventListener('DOMContentLoaded', async () => {
  // Check Auth
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/';
    return;
  }

  const user = session.user;

  // Setup UI with Auth Data
  const avatarEl = document.querySelector('.avatar');
  const profileTextEl = document.querySelector('.user-profile div:last-child');

  if (user.email) {
    avatarEl.textContent = user.email.charAt(0).toUpperCase();
    profileTextEl.textContent = user.email.split('@')[0];
  }

  // Add Sign Out Button
  const sidebar = document.querySelector('.sidebar');
  const signOutBtn = document.createElement('a');
  signOutBtn.href = "#";
  signOutBtn.className = "nav-item";
  signOutBtn.id = "signOutBtn";
  signOutBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      Sign Out
    `;
  sidebar.insertBefore(signOutBtn, document.querySelector('.user-profile'));

  signOutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  // UI Elements
  const navHomeBtn = document.getElementById('navHomeBtn');
  const navNewDraftBtn = document.getElementById('navNewDraftBtn');
  const navLibraryBtn = document.getElementById('navLibraryBtn');
  const navVoiceLabBtn = document.getElementById('navVoiceLabBtn');
  const navSettingsBtn = document.getElementById('navSettingsBtn');
  const homeSection = document.getElementById('homeSection');
  const librarySection = document.getElementById('librarySection');
  const draftsSection = document.getElementById('draftsSection');
  const voiceLabSection = document.getElementById('voiceLabSection');
  const settingsSection = document.getElementById('settingsSection');
  const settingsModal = document.getElementById('settingsModal');

  // Settings UI Elements
  const settingsApiKey = document.getElementById('settingsApiKey');
  const settingsModel = document.getElementById('settingsModel');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const settingsSaveStatus = document.getElementById('settingsSaveStatus');

  // Voice Lab UI Elements
  const voiceLabInput = document.getElementById('voiceLabInput');
  const analyzeVoiceBtn = document.getElementById('analyzeVoiceBtn');
  const voiceProfileResult = document.getElementById('voiceProfileResult');
  const systemPromptEditor = document.getElementById('systemPromptEditor');
  const voiceProfileName = document.getElementById('voiceProfileName');
  const voiceProfileDefault = document.getElementById('voiceProfileDefault');
  const saveVoiceProfileBtn = document.getElementById('saveVoiceProfileBtn');
  const voiceProfilesList = document.getElementById('voiceProfilesList');
  const activeVoiceProfileDropdown = document.getElementById('activeVoiceProfile');

  // Load Settings from LocalStorage
  const apiKey = localStorage.getItem('synapse_api_key') || '';
  const model = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';

  if (settingsApiKey) settingsApiKey.value = apiKey;
  if (settingsModel) settingsModel.value = model;

  // Set Profile Email in Settings
  document.getElementById('settingsEmailView').textContent = user.email || 'No email';

  document.getElementById('settingsLogoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      localStorage.setItem('synapse_api_key', settingsApiKey.value.trim());
      localStorage.setItem('synapse_model', settingsModel.value);
      settingsSaveStatus.style.opacity = '1';
      setTimeout(() => { settingsSaveStatus.style.opacity = '0'; }, 2000);

      // Try to reload models if key was updated
      if (settingsApiKey.value.trim().length > 0) {
        loadAvailableModels();
      }
    });
  }

  // Models Logic
  const loadAvailableModels = async () => {
    if (!settingsModel) return;
    const apiKey = localStorage.getItem('synapse_api_key') || '';
    if (!apiKey) return;

    const savedModel = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';

    try {
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          "HTTP-Referer": window.location.href, // Optional, for including your app on openrouter.ai rankings.
          "X-Title": "Synapse SaaS", // Optional. Shows in rankings on openrouter.ai.
        }
      });

      const response = await openai.models.list();

      // OpenRouter returns models directly in response.data
      const models = response.data;

      if (models && models.length > 0) {
        settingsModel.innerHTML = '';
        models.forEach(m => {
          const option = document.createElement('option');
          option.value = m.id;
          option.textContent = m.name || m.id; // use name if available

          if (m.id === savedModel) {
            option.selected = true;
          }
          settingsModel.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error fetching models via OpenAI SDK:', err);
    }
  };

  // If key exists, immediately try to load models
  loadAvailableModels();

  // Drafts Logic
  const loadDrafts = async () => {
    const draftsList = document.getElementById('draftsList');
    const draftsEmptyState = document.getElementById('draftsEmptyState');

    draftsList.innerHTML = '';
    if (draftsEmptyState) {
      draftsList.appendChild(draftsEmptyState);
      draftsEmptyState.style.display = 'block';
    }

    try {
      // Fetch ideas that DO NOT have associated generated content
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          id,
          raw_text,
          created_at,
          generated_content!left ( id )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (draftsEmptyState) draftsEmptyState.style.display = 'none';

      // Manually filter out ideas that DO have generated content
      const savedDrafts = data.filter(idea => idea.generated_content.length === 0);

      if (!savedDrafts || savedDrafts.length === 0) {
        draftsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-style: italic;">You have no saved drafts.</div>`;
        return;
      }

      savedDrafts.forEach(draft => {
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

        // Copy functionality
        cardEl.querySelector('.copy-draft-btn').addEventListener('click', (e) => {
          const btn = e.target;
          navigator.clipboard.writeText(draft.raw_text);
          btn.textContent = 'Copied!';
          btn.style.color = 'var(--accent-2)';
          setTimeout(() => { btn.textContent = 'Copy Text'; btn.style.color = ''; }, 2000);
        });

        // Load into editor functionality
        cardEl.querySelector('.load-draft-btn').addEventListener('click', (e) => {
          const text = decodeURIComponent(e.target.dataset.text);
          switchView('home');
          inputEl.value = text;
          inputEl.style.height = 'auto'; // Force reflow
          setTimeout(() => {
            inputEl.style.height = (inputEl.scrollHeight) + 'px';
            inputEl.focus();
          }, 50);
        });

        draftsList.appendChild(cardEl);
      });

    } catch (err) {
      console.error('Error loading drafts:', err);
      draftsList.innerHTML = `<div style="color: #ef4444;text-align: center;">Error loading drafts.</div>`;
    }
  };

  // Library Logic
  const loadLibrary = async () => {
    const libraryList = document.getElementById('libraryList');
    const libraryEmptyState = document.getElementById('libraryEmptyState');

    // Show loading state
    libraryList.innerHTML = '';
    if (libraryEmptyState) {
      libraryList.appendChild(libraryEmptyState);
      libraryEmptyState.style.display = 'block';
    }

    try {
      const { data, error } = await supabase
        .from('generated_content')
        .select(`
          id,
          content_type,
          content,
          created_at,
          ideas ( raw_text )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (libraryEmptyState) libraryEmptyState.style.display = 'none';

      if (!data || data.length === 0) {
        libraryList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-style: italic;">Your library is empty.</div>`;
        return;
      }

      data.forEach(item => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.style.animation = 'none'; // Disable drop-in animation for list views

        const formattedText = item.content.replace(/\n/g, '<br/>');
        const originalIdea = item.ideas ? item.ideas.raw_text : "Unknown Input";
        const dateStr = new Date(item.created_at).toLocaleDateString();

        if (item.content_type === 'twitter') {
          const tweets = item.content.split('\n\n').filter(t => t.trim().length > 0 && !t.startsWith('---'));
          const twitterHtml = tweets.map((t) => {
            let cleanTweet = t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim();
            return `<div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--glass-border); line-height: 1.5; font-size: 0.95rem;">${cleanTweet.replace(/\n/g, '<br/>')}</div>`;
          }).join('');

          cardEl.innerHTML = `
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Based on: "${originalIdea.substring(0, 60)}..." • ${dateStr}</div>
              <div class="card-tag twitter">Twitter Thread</div>
              <div class="card-title">Archived Thread</div>
              <div class="card-content" style="display: flex; flex-direction: column; gap: 4px;">
                ${twitterHtml}
              </div>
            `;
        } else {
          cardEl.innerHTML = `
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Based on: "${originalIdea.substring(0, 60)}..." • ${dateStr}</div>
              <div class="card-tag linkedin">LinkedIn Post</div>
              <div class="card-title">Archived Post</div>
              <div class="card-content" style="line-height: 1.6; font-size: 0.95rem;">
                <p>${formattedText}</p>
              </div>
            `;
        }
        libraryList.appendChild(cardEl);
      });

    } catch (err) {
      console.error('Error loading library:', err);
      libraryList.innerHTML = `<div style="color: #ef4444;text-align: center;">Error loading library data.</div>`;
    }
  };

  // Voice Profiles Logic
  const loadVoiceProfilesForDropdown = async () => {
    if (!activeVoiceProfileDropdown) return;
    try {
      const { data, error } = await supabase
        .from('voice_profiles')
        .select('id, name, is_default')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;

      activeVoiceProfileDropdown.innerHTML = '<option value="">Default AI Voice (No Profile)</option>';

      if (data) {
        data.forEach(profile => {
          const option = document.createElement('option');
          option.value = profile.id;
          option.textContent = profile.name + (profile.is_default ? ' (Default)' : '');
          if (profile.is_default) option.selected = true;
          activeVoiceProfileDropdown.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error loading voice profiles for dropdown:', err);
    }
  };

  const loadVoiceProfiles = async () => {
    if (!voiceProfilesList) return;
    const voiceProfilesEmptyState = document.getElementById('voiceProfilesEmptyState');

    voiceProfilesList.innerHTML = '';
    if (voiceProfilesEmptyState) {
      voiceProfilesList.appendChild(voiceProfilesEmptyState);
      voiceProfilesEmptyState.style.display = 'block';
    }

    try {
      const { data, error } = await supabase
        .from('voice_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (voiceProfilesEmptyState) voiceProfilesEmptyState.style.display = 'none';

      if (!data || data.length === 0) {
        voiceProfilesList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 0; font-style: italic;">No custom voices saved yet. Generate one above!</div>`;
        return;
      }

      data.forEach(profile => {
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

        cardEl.querySelector('.delete-profile-btn').addEventListener('click', async (e) => {
          if (confirm('Delete this voice profile?')) {
            await supabase.from('voice_profiles').delete().eq('id', profile.id);
            loadVoiceProfiles();
          }
        });

        voiceProfilesList.appendChild(cardEl);
      });
    } catch (err) {
      console.error('Error loading voice profiles:', err);
      voiceProfilesList.innerHTML = `<div style="color: #ef4444;text-align: center;">Error loading profiles.</div>`;
    }
  };

  // View Switching Logic
  const switchView = (view) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (view === 'home') {
      navHomeBtn.classList.add('active');
      homeSection.style.display = 'block';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'none';
      voiceLabSection.style.display = 'none';
      settingsSection.style.display = 'none';
      loadVoiceProfilesForDropdown();
      setTimeout(() => document.getElementById('brainDumpInput').focus(), 100);
    } else if (view === 'library') {
      navLibraryBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'block';
      draftsSection.style.display = 'none';
      voiceLabSection.style.display = 'none';
      settingsSection.style.display = 'none';
      loadLibrary();
    } else if (view === 'drafts') {
      navNewDraftBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'block';
      voiceLabSection.style.display = 'none';
      settingsSection.style.display = 'none';
      loadDrafts();
    } else if (view === 'voicelab') {
      navVoiceLabBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'none';
      voiceLabSection.style.display = 'block';
      settingsSection.style.display = 'none';
      loadVoiceProfiles();
    } else if (view === 'settings') {
      navSettingsBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'none';
      voiceLabSection.style.display = 'none';
      settingsSection.style.display = 'block';
    }
  };

  navHomeBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
  navLibraryBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('library'); });
  navNewDraftBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('drafts'); });
  navVoiceLabBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('voicelab'); });
  navSettingsBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('settings'); });

  const inputEl = document.getElementById('brainDumpInput');
  const generateBtn = document.getElementById('generateBtn');
  const feedList = document.getElementById('feedList');
  const emptyState = document.getElementById('emptyState');

  // Clear Workspace Logic (formerly New Draft)
  // We can add a simple "Clear" button somewhere if needed, but for now
  // 'New Draft' in sidebar opens the saved drafts view.

  let isGenerating = false;

  const handleGenerate = async () => {
    const text = inputEl.value.trim();
    if (!text || isGenerating) return;

    // Start Generation UI Mode
    isGenerating = true;
    generateBtn.classList.add('is-loading');
    generateBtn.querySelector('span').textContent = 'Processing...';
    inputEl.disabled = true;

    // 1. Save Raw Idea to Supabase Database
    let ideaId = null;
    try {
      const { data, error } = await supabase
        .from('ideas')
        .insert([{ user_id: user.id, raw_text: text }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) ideaId = data[0].id;
    } catch (err) {
      console.error("Error saving idea:", err);
      // In a real app we'd show an error toast here
    }

    // 2. Fetch Selected Profile and Call LLM directly (BYOK)
    try {
      const apiKey = localStorage.getItem('synapse_api_key');
      let model = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';
      // Base prompt ensures we get json shapes we need
      let systemPrompt = 'You are an expert social media ghostwriter. You must transform the user\'s raw thought into two formats:\n1. A professional, engaging LinkedIn post.\n2. A concise, punchy Twitter thread.\nReturn a JSON object with two keys: "linkedin" and "twitter". The values should be the raw text strings. DO NOT wrap the output with json codeblocks.';

      if (!apiKey) {
        alert("Please set your API key in Settings first.");
        switchView('settings');
        throw new Error('No API Key');
      }

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

      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          "HTTP-Referer": window.location.href,
          "X-Title": "Synapse SaaS"
        }
      });

      const response = await openai.chat.completions.create({
        model: model,
        response_format: { type: "json_object" }, // Ensures JSON output if supported by model (like GPT-4o)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      });

      let contentStr = response.choices[0].message.content;

      // Try to extract JSON string from conversational filler
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        contentStr = jsonMatch[0];
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(contentStr);
      } catch (e) {
        console.error('Failed to parse JSON, falling back to raw:', contentStr);
        parsedContent = { linkedin: contentStr, twitter: "Failed to distinguish Twitter thread. See LinkedIn output." };
      }

      let linkedinText = parsedContent.linkedin || "No LinkedIn content generated.";
      let twitterText = parsedContent.twitter || "No Twitter content generated.";

      // Handle cases where the LLM decides to return an array of tweets instead of a single string
      if (Array.isArray(linkedinText)) linkedinText = linkedinText.join('\n\n');
      if (typeof linkedinText !== 'string') linkedinText = JSON.stringify(linkedinText);

      if (Array.isArray(twitterText)) twitterText = twitterText.join('\n\n');
      if (typeof twitterText !== 'string') twitterText = JSON.stringify(twitterText);

      // 3. Save purely generated output back to Supabase DB
      if (ideaId) {
        await supabase.from('generated_content').insert([
          { idea_id: ideaId, user_id: user.id, content_type: 'linkedin', content: linkedinText },
          { idea_id: ideaId, user_id: user.id, content_type: 'twitter', content: twitterText }
        ]);
      }

      // 4. Create Result Cards

      // ---- TWITTER THREAD CARD ----
      const twitterCardEl = document.createElement('div');
      twitterCardEl.className = 'card';

      // Split tweets and format them distinctly
      const tweets = twitterText.split('\n\n').filter(t => t.trim().length > 0 && !t.startsWith('---'));
      const twitterHtml = tweets.map((t) => {
        // Remove pesky labels just in case AI still adds them
        let cleanTweet = t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim();
        return `<div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--glass-border); line-height: 1.5; font-size: 0.95rem;">${cleanTweet.replace(/\n/g, '<br/>')}</div>`;
      }).join('');

      const copyableTwitterText = tweets.map(t => t.replace(/^(Post \d+:|Thread Title:|Tweet \d+:|\d+\/)/i, '').trim()).join('\n\n');

      twitterCardEl.innerHTML = `
        <div class="card-tag twitter">Twitter Thread</div>
        <div class="card-title">Generated Thread</div>
        <div class="card-content" style="display: flex; flex-direction: column; gap: 4px;">
          ${twitterHtml}
        </div>
        <div class="card-actions">
          <button class="copy-btn">Copy Full Thread</button>
          <button class="copy-btn" style="background: var(--glass-bg); color: var(--accent-1); border-color: var(--accent-1);">Export to Buffer</button>
        </div>
      `;

      // Copy logic for Twitter
      twitterCardEl.querySelector('.copy-btn').addEventListener('click', (e) => {
        const btn = e.target;
        const originalText = btn.textContent;
        navigator.clipboard.writeText(copyableTwitterText);
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-2)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      });

      // Export to Markdown logic
      const exportBtn = twitterCardEl.querySelectorAll('.copy-btn')[1];
      if (exportBtn) {
        exportBtn.textContent = 'Export as Markdown';
        exportBtn.addEventListener('click', () => {
          const blob = new Blob([copyableTwitterText], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `Synapse_Draft_${new Date().toISOString().split('T')[0]}.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      }

      // ---- LINKEDIN CARD ----
      const linkedinCardEl = document.createElement('div');
      linkedinCardEl.className = 'card';
      const formattedLinkedin = linkedinText.replace(/\n/g, '<br/>');

      linkedinCardEl.innerHTML = `
        <div class="card-tag linkedin">LinkedIn Post</div>
        <div class="card-title">Generated Post</div>
        <div class="card-content" style="line-height: 1.6; font-size: 0.95rem;">
          <p>${formattedLinkedin}</p>
        </div>
        <div class="card-actions">
          <button class="copy-btn">Copy to Clipboard</button>
        </div>
      `;

      // Copy logic for LinkedIn
      linkedinCardEl.querySelector('.copy-btn').addEventListener('click', (e) => {
        const btn = e.target;
        const originalText = btn.textContent;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedLinkedin;
        navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText);
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-2)';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
        }, 2000);
      });

      // Render in feed (Prepend both so they appear at the top)
      if (emptyState) emptyState.style.display = 'none';
      feedList.prepend(twitterCardEl);
      feedList.prepend(linkedinCardEl);

    } catch (err) {
      console.error("Error generating content:", err);
      alert("AI Generation Error: " + (err.message || 'Check your API Key and Model logic.'));
    }

    // Reset UI
    isGenerating = false;
    generateBtn.classList.remove('is-loading');
    generateBtn.querySelector('span').textContent = '✨ Make Magic';
    inputEl.value = '';
    inputEl.disabled = false;
    inputEl.focus();
  };

  // Event Listeners
  generateBtn.addEventListener('click', handleGenerate);

  const saveDraftBtn = document.getElementById('saveDraftBtn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) {
        alert("Your second brain is empty. Type something first!");
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
        saveDraftBtn.style.borderColor = 'var(--accent-2)';

        // Also clear the UI feed since we technically saved a new thought
        inputEl.value = '';
        inputEl.style.height = 'auto';
        feedList.querySelectorAll('.card').forEach(c => c.remove());
        if (emptyState) emptyState.style.display = 'block';

      } catch (err) {
        console.error("Error saving draft:", err);
        alert("Failed to save draft to cloud.");
        saveDraftBtn.textContent = 'Save Text';
      } finally {
        setTimeout(() => {
          saveDraftBtn.textContent = 'Save Text';
          saveDraftBtn.style.opacity = '1';
          saveDraftBtn.disabled = false;
          saveDraftBtn.style.color = '';
          saveDraftBtn.style.borderColor = '';
        }, 2000);
      }
    });
  }

  inputEl.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  // Voice Lab Interaction Logic
  if (analyzeVoiceBtn) {
    analyzeVoiceBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const text = voiceLabInput.value.trim();
      if (!text) return alert("Please paste 3-5 examples of your past content.");

      const apiKey = localStorage.getItem('synapse_api_key');
      const model = localStorage.getItem('synapse_model') || 'anthropic/claude-3.5-sonnet';

      if (!apiKey) {
        switchView('settings');
        return alert("Please enter your API Key in Settings first.");
      }

      analyzeVoiceBtn.classList.add('is-loading');
      analyzeVoiceBtn.querySelector('span').textContent = 'Analyzing...';

      try {
        const openai = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: apiKey,
          dangerouslyAllowBrowser: true,
          defaultHeaders: {
            "HTTP-Referer": window.location.href,
            "X-Title": "Synapse SaaS"
          }
        });

        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert ghostwriter and linguist. Analyze the user\'s past social media and blog content. Dissect their tone, vocabulary, pacing, sentence structure, formatting (like emojis, bullet types), and emotional cadence. Then, write a very strict, algorithmic "System Prompt" (under 500 words) that another AI can use to replicate this exact voice. DO NOT output conversational filler; ONLY output the final System Prompt.'
            },
            {
              role: 'user',
              content: 'Here are my content examples to analyze:\n\n' + text
            }
          ]
        });

        const generatedPrompt = completion.choices[0].message.content;

        document.getElementById('voiceProfileResult').style.display = 'block';
        systemPromptEditor.value = generatedPrompt;

      } catch (err) {
        console.error("Voice Analysis Error:", err);
        alert("Error analyzing voice: " + err.message);
      } finally {
        analyzeVoiceBtn.classList.remove('is-loading');
        analyzeVoiceBtn.querySelector('span').textContent = '🧠 Analyze Voice';
      }
    });
  }

  if (saveVoiceProfileBtn) {
    saveVoiceProfileBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = voiceProfileName.value.trim();
      const prompt = systemPromptEditor.value.trim();
      const isDefault = voiceProfileDefault.checked;
      const model = localStorage.getItem('synapse_model') || 'openai/gpt-4o';

      if (!name || !prompt) return alert("Please provide a name and ensure a prompt is generated.");

      saveVoiceProfileBtn.textContent = 'Saving...';
      saveVoiceProfileBtn.disabled = true;

      try {
        // If this one is set as default, we should probably unset others, 
        // but for simplicity we rely on the DB's latest one or just order by is_default.
        // A real app would run an update query to clear old defaults.
        if (isDefault) {
          await supabase.from('voice_profiles').update({ is_default: false }).eq('user_id', user.id);
        }

        const { error } = await supabase
          .from('voice_profiles')
          .insert([{
            user_id: user.id,
            name: name,
            system_prompt: prompt,
            model: model,
            is_default: isDefault
          }]);

        if (error) throw error;

        alert("Voice Profile Saved!");
        document.getElementById('voiceProfileResult').style.display = 'none';
        voiceLabInput.value = '';
        voiceProfileName.value = '';

        loadVoiceProfiles(); // Refresh the list
        loadVoiceProfilesForDropdown(); // Refresh home dropdown

      } catch (err) {
        console.error("Save Profile Error:", err);
        alert("Failed to save profile.");
      } finally {
        saveVoiceProfileBtn.textContent = 'Save Profile';
        saveVoiceProfileBtn.disabled = false;
      }
    });
  }

});
