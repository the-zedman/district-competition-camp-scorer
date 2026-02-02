document.addEventListener('DOMContentLoaded', function () {
  const setupForm = document.getElementById('setupForm');
  const setupError = document.getElementById('setupError');
  const setupBtn = document.getElementById('setupBtn');
  const scoutNameInput = document.getElementById('scoutName');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const userTypeInput = document.getElementById('userType');

  function showError(msg) {
    setupError.textContent = msg;
    setupError.hidden = false;
  }

  function hideError() {
    setupError.hidden = true;
    setupError.textContent = '';
  }

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const scoutName = scoutNameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const userType = userTypeInput.value;

    if (!scoutName || !password || !confirmPassword || !userType) {
      showError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setupBtn.disabled = true;
    setupBtn.textContent = 'Setting password...';

    try {
      const response = await fetch(`${window.location.origin}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoutName, password, userType }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.error || 'Failed to set password.');
        setupBtn.disabled = false;
        setupBtn.textContent = 'Set Password';
        return;
      }

      // Success - redirect to login
      alert('Password set successfully! Redirecting to login...');
      window.location.href = 'login.html';
    } catch (err) {
      showError('Network error. Please try again.');
      setupBtn.disabled = false;
      setupBtn.textContent = 'Set Password';
    }
  });
});
