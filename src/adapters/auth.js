import { APP_CONFIG } from '../config.js';

const mockSession = Object.freeze({
  user: { id: 'admin_local', name: '도화지 운영자', email: 'admin@dohwaji.app', role: 'owner' },
  expiresAt: null,
});

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);
  try {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Authentication request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const authAdapter = {
  async getSession() {
    if (APP_CONFIG.authMode === 'mock') return mockSession;
    return request('/admin/auth/session');
  },
  async signIn({ email, password }) {
    if (APP_CONFIG.authMode === 'mock') return mockSession;
    return request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async signOut() {
    if (APP_CONFIG.authMode === 'mock') return;
    return request('/admin/auth/logout', { method: 'POST' });
  },
};
