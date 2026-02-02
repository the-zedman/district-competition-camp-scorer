document.addEventListener('DOMContentLoaded', function () {
  // Redirect if already logged in
  if (window.authUtils && window.authUtils.isAuthenticated()) {
    window.location.href = 'index.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const scoutNameInput = document.getElementById('scoutName');
  const passwordInput = document.getElementById('password');
  const userTypeInput = document.getElementById('userType');

  function showError(msg) {
    loginError.textContent = msg;
    loginError.hidden = false;
  }

  function hideError() {
    loginError.hidden = true;
    loginError.textContent = '';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const scoutName = scoutNameInput.value.trim();
    const password = passwordInput.value;
    const userType = userTypeInput.value;

    if (!scoutName || !password || !userType) {
      showError('Please fill in all fields.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';

    try {
      const response = await fetch(`${window.location.origin}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoutName, password, userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Login failed. Please check your credentials.');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
        return;
      }

      // Store token and user info
      window.authUtils.setAuth(data.token, data.user);

      // Redirect to home page
      window.location.href = 'index.html';
    } catch (err) {
      showError('Network error. Please try again.');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
});
