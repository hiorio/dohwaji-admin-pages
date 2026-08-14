import { APP_CONFIG } from '../config.js';
import { apiRequest } from './api.js';

export const sentryAdapter = {
  async getIssueSummary(range = '24h') {
    if (!APP_CONFIG.sentry.enabled) return null;
    // Sentry auth token은 백엔드 환경 변수에만 두고, 여기서는 집계 API만 사용합니다.
    return apiRequest(`${APP_CONFIG.sentry.proxyPath}?range=${encodeURIComponent(range)}`);
  },
};
