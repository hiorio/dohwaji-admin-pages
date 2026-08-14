import { APP_CONFIG } from '../config.js';

export async function apiRequest(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);
  try {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}/admin${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
    if (!response.ok) throw new Error(`Admin API request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const adminApi = {
  dashboard: () => apiRequest('/dashboard'),
  users: (query = '') => apiRequest(`/users?q=${encodeURIComponent(query)}`),
  user: (id) => apiRequest(`/users/${encodeURIComponent(id)}`),
  usage: () => apiRequest('/usage'),
  system: () => apiRequest('/system'),
  costs: () => apiRequest('/costs'),
  updateUserStatus: (id, status) => apiRequest(`/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
};
