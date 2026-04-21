/* ============================================
   TASKFLOW — Authentication
   ============================================ */

const Auth = {
  init() {
    this.loginForm = document.getElementById('login-form');
    this.signupForm = document.getElementById('signup-form');
    this.loginTab = document.getElementById('login-tab');
    this.signupTab = document.getElementById('signup-tab');

    if (!this.loginForm) return; // Not on auth page

    // If already logged in, redirect
    if (Store.getCurrentUser()) {
      window.location.href = 'app.html';
      return;
    }

    this.bindEvents();
  },

  bindEvents() {
    // Tab switching
    this.loginTab.addEventListener('click', () => this.switchTab('login'));
    this.signupTab.addEventListener('click', () => this.switchTab('signup'));

    // Login form
    this.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Signup form
    this.signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignup();
    });
  },

  switchTab(tab) {
    if (tab === 'login') {
      this.loginTab.classList.add('active');
      this.signupTab.classList.remove('active');
      this.loginForm.classList.add('active');
      this.signupForm.classList.remove('active');
    } else {
      this.signupTab.classList.add('active');
      this.loginTab.classList.remove('active');
      this.signupForm.classList.add('active');
      this.loginForm.classList.remove('active');
    }
  },

  handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      Utils.showToast('Please fill in all fields', 'warning');
      return;
    }

    const user = Store.getUserByEmail(email);
    if (!user) {
      Utils.showToast('No account found with this email', 'error');
      return;
    }

    if (atob(user.password) !== password) {
      Utils.showToast('Incorrect password', 'error');
      return;
    }

    Store.setSession(user.id);
    Utils.showToast('Welcome back, ' + user.name + '!', 'success');

    setTimeout(() => {
      window.location.href = 'app.html';
    }, 500);
  },

  handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
      Utils.showToast('Please fill in all fields', 'warning');
      return;
    }

    if (password.length < 4) {
      Utils.showToast('Password must be at least 4 characters', 'warning');
      return;
    }

    if (Store.getUserByEmail(email)) {
      Utils.showToast('An account with this email already exists', 'error');
      return;
    }

    const user = Store.createUser({ name, email, password });
    Store.setSession(user.id);
    Utils.showToast('Account created! Welcome, ' + user.name + '!', 'success');

    setTimeout(() => {
      window.location.href = 'app.html';
    }, 500);
  },

  /**
   * Require auth on protected pages — redirects to index if not logged in
   */
  requireAuth() {
    const user = Store.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  /**
   * Logout
   */
  logout() {
    Store.clearSession();
    window.location.href = 'index.html';
  },
};

// Auto-init on DOM load
document.addEventListener('DOMContentLoaded', () => Auth.init());
