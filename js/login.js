import { login } from './auth.js';
import { showProfileView } from './profile.js';

export function showLoginView() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('profile-view').classList.add('hidden');

  document.getElementById('login-view').innerHTML = `
    <div class="login-container">
      <h1>Login</h1>
      <form id="login-form">
        <div class="radio-group">
          <label>
            <input type="radio" name="login-type" value="username" checked />
            Username
          </label>
          <label>
            <input type="radio" name="login-type" value="email" />
            Email
          </label>
        </div>

        <div class="input-group">
          <label for="identifier" id="identifier-label">Username</label>
          <input type="text" id="identifier" placeholder="Enter your username" required />
        </div>

        <div class="input-group">
          <label for="password">Password</label>
          <div class="password-wrapper">
            <input type="password" id="password" placeholder="Enter your password" required />
            <button type="button" id="toggle-password" class="eye-btn" aria-label="Toggle password visibility">
              <img src="icons/eye.png" alt="show password" id="eye-icon" width="20" height="20" />
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn" id="submit-btn">
          <span id="btn-text">Sign In</span>
          <span id="btn-spinner" class="spinner hidden"></span>
        </button>

        <p id="login-error" class="error hidden"></p>
      </form>
    </div>
  `;

  setupLoginListeners();
}

function setupLoginListeners() {
  const form = document.getElementById('login-form');
  const radioGroup = document.querySelector('.radio-group');
  const identifierLabel = document.getElementById('identifier-label');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('toggle-password');
  const eyeIcon = document.getElementById('eye-icon');
  const errorEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  // Switch label/placeholder/type when the user picks Username or Email
  radioGroup.addEventListener('change', (e) => {
    if (e.target.matches('input[value="username"]')) {
      identifierLabel.textContent = 'Username';
      identifierInput.placeholder = 'Enter your username';
      identifierInput.type = 'text';
    }
    if (e.target.matches('input[value="email"]')) {
      identifierLabel.textContent = 'Email';
      identifierInput.placeholder = 'Enter your email';
      identifierInput.type = 'email';
    }
    clearError();
  });

  // Toggle password visibility and swap the icon image
  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.src = isPassword ? 'icons/hidden.png' : 'icons/eye.png';
    eyeIcon.alt = isPassword ? 'hide password' : 'show password';
  });

  // Clear error as soon as the user starts typing
  identifierInput.addEventListener('input', clearError);
  passwordInput.addEventListener('input', clearError);

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;
    const loginType = document.querySelector('input[name="login-type"]:checked').value;

    // Only check that fields are not empty — let the server validate credentials
    if (!identifier) {
      showError(loginType === 'username' ? 'Username is required.' : 'Email is required.');
      return;
    }
    if (!password) {
      showError('Password is required.');
      return;
    }

    // Show loading state while waiting for the server
    setLoading(true);

    try {
      await login(identifier, password);
      showProfileView();
    } catch (err) {
      showError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.textContent = isLoading ? 'Signing in…' : 'Sign In';
    btnSpinner.classList.toggle('hidden', !isLoading);
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}
