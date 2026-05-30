import { showLoginView } from './login.js';
import { showProfileView } from './profile.js';
import { isAuthenticated } from './auth.js';

function App() {
  if (isAuthenticated()) {
    showProfileView();
  } else {
    showLoginView();
  }
}

App();
