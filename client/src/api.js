// Base URL for the HeyCiti backend. Set VITE_API_URL in client/.env when
// the server is deployed (for example on Render); locally it falls back to port 3000.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getToken() {
  return localStorage.getItem('token');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Small fetch wrapper that adds the JSON header, attaches the JWT when there
// is one, and throws an error with the server's message when the request fails.
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}
