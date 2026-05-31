import { fetchAllProfileData } from './api.js';

export function showProfileView() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('profile-view').classList.remove('hidden');
  fetchAllProfileData();
}
