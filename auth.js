// Authentication utilities for frontend
const TOKEN_KEY = 'scorer_auth_token';
const USER_KEY = 'scorer_auth_user';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
}

function setAuth(token, user) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
  return !!getToken();
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.authUtils = {
    getToken,
    getUser,
    setAuth,
    clearAuth,
    isAuthenticated,
    requireAuth,
    getAuthHeaders,
  };

  // Check auth on page load (except login page)
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.includes('login.html');
  
  if (!isLoginPage && !isAuthenticated()) {
    window.location.href = 'login.html';
  }
}
