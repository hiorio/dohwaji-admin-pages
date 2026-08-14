import { APP_CONFIG } from '../config.js';
import { adminApi } from '../adapters/api.js';
import { posthogAdapter } from '../adapters/posthog.js';
import { sentryAdapter } from '../adapters/sentry.js';
import { mockData } from '../data/mockData.js';

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export const dataService = {
  async dashboard() {
    if (APP_CONFIG.dataMode === 'mock') { await wait(); return mockData.dashboard; }
    const [dashboard, sentry] = await Promise.all([adminApi.dashboard(), sentryAdapter.getIssueSummary()]);
    return { ...dashboard, sentry };
  },
  async users(query = '') {
    if (APP_CONFIG.dataMode !== 'mock') return adminApi.users(query);
    await wait(120);
    const normalized = query.trim().toLowerCase();
    return normalized ? mockData.users.filter((user) => [user.name, user.email, user.id].some((value) => value.toLowerCase().includes(normalized))) : mockData.users;
  },
  async usage(range = '7d') {
    if (APP_CONFIG.dataMode === 'mock') { await wait(); return mockData.usage; }
    const [usage, posthog] = await Promise.all([adminApi.usage(), posthogAdapter.getUsageSummary(range)]);
    return posthog ? { ...usage, ...posthog } : usage;
  },
  async system() {
    if (APP_CONFIG.dataMode === 'mock') { await wait(); return mockData.system; }
    const [system, sentry] = await Promise.all([adminApi.system(), sentryAdapter.getIssueSummary()]);
    return { ...system, sentry };
  },
  async costs() {
    if (APP_CONFIG.dataMode === 'mock') { await wait(); return mockData.costs; }
    return adminApi.costs();
  },
  async updateUserStatus(id, status) {
    if (APP_CONFIG.dataMode === 'mock') { await wait(250); return { id, status }; }
    return adminApi.updateUserStatus(id, status);
  },
};
