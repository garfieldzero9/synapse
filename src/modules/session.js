import { supabase } from '../lib/supabaseClient.js';

/**
 * Sets up authentication guard, user avatar/profile text, and the sidebar sign-out button.
 * @returns {Promise<object|null>} The Supabase user object, or null if not authenticated.
 */
export async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = '/';
        return null;
    }

    const user = session.user;

    // Update avatar and profile text with the logged-in user's email
    const avatarEl = document.querySelector('.avatar');
    const profileTextEl = document.querySelector('.user-profile div:last-child');
    if (user.email) {
        if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
        if (profileTextEl) profileTextEl.textContent = user.email.split('@')[0];
    }

    // Inject a "Sign Out" nav item into the sidebar (above user profile section)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        const signOutBtn = document.createElement('a');
        signOutBtn.href = '#';
        signOutBtn.className = 'nav-item';
        signOutBtn.id = 'signOutBtn';
        signOutBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      Sign Out
    `;
        const userProfile = sidebar.querySelector('.user-profile');
        if (userProfile) sidebar.insertBefore(signOutBtn, userProfile);

        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = '/';
        });
    }

    return user;
}
