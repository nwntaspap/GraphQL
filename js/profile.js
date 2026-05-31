import { logout, getToken, decodeToken } from './auth.js';
import { fetchAllProfileData } from './api.js';
import { renderXpOverTime, renderXpBarChart, renderPassFailDonut } from './graphs.js';

export function showProfileView() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');

  // Skeleton while loading
  document.getElementById('profile-view').innerHTML = `
    <div class="profile-layout">
      <header class="profile-header">
        <div class="header-brand">Z01</div>
        <button id="logout-btn" class="logout-btn">Sign out</button>
      </header>
      <main class="profile-main">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading your profile…</p>
        </div>
      </main>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', logout);
}
