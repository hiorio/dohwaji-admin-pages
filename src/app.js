import { APP_CONFIG, ROUTES } from './config.js';
import { authAdapter } from './adapters/auth.js';
import { dataService } from './services/dataService.js';

const app = document.querySelector('#app');
const state = {
  session: null,
  route: routeFromHash(),
  cache: new Map(),
  selectedUser: null,
  selectedFeedback: null,
  userQuery: '',
  userFilter: 'all',
  feedbackQuery: '',
  feedbackFilter: 'all',
};

const NAV_ICONS = { dashboard: 'D', users: 'U', feedback: 'F', usage: 'A', system: 'S', costs: '₩' };

function routeFromHash() {
  const route = window.location.hash.replace('#/', '').split('?')[0];
  return ROUTES.some((item) => item.id === route) ? route : 'dashboard';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function formatNumber(value) { return new Intl.NumberFormat('ko-KR').format(value); }
function formatWon(value) { return `${formatNumber(value)}원`; }
function shorten(value, maxLength = 88) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}
function formatGeneratedAt(value) {
  if (!value) return '방금';
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function shell(content) {
  const route = ROUTES.find((item) => item.id === state.route) ?? ROUTES[0];
  return `
    <div class="app-shell">
      <aside class="sidebar" aria-label="주요 메뉴">
        <div class="brand"><div class="brand-mark">도</div><div class="brand-copy"><strong>도화지 운영실</strong><span>dohwaji.app</span></div></div>
        <nav class="nav">
          <p class="nav-label">Workspace</p>
          ${ROUTES.map((item) => `<button class="nav-link ${state.route === item.id ? 'active' : ''}" data-route="${item.id}" aria-current="${state.route === item.id ? 'page' : 'false'}"><span class="nav-icon">${NAV_ICONS[item.id]}</span><span>${item.label}</span></button>`).join('')}
        </nav>
        <div class="sidebar-foot">
          <div class="mode-card"><div class="mode-row"><strong>데이터 연결</strong><span class="mode-badge">${APP_CONFIG.dataMode.toUpperCase()}</span></div><p>${APP_CONFIG.dataMode === 'mock' ? '샘플 데이터로 화면을 확인하는 중입니다.' : '운영 API와 안전하게 연결되어 있습니다.'}</p></div>
        </div>
      </aside>
      <button class="mobile-overlay" data-close-menu aria-label="메뉴 닫기"></button>
      <main class="main">
        <header class="topbar">
          <button class="mobile-menu" data-menu aria-label="메뉴 열기">☰</button>
          <div class="title-block"><p>${route.eyebrow}</p><h1>${route.label}</h1></div>
          <div class="top-actions">
            <div class="sync-state"><span class="sync-dot"></span><span>방금 동기화</span></div>
            <button class="icon-btn" data-refresh title="데이터 새로고침" aria-label="데이터 새로고침">↻</button>
            <button class="icon-btn" data-toast="새 알림이 없습니다." title="알림" aria-label="알림">•</button>
            <button class="avatar-button" data-signout title="로그아웃"><span class="avatar">관</span><span>${escapeHtml(state.session?.user?.name ?? '운영자')} · 로그아웃</span></button>
          </div>
        </header>
        <div class="content">${content}</div>
      </main>
    </div>`;
}

function pageIntro(title, description, actions = '') {
  return `<div class="page-intro"><div><h2>${title}</h2><p>${description}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
}

function kpiCard(item, index = 0) {
  const tone = item.tone ?? ['coral', 'mint', 'blue', 'amber'][index % 4];
  const negative = String(item.delta).trim().startsWith('-');
  return `<article class="card kpi-card ${tone}"><div class="kpi-top"><span>${escapeHtml(item.label)}</span><span class="kpi-swatch"></span></div><div class="kpi-value">${escapeHtml(item.value)}</div><div class="kpi-foot"><span class="delta ${negative ? 'negative' : ''}">${escapeHtml(item.delta)}</span><span>${escapeHtml(item.hint)}</span></div></article>`;
}

function skeleton() {
  return shell('<div class="loading"><div><div class="spinner"></div>운영 데이터를 불러오고 있습니다.</div></div>');
}

async function getData(key, loader, force = false) {
  if (!force && state.cache.has(key)) return state.cache.get(key);
  const value = await loader();
  state.cache.set(key, value);
  return value;
}

async function render(force = false) {
  state.route = routeFromHash();
  closeMenu();
  app.innerHTML = skeleton();
  try {
    let content = '';
    if (state.route === 'dashboard') content = renderDashboard(await getData('dashboard', () => dataService.dashboard(), force));
    if (state.route === 'users') content = renderUsers(await getData(`users:${state.userQuery}`, () => dataService.users(state.userQuery), force));
    if (state.route === 'feedback') content = renderFeedback(await getData('feedback', () => dataService.feedback(), force));
    if (state.route === 'usage') content = renderUsage(await getData('usage', () => dataService.usage(), force));
    if (state.route === 'system') content = renderSystem(await getData('system', () => dataService.system(), force));
    if (state.route === 'costs') content = renderCosts(await getData('costs', () => dataService.costs(), force));
    app.innerHTML = shell(content);
    bindEvents();
    requestAnimationFrame(drawVisibleCharts);
  } catch (error) {
    app.innerHTML = shell(`<div class="card card-pad empty"><h2>데이터를 불러오지 못했습니다.</h2><p>${escapeHtml(error.message)}</p><button class="primary-btn" data-refresh>다시 시도</button></div>`);
    bindEvents();
  }
}

function renderDashboard(data) {
  const primaryAlert = data.alerts.find((alert) => alert.level !== 'success') ?? data.alerts[0];
  const monthApiCalls = data.usageSummary?.monthApiCalls ?? 0;
  return `
    ${pageIntro('오늘 도화지는 이렇게 움직이고 있어요', `${escapeHtml(data.periodLabel)} 기준 · 실데이터`, '<button class="soft-btn" data-toast="현재 화면은 Supabase 운영 데이터를 직접 집계합니다.">데이터 출처</button><div class="segmented"><button>7일</button><button class="active">오늘</button></div>')}
    ${primaryAlert ? `<div class="notice"><span class="notice-icon">!</span><span><strong>${escapeHtml(primaryAlert.title)}</strong> · ${escapeHtml(primaryAlert.meta)}</span><button class="text-link" data-route="system">상태 보기 →</button></div>` : ''}
    <section class="grid kpi-grid">${data.kpis.map(kpiCard).join('')}</section>
    <section class="grid two-col">
      <article class="card card-pad"><div class="card-head"><div><h3>활성 사용자 흐름</h3><p>최근 7일 일간 활성 사용자와 신규 가입</p></div><button class="text-link" data-route="usage">자세히 보기 →</button></div><div class="chart-wrap"><canvas class="chart-canvas" data-chart="activity" data-values="${data.trend.map((d) => d.dau).join(',')}" data-secondary="${data.trend.map((d) => d.newUsers).join(',')}" data-labels="${data.trend.map((d) => d.date).join(',')}"></canvas></div><div class="chart-legend"><span class="legend-item"><i class="legend-dot" style="--color:var(--coral)"></i>활성 사용자</span><span class="legend-item"><i class="legend-dot" style="--color:var(--blue)"></i>신규 가입</span></div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>핵심 기능 사용</h3><p>오늘 발생한 주요 이벤트</p></div><button class="text-link" data-route="usage">분석 →</button></div><div class="bar-list">${data.featureUsage.map((item) => `<div class="bar-row"><div class="bar-meta"><span>${item.label}</span><strong>${formatNumber(item.value)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${item.percent}%"></div></div></div>`).join('')}</div></article>
    </section>
    <section class="grid equal-col">
      <article class="card card-pad"><div class="card-head"><div><h3>실시간 운영 신호</h3><p>시스템과 사용자 흐름에서 감지된 변화</p></div></div><div class="alert-list">${data.alerts.map((alert) => `<div class="alert-item"><span class="status-dot ${alert.level}"></span><div class="alert-copy"><strong>${alert.title}</strong><span>${alert.meta}</span></div><span class="alert-time">${alert.level === 'success' ? '정상' : '확인'}</span></div>`).join('')}</div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>이번 달 API 사용량</h3><p>실제 검색·경로·정적지도 호출</p></div><button class="text-link" data-route="costs">사용량 보기 →</button></div><div class="money">${formatNumber(monthApiCalls)}회</div><div class="kpi-foot"><span class="delta">LIVE</span><span>청구액 API는 아직 미연동</span></div><div class="budget-track"><div class="budget-fill" style="width:${Math.min(100, monthApiCalls ? 100 : 0)}%"></div></div><div class="budget-labels"><span>Supabase api_usage</span><span>${formatGeneratedAt(data.generatedAt)} 집계</span></div></article>
    </section>`;
}

function renderUsers(users) {
  const filtered = state.userFilter === 'all' ? users : users.filter((user) => user.status === state.userFilter);
  const statusLabel = { active: '정상', review: '검토 중', suspended: '정지' };
  return `
    ${pageIntro('사용자를 찾고 필요한 조치를 이어가세요', '이메일, UID, 이름으로 검색할 수 있습니다.', '<button class="soft-btn" data-toast="사용자 목록 내보내기는 운영 API 연동 후 활성화됩니다.">목록 내보내기</button>')}
    <section class="card table-card">
      <div class="table-toolbar"><form class="search-box" data-user-search><span class="search-icon">⌕</span><input name="query" value="${escapeHtml(state.userQuery)}" placeholder="이메일, UID, 이름 검색" aria-label="사용자 검색" autocomplete="off"><span class="search-count">${filtered.length}명</span></form><div class="filter-group">${[['all','전체'],['active','정상'],['review','검토'],['suspended','정지']].map(([id,label]) => `<button class="filter-chip ${state.userFilter === id ? 'active' : ''}" data-user-filter="${id}">${label}</button>`).join('')}</div></div>
      ${filtered.length ? `<div class="table-scroll"><table><thead><tr><th>사용자</th><th>상태</th><th>가입일</th><th>최근 접속</th><th>환경</th><th>지도</th></tr></thead><tbody>${filtered.map((user) => `<tr data-user-id="${user.id}" tabindex="0"><td><div class="user-cell"><span class="user-avatar">${user.avatar}</span><div><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div></div></td><td><span class="status-pill ${user.status}">${statusLabel[user.status]}</span></td><td>${user.joinedAt}</td><td>${user.lastSeen}</td><td>${escapeHtml(user.os)} · ${escapeHtml(user.version)}</td><td>${user.maps}개</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><strong>검색 결과가 없습니다.</strong><p>이메일이나 UID를 다시 확인해 주세요.</p></div>'}
    </section>`;
}

function renderFeedback(data) {
  const normalizedQuery = state.feedbackQuery.trim().toLowerCase();
  const filtered = data.items.filter((item) => {
    const matchesStatus = state.feedbackFilter === 'all' || item.status === state.feedbackFilter;
    const matchesQuery = !normalizedQuery || [item.message, item.name, item.email, item.categoryLabel]
      .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });
  const statusLabel = { new: '새 의견', reviewing: '확인 중', resolved: '처리 완료' };
  return `
    ${pageIntro('사용자의 목소리를 놓치지 마세요', '도화지 지원 화면에서 접수된 실제 의견을 최신순으로 확인합니다.', `<span class="mode-badge">${formatGeneratedAt(data.generatedAt)} LIVE</span>`)}
    <section class="grid kpi-grid">
      ${kpiCard({ label: '전체 접수', value: `${formatNumber(data.summary.total)}건`, delta: '최근 200건', hint: '지원 화면 접수', tone: 'coral' })}
      ${kpiCard({ label: '새 의견', value: `${formatNumber(data.summary.new)}건`, delta: '확인 필요', hint: '아직 분류 전', tone: 'amber' })}
      ${kpiCard({ label: '확인 중', value: `${formatNumber(data.summary.reviewing)}건`, delta: '처리 중', hint: '운영자 확인', tone: 'blue' })}
      ${kpiCard({ label: '최근 7일', value: `${formatNumber(data.summary.recent)}건`, delta: '실데이터', hint: '신규 접수', tone: 'mint' })}
    </section>
    <section class="card table-card">
      <div class="table-toolbar"><form class="search-box" data-feedback-search><span class="search-icon">⌕</span><input name="query" value="${escapeHtml(state.feedbackQuery)}" placeholder="내용, 사용자, 이메일 검색" aria-label="사용자 의견 검색" autocomplete="off"><span class="search-count">${filtered.length}건</span></form><div class="filter-group">${[['all','전체'],['new','새 의견'],['reviewing','확인 중'],['resolved','완료']].map(([id,label]) => `<button class="filter-chip ${state.feedbackFilter === id ? 'active' : ''}" data-feedback-filter="${id}">${label}</button>`).join('')}</div></div>
      ${filtered.length ? `<div class="table-scroll"><table><thead><tr><th>의견</th><th>유형</th><th>상태</th><th>작성자</th><th>접수 시각</th><th>답장</th></tr></thead><tbody>${filtered.map((item) => `<tr data-feedback-id="${item.id}" tabindex="0"><td><div class="feedback-cell"><strong>${escapeHtml(shorten(item.message, 72))}</strong><span>${escapeHtml(item.sourceLabel)}</span></div></td><td><span class="category-pill ${item.category}">${escapeHtml(item.categoryLabel)}</span></td><td><span class="status-pill ${item.status}">${statusLabel[item.status] ?? item.status}</span></td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.createdAt)}</td><td>${item.contactAllowed ? '가능' : '미요청'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><strong>조건에 맞는 의견이 없습니다.</strong><p>검색어나 상태 필터를 바꿔 보세요.</p></div>'}
    </section>`;
}

function renderUsage(data) {
  return `
    ${pageIntro('사용자가 가치를 느끼는 지점을 살펴보세요', '핵심 이벤트만 선별해 비용과 노이즈를 줄였습니다.', '<div class="segmented"><button>30일</button><button class="active">7일</button><button>오늘</button></div>')}
    <section class="grid kpi-grid three">${data.kpis.map(kpiCard).join('')}</section>
    <section class="grid two-col">
      <article class="card card-pad"><div class="card-head"><div><h3>사용자와 핵심 행동</h3><p>Supabase에 저장된 지도·장소·공개 코스</p></div><span class="mode-badge">LIVE DB</span></div><div class="chart-wrap"><canvas class="chart-canvas" data-chart="activity" data-values="${data.trend.map((d) => d.actions).join(',')}" data-secondary="${data.trend.map((d) => d.dau).join(',')}" data-labels="${data.trend.map((d) => d.date).join(',')}"></canvas></div><div class="chart-legend"><span class="legend-item"><i class="legend-dot" style="--color:var(--coral)"></i>핵심 행동</span><span class="legend-item"><i class="legend-dot" style="--color:var(--blue)"></i>최근 로그인</span></div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>첫 가치 도달 퍼널</h3><p>최근 7일 고유 사용자 기준</p></div></div><div class="funnel">${data.funnel.map((item) => `<div class="funnel-row"><span class="funnel-label">${item.label}</span><div class="funnel-bar"><div class="funnel-fill" style="width:${item.rate}%">${item.rate}%</div></div><span class="funnel-value">${formatNumber(item.value)}명</span></div>`).join('')}</div></article>
    </section>
    <section class="grid equal-col">
      <article class="card card-pad"><div class="card-head"><div><h3>7일 리텐션</h3><p>첫 방문 이후 다시 돌아온 사용자 비율</p></div></div>${data.retentionAvailable ? `<div class="retention-strip">${data.retention.map((value) => `<div class="retention-cell" style="--intensity:${Math.max(18, value)}%">${value}%</div>`).join('')}</div><div class="retention-labels">${data.retention.map((_, index) => `<span>D${index}</span>`).join('')}</div>` : `<div class="empty"><strong>수집 전</strong><p>${escapeHtml(data.retentionMessage)}</p></div>`}</article>
      <article class="card card-pad"><div class="card-head"><div><h3>이벤트 순위</h3><p>최근 7일 기준</p></div></div><div class="table-scroll"><table><thead><tr><th>Event</th><th>횟수</th><th>사용자</th><th>변화</th></tr></thead><tbody>${data.events.map((event) => `<tr><td><strong>${event.event}</strong></td><td>${formatNumber(event.count)}</td><td>${formatNumber(event.users)}</td><td><span class="delta ${event.change.startsWith('-') ? 'negative' : ''}">${event.change}</span></td></tr>`).join('')}</tbody></table></div></article>
    </section>`;
}

function renderSystem(data) {
  const statusLabels = { operational: '정상', degraded: '확인 필요', investigating: '조사 중', resolved: '기록됨' };
  const allHealthy = data.services.every((service) => service.status === 'operational');
  return `
    ${pageIntro('서비스의 맥박을 한눈에 확인하세요', `마지막 실시간 확인 ${formatGeneratedAt(data.generatedAt)} · 오류 원문은 연동된 모니터링 도구에서 관리합니다.`, '<button class="soft-btn" data-toast="Sentry는 아직 연결되지 않았습니다.">Sentry 상태</button>')}
    <article class="card card-pad system-hero"><div class="health-score" style="background:conic-gradient(var(--mint) ${data.score}%, #e5e2da 0)"><div class="health-score-inner"><strong>${data.score}%</strong><span>현재 연결 점수</span></div></div><div class="health-copy"><span class="status-pill ${allHealthy ? '' : 'review'}">${allHealthy ? '모든 연결 정상' : '확인 항목 있음'}</span><h2>${allHealthy ? '도화지 핵심 연결이 정상입니다.' : '일부 연결을 확인해 주세요.'}</h2><p>${escapeHtml(data.summary)}</p></div></article>
    <section class="grid two-col">
      <article class="card card-pad"><div class="card-head"><div><h3>서비스 상태</h3><p>최근 5분의 상태와 응답 시간</p></div><span class="sync-state"><span class="sync-dot"></span>Live</span></div><div class="service-list">${data.services.map((service) => `<div class="service-row"><strong>${service.name}</strong><span class="status-pill ${service.status === 'degraded' ? 'review' : ''}">${statusLabels[service.status]}</span><span>${service.latency}</span><span>${service.uptime}</span><span class="detail">${service.detail}</span></div>`).join('')}</div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>앱 버전 분포</h3><p>최근 7일 활성 기기 기준</p></div></div>${data.versions.length ? `<div class="bar-list">${data.versions.map((version) => `<div class="bar-row"><div class="bar-meta"><span><strong>${version.version}</strong> · ${version.status}</span><strong>${version.share}%</strong></div><div class="bar-track"><div class="bar-fill" style="width:${version.share}%"></div></div></div>`).join('')}</div>` : `<div class="empty"><strong>수집 전</strong><p>${escapeHtml(data.versionMessage)}</p></div>`}</article>
    </section>
    <article class="card card-pad"><div class="card-head"><div><h3>최근 운영 기록</h3><p>실제 관리자 감사 로그입니다.</p></div></div>${data.incidents.length ? `<div class="alert-list">${data.incidents.map((incident) => `<div class="alert-item"><span class="status-dot ${incident.status === 'investigating' ? 'warning' : 'info'}"></span><div class="alert-copy"><strong>${escapeHtml(incident.title)}</strong><span>${escapeHtml(incident.date)} · ${escapeHtml(incident.impact)}</span></div><span class="status-pill ${incident.status}">${statusLabels[incident.status]}</span></div>`).join('')}</div>` : '<div class="empty"><strong>운영 기록이 없습니다.</strong><p>관리자 작업이 발생하면 이곳에 표시됩니다.</p></div>'}</article>`;
}

function renderCosts(data) {
  if (!data.available) {
    return `
      ${pageIntro('실제 사용량만 표시합니다', '공급사 청구 API가 연결되기 전에는 금액을 추정하지 않습니다.', `<span class="mode-badge">${formatGeneratedAt(data.generatedAt)} LIVE</span>`)}
      <div class="notice"><span class="notice-icon">i</span><span><strong>청구액 미연동</strong> · ${escapeHtml(data.message)}</span></div>
      <section class="grid kpi-grid three">
        ${kpiCard({ label: '이번 달 API 호출', value: `${formatNumber(data.monthToDateCalls)}회`, delta: '실데이터', hint: 'Supabase api_usage', tone: 'coral' })}
        ${kpiCard({ label: '청구 금액', value: '미연동', delta: '표시 안 함', hint: '공급사 Billing API 필요', tone: 'blue' })}
        ${kpiCard({ label: '예산 대비', value: '미설정', delta: '표시 안 함', hint: '실제 금액 연결 후 계산', tone: 'amber' })}
      </section>
      <section class="grid two-col">
        <article class="card card-pad"><div class="card-head"><div><h3>일별 API 호출</h3><p>최근 7일 실제 호출량</p></div></div><div class="chart-wrap compact"><canvas class="chart-canvas" data-chart="activity" data-values="${data.trend.map((d) => d.calls).join(',')}" data-labels="${data.trend.map((d) => d.date).join(',')}"></canvas></div></article>
        <article class="card card-pad"><div class="card-head"><div><h3>API 호출 구성</h3><p>이번 달 실제 호출 비중</p></div></div>${data.providers.length ? `<div class="chart-wrap compact"><canvas class="chart-canvas" data-chart="donut" data-values="${data.providers.map((p) => p.ratio).join(',')}" data-labels="${data.providers.map((p) => p.name).join(',')}"></canvas></div>` : '<div class="empty"><strong>호출 기록이 없습니다.</strong></div>'}</article>
      </section>
      <article class="card card-pad"><div class="card-head"><div><h3>API별 실제 사용량</h3><p>금액 대신 확인 가능한 원본 호출 수를 표시합니다.</p></div></div>${data.providers.length ? data.providers.map((provider) => `<div class="provider-row"><div class="provider-name"><strong>${escapeHtml(provider.name)}</strong><span>${escapeHtml(provider.category)}</span></div><div class="provider-bar"><span style="width:${provider.ratio}%"></span></div><span class="provider-amount">${formatNumber(provider.calls)}회</span><span class="provider-change">${provider.ratio}%</span></div>`).join('') : '<div class="empty"><strong>이번 달 사용량이 없습니다.</strong></div>'}</article>`;
  }
  const budgetRate = Math.round((data.monthToDate / data.budget) * 1000) / 10;
  return `
    ${pageIntro('성장 속도와 비용을 함께 관리하세요', '실제 청구 데이터는 백엔드가 공급사별 API를 집계해 전달합니다.', '<div class="segmented"><button>7월</button><button class="active">8월</button></div>')}
    <section class="cost-hero">
      <article class="card card-pad"><div class="card-head"><div><h3>8월 누적 비용</h3><p>14일 11:48 기준 · 부가세 별도</p></div><span class="status-pill">예산 내</span></div><div class="money">${formatWon(data.monthToDate)}</div><div class="kpi-foot"><span class="delta">${budgetRate}%</span><span>월 예산 ${formatWon(data.budget)}</span></div><div class="budget-track"><div class="budget-fill" style="width:${budgetRate}%"></div></div><div class="budget-labels"><span>사용 ${formatWon(data.monthToDate)}</span><span>남음 ${formatWon(data.budget - data.monthToDate)}</span></div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>예상과 효율</h3><p>현재 추세가 유지될 경우</p></div></div><div class="cost-metrics"><div class="cost-metric"><span>월말 예상</span><strong>${formatWon(data.projected)}</strong></div><div class="cost-metric"><span>활성 사용자당</span><strong>${formatWon(data.perActiveUser)}</strong></div><div class="cost-metric"><span>예산 여유</span><strong>${formatWon(data.budget - data.projected)}</strong></div><div class="cost-metric"><span>전월 대비</span><strong>+7.8%</strong></div></div></article>
    </section>
    <section class="grid two-col">
      <article class="card card-pad"><div class="card-head"><div><h3>일별 비용 추이</h3><p>최근 7일 공급사 합계 · 천원</p></div></div><div class="chart-wrap compact"><canvas class="chart-canvas" data-chart="cost" data-values="${data.trend.map((d) => d.cost).join(',')}" data-labels="${data.trend.map((d) => d.date).join(',')}"></canvas></div></article>
      <article class="card card-pad"><div class="card-head"><div><h3>비용 구성</h3><p>이번 달 누적 비중</p></div></div><div class="chart-wrap compact"><canvas class="chart-canvas" data-chart="donut" data-values="${data.providers.map((p) => p.ratio).join(',')}" data-labels="${data.providers.map((p) => p.name).join(',')}"></canvas></div></article>
    </section>
    <article class="card card-pad"><div class="card-head"><div><h3>공급사별 비용</h3><p>비용 원본과 결제 정보는 각 공급사 콘솔에서 관리합니다.</p></div><button class="text-link" data-toast="예산 알림은 백엔드 작업 스케줄러 연동 후 활성화됩니다.">예산 알림 설정</button></div>${data.providers.map((provider) => `<div class="provider-row"><div class="provider-name"><strong>${provider.name}</strong><span>${provider.category}</span></div><div class="provider-bar"><span style="width:${provider.ratio}%"></span></div><span class="provider-amount">${formatWon(provider.amount)}</span><span class="provider-change">${provider.change}</span></div>`).join('')}</article>`;
}

function openUserDrawer(user) {
  state.selectedUser = user;
  const statusLabel = { active: '정상', review: '검토 중', suspended: '정지' };
  document.body.insertAdjacentHTML('beforeend', `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="사용자 상세"><div class="drawer-head"><h2>사용자 상세</h2><button class="icon-btn" data-close-drawer aria-label="닫기">×</button></div><div class="drawer-body"><div class="profile"><span class="user-avatar">${user.avatar}</span><div><h3>${escapeHtml(user.name)}</h3><p>${escapeHtml(user.email)} · ${escapeHtml(user.id)}</p></div></div><span class="status-pill ${user.status}">${user.isAdmin ? '관리자 · ' : ''}${statusLabel[user.status]}</span><div class="detail-grid"><div class="detail-item"><span>가입일</span><strong>${user.joinedAt}</strong></div><div class="detail-item"><span>최근 접속</span><strong>${user.lastSeen}</strong></div><div class="detail-item"><span>앱 환경</span><strong>${escapeHtml(user.os)}</strong></div><div class="detail-item"><span>버전</span><strong>${escapeHtml(user.version)}</strong></div><div class="detail-item"><span>생성 지도</span><strong>${user.maps}개</strong></div><div class="detail-item"><span>저장 장소</span><strong>${user.places}개</strong></div></div>${user.note ? `<div class="notice"><span class="notice-icon">i</span><span>${escapeHtml(user.note)}</span></div>` : ''}<h4 class="section-title">최근 활동</h4>${user.activities.map((activity) => `<div class="activity">${escapeHtml(activity)}</div>`).join('')}<div class="drawer-actions"><button class="soft-btn" data-toast="일반 사용자 세션 강제 종료 기능은 아직 제공하지 않습니다.">세션 초기화</button>${user.isAdmin ? '<button class="soft-btn" disabled>관리자 계정 보호됨</button>' : `<button class="primary-btn ${user.status === 'active' ? 'danger' : ''}" data-user-action="${user.status === 'active' ? 'suspended' : 'active'}">${user.status === 'active' ? '계정 정지' : '계정 활성화'}</button>`}</div></div></aside>`);
  document.querySelector('.drawer [data-close-drawer]')?.focus();
  bindDrawerEvents();
}

function openFeedbackDrawer(item) {
  state.selectedFeedback = item;
  const statusLabel = { new: '새 의견', reviewing: '확인 중', resolved: '처리 완료' };
  const canManage = ['owner', 'operator'].includes(state.session?.user?.role);
  const actions = canManage ? [['new','새 의견'],['reviewing','확인 중'],['resolved','처리 완료']]
    .filter(([status]) => status !== item.status)
    .map(([status, label]) => `<button class="${status === 'resolved' ? 'primary-btn' : 'soft-btn'}" data-feedback-action="${status}">${label}${status === 'resolved' ? '로' : '으로'} 변경</button>`).join('') : '';
  document.body.insertAdjacentHTML('beforeend', `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="사용자 의견 상세"><div class="drawer-head"><h2>사용자 의견 상세</h2><button class="icon-btn" data-close-drawer aria-label="닫기">×</button></div><div class="drawer-body"><div class="feedback-heading"><span class="category-pill ${item.category}">${escapeHtml(item.categoryLabel)}</span><span class="status-pill ${item.status}">${statusLabel[item.status] ?? item.status}</span></div><div class="detail-grid"><div class="detail-item"><span>작성자</span><strong>${escapeHtml(item.name)}</strong></div><div class="detail-item"><span>접수 시각</span><strong>${escapeHtml(item.createdAt)}</strong></div><div class="detail-item"><span>답장 이메일</span><strong>${escapeHtml(item.email)}</strong></div><div class="detail-item"><span>연락 동의</span><strong>${item.contactAllowed ? '답장 가능' : '미요청'}</strong></div></div><h4 class="section-title">의견 내용</h4><div class="feedback-message">${escapeHtml(item.message)}</div><h4 class="section-title">접수 정보</h4><div class="activity">${escapeHtml(item.sourceLabel)} · ${escapeHtml(item.userAgent || '환경 정보 없음')}</div>${actions ? `<div class="drawer-actions">${actions}</div>` : ''}</div></aside>`);
  document.querySelector('.drawer [data-close-drawer]')?.focus();
  bindDrawerEvents();
}

function bindDrawerEvents() {
  document.querySelectorAll('[data-close-drawer]').forEach((element) => element.addEventListener('click', closeDrawer));
  document.querySelector('[data-user-action]')?.addEventListener('click', async (event) => {
    const status = event.currentTarget.dataset.userAction;
    event.currentTarget.disabled = true;
    try {
      await dataService.updateUserStatus(state.selectedUser.id, status);
      state.cache.clear();
      closeDrawer();
      showToast('사용자 상태를 변경하고 감사 로그에 기록했습니다.');
      await render(true);
    } catch (error) {
      event.currentTarget.disabled = false;
      showToast(error.message);
    }
  });
}

function closeDrawer() {
  document.querySelector('.drawer')?.remove();
  document.querySelector('.drawer-backdrop')?.remove();
  state.selectedUser = null;
  state.selectedFeedback = null;
}

function bindEvents() {
  document.querySelectorAll('[data-route]').forEach((element) => element.addEventListener('click', () => { window.location.hash = `#/${element.dataset.route}`; }));
  document.querySelector('[data-menu]')?.addEventListener('click', () => document.body.classList.add('menu-open'));
  document.querySelector('[data-close-menu]')?.addEventListener('click', closeMenu);
  document.querySelectorAll('[data-refresh]').forEach((element) => element.addEventListener('click', () => { showToast('최신 데이터를 불러왔습니다.'); render(true); }));
  document.querySelectorAll('[data-toast]').forEach((element) => element.addEventListener('click', () => showToast(element.dataset.toast)));
  document.querySelector('[data-signout]')?.addEventListener('click', async (event) => {
    event.currentTarget.disabled = true;
    try { await authAdapter.signOut(); }
    catch (error) { showToast(error.message); }
    finally { state.session = null; state.cache.clear(); renderLogin(); }
  });
  document.querySelector('[data-user-search]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    state.userQuery = new FormData(event.currentTarget).get('query').toString();
    render(true);
  });
  document.querySelectorAll('[data-user-filter]').forEach((element) => element.addEventListener('click', () => { state.userFilter = element.dataset.userFilter; render(); }));
  document.querySelector('[data-feedback-search]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    state.feedbackQuery = new FormData(event.currentTarget).get('query').toString();
    render();
  });
  document.querySelectorAll('[data-feedback-filter]').forEach((element) => element.addEventListener('click', () => { state.feedbackFilter = element.dataset.feedbackFilter; render(); }));
  document.querySelectorAll('[data-user-id]').forEach((row) => {
    const handler = async () => {
      try {
        const user = await dataService.user(row.dataset.userId);
        openUserDrawer(user);
      } catch (error) {
        showToast(error.message);
      }
    };
    row.addEventListener('click', handler);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); } });
  });
  document.querySelectorAll('[data-feedback-id]').forEach((row) => {
    const handler = () => {
      const data = state.cache.get('feedback');
      const item = data?.items.find((feedback) => String(feedback.id) === row.dataset.feedbackId);
      if (item) openFeedbackDrawer(item);
    };
    row.addEventListener('click', handler);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handler(); } });
  });
  document.querySelectorAll('[data-feedback-action]').forEach((element) => element.addEventListener('click', async (event) => {
    const status = event.currentTarget.dataset.feedbackAction;
    event.currentTarget.disabled = true;
    try {
      await dataService.updateFeedbackStatus(state.selectedFeedback.id, status);
      state.cache.delete('feedback');
      closeDrawer();
      showToast('의견 상태를 변경하고 감사 로그에 기록했습니다.');
      await render(true);
    } catch (error) {
      event.currentTarget.disabled = false;
      showToast(error.message);
    }
  }));
}

