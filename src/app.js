/**
 * app.js — Dashboard Orchestrator
 *
 * Single entry point for the Synapse dashboard (app.html).
 * Views are dynamically loaded from src/views/ before any module runs.
 * All feature logic lives in src/modules/.
 */
import './styles/style.css';
import './styles/app.css';

import { loadAllViews } from './modules/viewLoader.js';
import { initAuth } from './modules/session.js';
import { initNavigation } from './modules/navigation.js';
import { initSettings } from './modules/settings.js';
import { initSaveDraft } from './modules/drafts.js';
import { initVoiceLab } from './modules/voiceLab.js';
import { handleGenerate } from './modules/generation.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate — redirect to '/' if no active session
  const user = await initAuth();
  if (!user) return;

  // 2. Fetch all view HTML partials and inject into #views-container
  await loadAllViews();

  // 3. Core DOM references (available only after views are injected)
  const inputEl = document.getElementById('brainDumpInput');
  const generateBtn = document.getElementById('generateBtn');
  const feedList = document.getElementById('feedList');
  const emptyState = document.getElementById('emptyState');

  // 4. Navigation — switchView returned so any module can call it
  const switchView = initNavigation(user, inputEl);

  // 5. Settings (API key, model selector, logout)
  initSettings(user);

  // 6. Save Draft button
  initSaveDraft(user, inputEl);

  // 7. Voice Lab (analyze + save profile)
  initVoiceLab(user);

  // 8. Make Magic — generation flow
  let isGenerating = false;
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      if (isGenerating) return;
      isGenerating = true;
      await handleGenerate(user, inputEl, generateBtn, feedList, emptyState, switchView);
      isGenerating = false;
    });
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter to generate
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isGenerating) {
          isGenerating = true;
          handleGenerate(user, inputEl, generateBtn, feedList, emptyState, switchView)
            .finally(() => { isGenerating = false; });
        }
      }
    });

    // Auto-resize the textarea
    inputEl.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }
});
