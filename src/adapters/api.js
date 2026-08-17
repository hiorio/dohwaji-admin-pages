import { APP_CONFIG } from '../config.js';

export async function apiRequest(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);
  try {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}/admin${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Dohwaji-Admin': '1',
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? `운영 API 요청에 실패했습니다. (${response.status})`);
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('운영 API 응답이 지연되고 있습니다.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const adminApi = {
  dashboard: () => apiRequest('/dashboard'),
  users: (query = '') => apiRequest(`/users?q=${encodeURIComponent(query)}`),
  user: (id) => apiRequest(`/users/${encodeURIComponent(id)}`),
  feedback: () => apiRequest('/feedback'),
  updateFeedbackStatus: (id, status) => apiRequest(`/feedback/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
  usage: (range = '7d') => apiRequest(`/usage?range=${encodeURIComponent(range)}`),
  system: () => apiRequest('/system'),
  costs: () => apiRequest('/costs'),
  updateUserStatus: (id, status) => apiRequest(`/users/${encodeURIComponent(id)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
};
