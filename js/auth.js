const SIGNIN_ENDPOINT = 'https://platform.zone01.gr/api/auth/signin';

export function isAuthenticated() {
  return !!localStorage.getItem('jwt_token');
}

export function getToken() {
  return localStorage.getItem('jwt_token');
}

/**
 * Decodes JWT payload without verifying signature (client-side only)
 */
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Logs a user in using username/email and password
 * @param {string} identifier - Username or Email
 * @param {string} password - User password
 * @returns {Promise<string>} The JWT token string
 */
export async function login(identifier, password) {
  const credentials = `${identifier}:${password}`;

  const encodedCredentials = btoa(credentials);

  const response = await fetch(SIGNIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedCredentials}`,
    },
  });

  if (!response.ok) {
    let message = 'Invalid username/email or password.';
    try {
      const errData = await response.json();
      if (errData.error) message = errData.error;
    } catch {
      // server returned non-JSON error body — use the default message above
    }
    throw new Error(message);
  }

  const raw = await response.text();
  // Token may arrive as a plain string or as a JSON-quoted string — strip surrounding quotes
  const token = raw.trim().replace(/^"|"$/g, '');

  // Store the token safely for the profile page to use
  localStorage.setItem('jwt_token', token);
  return token;
}

/**
 * Purges tokens and forces a clean application state reset
 */
export function logout() {
  localStorage.removeItem('jwt_token');
  window.location.reload();
}
