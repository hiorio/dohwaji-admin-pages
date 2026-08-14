const trend = [
  { date: '8/08', dau: 238, newUsers: 22, actions: 894, errors: 9, cost: 24.1 },
  { date: '8/09', dau: 251, newUsers: 27, actions: 930, errors: 6, cost: 24.8 },
  { date: '8/10', dau: 244, newUsers: 20, actions: 912, errors: 11, cost: 23.9 },
  { date: '8/11', dau: 273, newUsers: 31, actions: 1040, errors: 7, cost: 26.7 },
  { date: '8/12', dau: 298, newUsers: 34, actions: 1162, errors: 5, cost: 28.3 },
  { date: '8/13', dau: 321, newUsers: 29, actions: 1286, errors: 8, cost: 30.4 },
  { date: '오늘', dau: 342, newUsers: 38, actions: 1348, errors: 7, cost: 31.2 },
];

const users = [
  { id: 'usr_91fd2', name: '김하늘', email: 'haneul.kim@example.com', status: 'active', joinedAt: '2026.07.21', lastSeen: '2분 전', os: 'iOS 19.1', version: '1.3.2', maps: 18, places: 124, sessions: 42, avatar: '김', note: '공유 지도를 자주 만드는 활성 사용자', activities: ['11:42 여행 지도 공유', '11:38 장소 4개 저장', '10:21 앱 로그인'] },
  { id: 'usr_44a72', name: '이도윤', email: 'doyun.lee@example.com', status: 'active', joinedAt: '2026.08.12', lastSeen: '8분 전', os: 'Android 16', version: '1.3.2', maps: 3, places: 21, sessions: 7, avatar: '이', note: '신규 사용자', activities: ['11:36 첫 지도 생성', '11:31 장소 검색', '11:22 회원가입'] },
  { id: 'usr_5cb88', name: '박서연', email: 'seoyeon.park@example.com', status: 'active', joinedAt: '2026.05.02', lastSeen: '32분 전', os: 'iOS 18.6', version: '1.3.1', maps: 31, places: 268, sessions: 86, avatar: '박', note: '베타 피드백 참여자', activities: ['11:12 공개 코스 열람', '10:44 지도 수정', '어제 장소 목록 정리'] },
  { id: 'usr_74d13', name: '최민준', email: 'minjun.choi@example.com', status: 'review', joinedAt: '2026.06.18', lastSeen: '1시간 전', os: 'Web / Chrome', version: 'web', maps: 12, places: 73, sessions: 25, avatar: '최', note: '비정상 공유 요청으로 검토 중', activities: ['10:41 공유 요청 제한', '10:39 지도 8개 연속 생성', '09:05 앱 로그인'] },
  { id: 'usr_a31e0', name: '정유진', email: 'yujin.jung@example.com', status: 'active', joinedAt: '2026.08.03', lastSeen: '2시간 전', os: 'iOS 19.0', version: '1.3.2', maps: 7, places: 46, sessions: 16, avatar: '정', note: '', activities: ['09:42 장소 저장', '09:38 지도 열람', '09:31 앱 로그인'] },
  { id: 'usr_f623c', name: '오지훈', email: 'jihoon.oh@example.com', status: 'suspended', joinedAt: '2026.04.11', lastSeen: '3일 전', os: 'Android 15', version: '1.2.8', maps: 24, places: 191, sessions: 58, avatar: '오', note: 'CS 요청으로 일시 정지', activities: ['8/11 계정 일시 정지', '8/11 CS 접수', '8/10 지도 내보내기'] },
];

