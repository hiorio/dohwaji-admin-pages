import { adminApi } from '../adapters/api.js';
import { posthogAdapter } from '../adapters/posthog.js';
import { sentryAdapter } from '../adapters/sentry.js';

export const dataService = {
  async dashboard() {
    const [dashboard, sentry] = await Promise.all([adminApi.dashboard(), sentryAdapter.getIssueSummary()]);
    return sentry ? { ...dashboard, sentry } : dashboard;
  },
  async users(query = '') {
    return adminApi.users(query);
  },
  async user(id) {
    return adminApi.user(id);
  },
  async feedback() {
    return adminApi.feedback();
  },
  async updateFeedbackStatus(id, status) {
    return adminApi.updateFeedbackStatus(id, status);
  },
  async usage(range = '7d') {
    const [usage, posthog] = await Promise.all([adminApi.usage(range), posthogAdapter.getUsageSummary(range)]);
    return posthog ? { ...usage, ...posthog } : usage;
  },
  async system() {
    const [system, sentry] = await Promise.all([adminApi.system(), sentryAdapter.getIssueSummary()]);
    return sentry ? { ...system, sentry } : system;
  },
  async costs() {
    return adminApi.costs();
  },
  async updateUserStatus(id, status) {
    return adminApi.updateUserStatus(id, status);
  },
};
