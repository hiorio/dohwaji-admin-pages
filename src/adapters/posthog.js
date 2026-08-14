import { APP_CONFIG } from '../config.js';
import { apiRequest } from './api.js';

export const posthogAdapter = {
  async getUsageSummary(range = '7d') {
    if (!APP_CONFIG.posthog.enabled) return null;
    // PostHog personal API key는 정적 프론트에 넣지 않습니다. 백엔드 프록시만 호출합니다.
    return apiRequest(`${APP_CONFIG.posthog.proxyPath}?range=${encodeURIComponent(range)}`);
  },
};
