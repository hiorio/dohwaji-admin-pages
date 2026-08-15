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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Dohwaji-Admin': '1',
        ...init.headers,
      },
      signal: controller.signal,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `관리자 인증 요청에 실패했습니다. (${response.status})`);
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('인증 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
    throw error;
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
    if (APP_CONFIG.authMode === 'mock') return null;
    return request('/admin/auth/logout', { method: 'POST' });
  },
};
