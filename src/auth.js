import { supabase } from './supabaseClient';
import './auth.css';

document.addEventListener('DOMContentLoaded', () => {
    // Modal Elements
    const authModal = document.getElementById('authModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Triggers
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navSignupBtn = document.getElementById('navSignupBtn');
    const heroSignupBtn = document.getElementById('heroSignupBtn');

    // Form Elements
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const submitAuthBtn = document.getElementById('submitAuthBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authMsg = document.getElementById('authMsg');

    // Switch
    const switchAuthBtn = document.getElementById('switchAuthBtn');
    const switchAuthModeText = document.getElementById('switchAuthModeText');

    let isLoginMode = true;

    // --- Check if user is already logged in ---
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.location.href = '/app.html';
        }
    };
    checkSession();

    // --- UI Functions ---
    const openModal = (e, mode = 'login') => {
        e?.preventDefault(); // Handle if called from anchor click
        isLoginMode = mode === 'login';
        updateModalUI();
        authModal.classList.add('active');
    };

    const closeModal = () => {
        authModal.classList.remove('active');
        authForm.reset();
        authMsg.textContent = '';
    };

    const updateModalUI = () => {
        authMsg.textContent = '';
        authMsg.className = 'auth-msg';

        if (isLoginMode) {
            authTitle.textContent = 'Welcome Back';
            authSubtitle.textContent = 'Log in to your continuous brain dump.';
            submitAuthBtn.textContent = 'Log in';
            switchAuthModeText.innerHTML = `Don't have an account? <span id="switchAuthBtn">Sign up</span>`;
        } else {
            authTitle.textContent = 'Create an Account';
            authSubtitle.textContent = 'Start capturing right now (its free).';
            submitAuthBtn.textContent = 'Sign up';
            switchAuthModeText.innerHTML = `Already have an account? <span id="switchAuthBtn">Log in</span>`;
        }

        // Reattach span event listener after replacing innerHTML
        document.getElementById('switchAuthBtn').addEventListener('click', () => {
            isLoginMode = !isLoginMode;
            updateModalUI();
        });
    };

    // --- Event Listeners ---
    navLoginBtn?.addEventListener('click', (e) => openModal(e, 'login'));
    navSignupBtn?.addEventListener('click', (e) => openModal(e, 'signup'));
    heroSignupBtn?.addEventListener('click', (e) => openModal(e, 'signup'));

    closeModalBtn?.addEventListener('click', closeModal);

    // Close on outside click
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal();
    });

    // --- Auth Submission Logic ---
    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitAuthBtn.disabled = true;
        submitAuthBtn.textContent = 'Processing...';
        authMsg.textContent = '';
        authMsg.className = 'auth-msg';

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            if (isLoginMode) {
                // Log in
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = '/app.html';
            } else {
                // Sign up
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;

                authMsg.textContent = 'Check your email to confirm your account! (Or log in if email confirmation is disabled)';
                authMsg.className = 'auth-msg success';

                // If email confirmation is off, data.user will be returned without error and session might be strictly null if require email is true, or session might exist.
                if (data.session) {
                    setTimeout(() => { window.location.href = '/app.html'; }, 1000);
                }
            }
        } catch (error) {
            authMsg.textContent = error.message;
        } finally {
            submitAuthBtn.disabled = false;
            submitAuthBtn.textContent = isLoginMode ? 'Log in' : 'Sign up';
        }
    });

});