export const mockData = Object.freeze({
  generatedAt: '2026-08-14T11:48:00+09:00',
  dashboard: {
    kpis: [
      { label: '오늘 활성 사용자', value: '342', delta: '+6.5%', tone: 'coral', hint: '어제 같은 시간 대비' },
      { label: '오늘 가입', value: '38', delta: '+9명', tone: 'mint', hint: '전일 29명' },
      { label: '지도 생성', value: '184', delta: '+12.2%', tone: 'blue', hint: '완료 기준' },
      { label: '영향받은 사용자', value: '7', delta: '-3명', tone: 'amber', hint: '오류 발생 사용자' },
    ],
    trend,
    featureUsage: [
      { label: '장소 저장', value: 612, percent: 100 },
      { label: '지도 열람', value: 482, percent: 79 },
      { label: '경로 생성', value: 184, percent: 30 },
      { label: '링크 공유', value: 70, percent: 11 },
    ],
    alerts: [
      { level: 'warning', title: 'iOS 1.3.1 공유 실패율 증가', meta: '10분 전 · 영향 사용자 5명' },
      { level: 'info', title: '신규 가입 전일 대비 31% 증가', meta: '42분 전 · 정상 범위' },
      { level: 'success', title: 'API와 데이터베이스 정상', meta: '방금 확인 · 4개 리전' },
    ],
  },
  users,
  usage: {
    kpis: [
      { label: 'DAU / MAU', value: '28.4%', delta: '+1.8%p', hint: '활성도' },
      { label: 'D7 리텐션', value: '37.2%', delta: '+2.4%p', hint: '7일 재방문' },
      { label: '지도 생성 전환', value: '61.8%', delta: '-0.6%p', hint: '가입 → 첫 지도' },
    ],
    trend,
    funnel: [
      { label: '앱 방문', value: 1204, rate: 100 },
      { label: '회원가입', value: 782, rate: 65 },
      { label: '장소 저장', value: 591, rate: 49 },
      { label: '첫 지도 완성', value: 482, rate: 40 },
      { label: '링크 공유', value: 198, rate: 16 },
    ],
    events: [
      { event: 'place_saved', count: 4812, users: 926, change: '+14.2%' },
      { event: 'map_viewed', count: 3927, users: 1108, change: '+8.1%' },
      { event: 'route_created', count: 1384, users: 642, change: '+11.7%' },
      { event: 'route_shared', count: 604, users: 318, change: '-2.4%' },
      { event: 'signup_completed', count: 293, users: 293, change: '+4.8%' },
    ],
    retention: [100, 54, 46, 41, 39, 38, 37],
  },
  system: {
    score: 99.96,
    services: [
      { name: 'Web App', status: 'operational', latency: '118ms', uptime: '99.99%', detail: 'Seoul · 정상' },
      { name: 'Admin API', status: 'operational', latency: '142ms', uptime: '99.98%', detail: 'Seoul · 정상' },
      { name: 'PostgreSQL', status: 'operational', latency: '24ms', uptime: '99.99%', detail: '연결 18 / 100' },
      { name: 'Map Provider', status: 'degraded', latency: '624ms', uptime: '99.91%', detail: '응답 지연 관찰 중' },
      { name: 'Object Storage', status: 'operational', latency: '86ms', uptime: '100%', detail: '정상' },
    ],
    incidents: [
      { date: '오늘 10:18', title: 'iOS 공유 시트 간헐적 실패', status: 'investigating', impact: '5명 · 오류 8건' },
      { date: '8월 12일 14:02', title: '지도 검색 API 응답 지연', status: 'resolved', impact: '18분간 지연' },
      { date: '8월 09일 03:14', title: '정기 데이터베이스 점검', status: 'resolved', impact: '사용자 영향 없음' },
    ],
    versions: [
      { version: '1.3.2', share: 72, status: '권장' },
      { version: '1.3.1', share: 19, status: '지원' },
      { version: '1.2.x', share: 7, status: '업데이트 필요' },
      { version: '기타', share: 2, status: '지원 종료' },
    ],
  },
  costs: {
    monthToDate: 428600,
    projected: 782000,
    budget: 1000000,
    perActiveUser: 612,
    trend,
    providers: [
      { name: 'Railway', category: '서버', amount: 228400, ratio: 53, change: '+8.2%' },
      { name: 'Supabase', category: '데이터베이스', amount: 104200, ratio: 24, change: '+3.1%' },
      { name: 'Kakao Maps API', category: '지도 API', amount: 62800, ratio: 15, change: '+12.4%' },
      { name: 'Sentry', category: '모니터링', amount: 19200, ratio: 4, change: '무료 한도 근접' },
      { name: '기타', category: '도메인·스토리지', amount: 14000, ratio: 4, change: '-1.2%' },
    ],
  },
});
