import './style.css';
import './app.css';
import { supabase } from './supabaseClient';

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
  const navSettingsBtn = document.getElementById('navSettingsBtn');
  const homeSection = document.getElementById('homeSection');
  const librarySection = document.getElementById('librarySection');
  const settingsModal = document.getElementById('settingsModal');

  // Set Profile Email in Settings
  document.getElementById('settingsEmailView').textContent = user.email || 'No email';

  document.getElementById('settingsLogoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  });

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

  // View Switching Logic
  const draftsSection = document.getElementById('draftsSection');
  const settingsSection = document.getElementById('settingsSection');
  const switchView = (view) => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (view === 'home') {
      navHomeBtn.classList.add('active');
      homeSection.style.display = 'block';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'none';
      settingsSection.style.display = 'none';
      setTimeout(() => document.getElementById('brainDumpInput').focus(), 100);
    } else if (view === 'library') {
      navLibraryBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'block';
      draftsSection.style.display = 'none';
      settingsSection.style.display = 'none';
      loadLibrary();
    } else if (view === 'drafts') {
      navNewDraftBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'block';
      settingsSection.style.display = 'none';
      loadDrafts();
    } else if (view === 'settings') {
      navSettingsBtn.classList.add('active');
      homeSection.style.display = 'none';
      librarySection.style.display = 'none';
      draftsSection.style.display = 'none';
      settingsSection.style.display = 'block';
    }
  };

  navHomeBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
  navLibraryBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('library'); });
  navNewDraftBtn.addEventListener('click', (e) => { e.preventDefault(); switchView('drafts'); });
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

    // 2. Call Supabase Edge Function to Process AI
    try {
      const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('generate-content', {
        body: {
          rawText: text,
          ideaId,
          openRouterKey: openRouterKey
        }
      });

      if (edgeError) throw edgeError;

      const linkedinText = edgeData?.linkedin || "No LinkedIn content generated.";
      const twitterText = edgeData?.twitter || "No Twitter content generated.";

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
      alert("Oops! Something went wrong with the AI generation. Ensure the edge function is deployed and keys are set.");
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
});
