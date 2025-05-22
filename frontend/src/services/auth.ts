// Token management functions

/**
 * Get the JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Set the JWT token in localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Clear all authentication tokens from localStorage
 */
export const clearTokens = (): void => {
  localStorage.removeItem('token');
};

/**
 * Check if a user is logged in based on token existence
 */
export const isLoggedIn = (): boolean => {
  return !!getToken();
}; 