function closeMenu() { document.body.classList.remove('menu-open'); }

let toastTimer;
function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 3200);
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  return { ctx, width: rect.width, height: rect.height };
}

function drawLineChart(canvas) {
  const values = canvas.dataset.values.split(',').map(Number);
  const secondary = canvas.dataset.secondary?.split(',').map(Number) ?? [];
  const labels = canvas.dataset.labels.split(',');
  const { ctx, width, height } = prepareCanvas(canvas);
  const pad = { top: 14, right: 10, bottom: 28, left: 34 };
  const all = [...values, ...secondary];
  const max = Math.max(...all) * 1.12;
  const min = Math.min(...all) * .82;
  const x = (index) => pad.left + index * ((width - pad.left - pad.right) / (values.length - 1));
  const y = (value) => pad.top + (max - value) * ((height - pad.top - pad.bottom) / (max - min || 1));
  ctx.font = '9px sans-serif'; ctx.fillStyle = '#8b8983'; ctx.textAlign = 'right';
  for (let i = 0; i < 4; i++) { const yy = pad.top + i * ((height - pad.top - pad.bottom) / 3); ctx.strokeStyle = 'rgba(36,36,33,.08)'; ctx.beginPath(); ctx.moveTo(pad.left, yy); ctx.lineTo(width - pad.right, yy); ctx.stroke(); }
  const draw = (series, color, fill) => {
    ctx.beginPath();
    series.forEach((value, index) => {
      if (index) ctx.lineTo(x(index), y(value));
      else ctx.moveTo(x(index), y(value));
    });
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke();
    if (fill) { ctx.lineTo(x(series.length - 1), height - pad.bottom); ctx.lineTo(x(0), height - pad.bottom); ctx.closePath(); const gradient = ctx.createLinearGradient(0, pad.top, 0, height); gradient.addColorStop(0, 'rgba(228,81,69,.16)'); gradient.addColorStop(1, 'rgba(228,81,69,0)'); ctx.fillStyle = gradient; ctx.fill(); }
    series.forEach((value, index) => { ctx.beginPath(); ctx.arc(x(index), y(value), 2.4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); });
  };
  draw(values, '#e45145', true); if (secondary.length) draw(secondary, '#4778b8', false);
  ctx.textAlign = 'center'; ctx.fillStyle = '#8b8983'; labels.forEach((label, index) => ctx.fillText(label, x(index), height - 7));
}

