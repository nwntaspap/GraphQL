export function isAuthenticated() {
  return !!localStorage.getItem('jwt_token');
}
