/**
 * Client-side session handling.
 *
 * The password itself never reaches the frontend beyond the login POST — the
 * server replies with a signed, self-expiring token that is kept in
 * localStorage and attached to every API request.
 */

const TOKEN_KEY = 'trackme_session';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — the session simply won't persist */
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};