function drawDonut(canvas) {
  const values = canvas.dataset.values.split(',').map(Number);
  const labels = canvas.dataset.labels.split(',');
  const colors = ['#4778b8', '#e45145', '#25886f', '#ad7622', '#aaa69e'];
  const { ctx, width, height } = prepareCanvas(canvas);
  const centerX = Math.min(width * .33, 110); const centerY = height / 2; const radius = Math.min(68, height * .37); const total = values.reduce((a, b) => a + b, 0);
  if (!total) return;
  let angle = -Math.PI / 2;
  values.forEach((value, index) => { const next = angle + (value / total) * Math.PI * 2; ctx.beginPath(); ctx.arc(centerX, centerY, radius, angle, next); ctx.arc(centerX, centerY, radius * .62, next, angle, true); ctx.closePath(); ctx.fillStyle = colors[index]; ctx.fill(); angle = next; });
  ctx.textAlign = 'center'; ctx.fillStyle = '#242421'; ctx.font = '600 18px Georgia'; ctx.fillText('100%', centerX, centerY + 4); ctx.font = '9px sans-serif'; ctx.fillStyle = '#73716b'; ctx.fillText('누적 비용', centerX, centerY + 20);
  const legendX = Math.max(160, width * .57); ctx.textAlign = 'left';
  labels.forEach((label, index) => { const yy = centerY - 45 + index * 23; ctx.fillStyle = colors[index]; ctx.beginPath(); ctx.arc(legendX, yy, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#73716b'; ctx.font = '10px sans-serif'; ctx.fillText(`${label}  ${values[index]}%`, legendX + 11, yy + 3); });
}

function drawVisibleCharts() {
  document.querySelectorAll('canvas[data-chart]').forEach((canvas) => {
    if (canvas.dataset.chart === 'donut') drawDonut(canvas);
    else drawLineChart(canvas);
  });
}

function renderLogin() {
  app.innerHTML = `<div class="login-page"><section class="login-brand"><div class="brand"><div class="brand-mark">도</div><div class="brand-copy"><strong>도화지 운영실</strong><span>dohwaji.app</span></div></div><div><h1>서비스의 오늘을<br>차분하게 살핍니다.</h1><p>사용자, 의견, 제품 사용, 시스템 상태와 비용을 한곳에서 확인하세요.</p></div><small>관리자 전용 · 모든 작업은 기록됩니다.</small></section><section class="login-form-wrap"><form class="login-form" data-login><h2>관리자 로그인</h2><p>도화지 운영 계정으로 로그인해 주세요. 인증은 별도 백엔드에서 안전하게 처리됩니다.</p><div class="field"><label for="email">이메일</label><input id="email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="password">비밀번호</label><input id="password" name="password" type="password" autocomplete="current-password" required></div><button class="primary-btn" type="submit">로그인</button><p class="login-hint">정적 페이지에는 관리자 비밀번호나 API 비밀키가 저장되지 않습니다.</p></form></section></div>`;
  document.querySelector('[data-login]').addEventListener('submit', async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = '확인 중…';
    try { state.session = await authAdapter.signIn({ email: form.get('email'), password: form.get('password') }); render(); }
    catch (error) { showToast(error.message); button.disabled = false; button.textContent = '로그인'; }
  });
}

window.addEventListener('hashchange', () => render());
window.addEventListener('resize', () => requestAnimationFrame(drawVisibleCharts));
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDrawer(); closeMenu(); } });
window.addEventListener('auth:expired', () => { state.session = null; renderLogin(); showToast('세션이 만료되었습니다. 다시 로그인해 주세요.'); });

async function boot() {
  app.innerHTML = '<div class="loading"><div><div class="spinner"></div>운영실을 준비하고 있습니다.</div></div>';
  try { state.session = await authAdapter.getSession(); }
  catch { state.session = null; }
  if (!state.session) renderLogin(); else render();
}

boot();
