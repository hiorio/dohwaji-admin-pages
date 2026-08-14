export const APP_CONFIG = Object.freeze({
  dataMode: 'mock',
  authMode: 'mock',
  apiBaseUrl: '',
  requestTimeoutMs: 10000,
  posthog: {
    enabled: false,
    proxyPath: '/integrations/posthog',
  },
  sentry: {
    enabled: false,
    proxyPath: '/integrations/sentry',
  },
});

export const ROUTES = Object.freeze([
  { id: 'dashboard', label: '대시보드', eyebrow: '오늘의 운영 현황' },
  { id: 'users', label: '사용자', eyebrow: '사용자 검색과 관리' },
  { id: 'usage', label: '사용 분석', eyebrow: '기능 사용과 리텐션' },
  { id: 'system', label: '시스템', eyebrow: '서비스 상태와 장애' },
  { id: 'costs', label: '비용', eyebrow: '비용 추이와 예측' },
]);
