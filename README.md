# 도화지 운영실

도화지(`dohwaji.app`) 운영자를 위한 정적 관리자 프론트엔드입니다. 별도 빌드 없이 GitHub Pages에 배포할 수 있습니다. 로그인과 화면 데이터 모두 실제 도화지 백엔드와 Supabase를 사용합니다. 정적 파일에는 관리자 비밀번호, 세션 토큰, service role key가 포함되지 않습니다.

## 포함 화면

- **Dashboard**: 로그인 사용자, 가입, 지도 생성, API 호출 KPI, 추이 차트, 운영 신호
- **Users**: 이름·이메일·UID 검색, 상태 필터, 사용자 상세, 최근 활동, 관리 작업 진입점
- **Usage**: 최근 로그인, 지도·장소·공개 코스 이벤트 추이, 퍼널, 이벤트 순위
- **System**: 데이터베이스·Auth·Storage 실시간 상태, 관리자 감사 로그, Sentry 연결 지점
- **Costs**: 실제 API 호출량. 청구 API가 연결되기 전에는 금액을 추정하지 않음

화면 전환에는 `#/dashboard`, `#/users` 같은 해시 라우팅을 사용합니다. 따라서 GitHub Pages의 하위 경로에서 새로고침해도 404가 발생하지 않습니다.

## 로컬 확인

이 디렉터리에서 정적 파일 서버를 실행합니다.

```bash
cd admin
python -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다. ES module을 사용하므로 `index.html`을 `file://`로 직접 열지 마세요.

## GitHub Pages 배포

저장소에는 [deploy-admin-pages.yml](../.github/workflows/deploy-admin-pages.yml)이 포함되어 있습니다. 이 워크플로는 `admin/`만 Pages artifact로 올리므로 기존 Next.js 서비스와 배포물이 섞이지 않습니다.

1. GitHub 저장소의 **Settings → Pages → Build and deployment**로 이동합니다.
2. Source를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 변경 사항을 push하거나 Actions 탭에서 **Deploy admin to GitHub Pages**를 수동 실행합니다.
4. 배포 주소는 기본적으로 `https://<owner>.github.io/<repository>/`입니다.

커스텀 도메인을 사용할 경우 GitHub Pages 설정에서 `admin.dohwaji.app`을 등록하고 DNS 레코드를 연결하세요. 관리자 화면은 정적 파일이므로 도메인을 숨기는 것이 접근 제어가 되지는 않습니다.

## 운영 API

[src/config.js](./src/config.js)는 기본적으로 실제 API 모드입니다.

```js
export const APP_CONFIG = {
  dataMode: 'api',
  authMode: 'api',
  apiBaseUrl: 'https://dohwaji.app/api',
  // ...
};
```

프론트엔드의 연동 책임은 다음처럼 분리되어 있습니다.

| 파일 | 역할 |
| --- | --- |
| `src/adapters/auth.js` | 관리자 로그인, 세션 확인, 로그아웃 |
| `src/adapters/api.js` | `/admin/*` 운영 API 호출과 401 처리 |
| `src/adapters/posthog.js` | PostHog 집계 프록시 호출 |
| `src/adapters/sentry.js` | Sentry 이슈 집계 프록시 호출 |
| `src/services/dataService.js` | 운영 API와 선택적 PostHog/Sentry 응답 조합 |

구현된 백엔드 계약은 아래와 같습니다.

```text
GET    /api/admin/auth/session
POST   /api/admin/auth/login
POST   /api/admin/auth/logout

GET    /api/admin/dashboard
GET    /api/admin/users?q=
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id/status
GET    /api/admin/usage
GET    /api/admin/system
GET    /api/admin/costs

GET    /admin/integrations/posthog?range=7d
GET    /admin/integrations/sentry?range=24h
```

모든 엔드포인트는 `requireAdmin()`으로 보호되며 Supabase service role은 서버에서만 사용합니다.

### 현재 데이터 범위

- Supabase Auth: 가입일, 이메일 확인, 최근 로그인, 계정 정지 상태
- PostgreSQL: 지도, 장소, 보관 장소, 공개 코스, 좋아요, 다운로드, 관리자 감사 로그
- `api_usage`: 검색·경로·정적 지도 API의 일별 실제 호출량
- 실시간 연결 확인: PostgreSQL, Supabase Auth, Storage, 지도 API 설정 여부

앱 버전, 반복 방문 리텐션, Sentry 오류, Railway/Supabase 실제 청구액은 원천 데이터 또는 공급사 API가 아직 연결되지 않았으므로 임의 값이나 0원을 표시하지 않습니다. 해당 연동이 완료되면 PostHog/Sentry 어댑터 및 비용 API 응답에 합칩니다.

## 관리자 인증 설계

GitHub Pages는 관리자 인증 수단으로 사용하지 않습니다. 실제 구현은 다음과 같습니다.

1. 로그인 폼이 `POST /api/admin/auth/login`으로 이메일과 비밀번호를 전송합니다.
2. 백엔드는 Supabase Auth로 비밀번호와 이메일 확인 상태를 검증합니다.
3. `admin_users`에서 활성 관리자 역할을 확인한 뒤 256비트 난수 세션을 발급합니다. DB에는 원문이 아닌 SHA-256 해시만 저장합니다.
4. 브라우저에는 `Secure`, `HttpOnly`, `SameSite=None`인 `__Host-dohwaji_admin` 쿠키만 저장됩니다.
5. 모든 요청은 정확한 CORS origin allowlist를 통과해야 하며, 상태 변경 요청에는 `X-Dohwaji-Admin: 1` 헤더가 필요합니다.
6. `lib/admin/guard.ts`의 `requireAdmin()`이 세션 만료, 강제 로그아웃, 관리자 활성 상태와 역할을 매 요청 검증합니다.
7. 로그인·로그아웃과 이후 관리 작업은 `admin_audit_logs`에 기록합니다.

### 최초 관리자 등록

1. Supabase Auth에 운영자 이메일 계정을 만들고 이메일 확인을 완료합니다.
2. Railway에 `ADMIN_BOOTSTRAP_EMAIL=운영자이메일`을 설정합니다.
3. 아직 `admin_users`가 비어 있을 때 해당 계정으로 한 번 로그인하면 `owner`로 등록됩니다.
4. 등록 후 `ADMIN_BOOTSTRAP_EMAIL`을 제거하고 재배포합니다.

추가 관리자는 service role을 사용하는 서버 작업 또는 Supabase SQL Editor에서 아래처럼 명시적으로 등록합니다. 이메일이 아니라 Supabase Auth의 UUID를 사용합니다.

```sql
insert into public.admin_users (user_id, role, display_name, created_by)
values ('<auth.users.id>', 'operator', '운영자 이름', '<기존 owner auth.users.id>');
```

역할은 `owner`, `operator`, `viewer` 세 가지입니다. 향후 변경 API는 예를 들어 `requireAdmin(request, { roles: ['owner', 'operator'], mutation: true })`처럼 보호합니다.

관리자 토큰을 `localStorage`에 저장하거나, 데이터베이스 비밀번호·service role key·PostHog personal API key·Sentry auth token을 정적 파일에 넣지 마세요. 정적 프론트에 포함된 값은 저장소가 비공개여도 방문자에게 공개됩니다.

## PostHog 연동

`APP_CONFIG.posthog.enabled`를 `true`로 바꾸고 백엔드에 `/admin/integrations/posthog`를 구현합니다. 백엔드는 환경 변수에 보관한 PostHog personal API key로 필요한 이벤트만 집계해 반환해야 합니다.

권장 핵심 이벤트:

```text
signup_completed
place_saved
route_created
route_shared
map_viewed
```

브라우저에서 PostHog Query API를 직접 호출하지 마세요. 제품 이벤트 수집용 공개 project key와 분석 조회용 personal API key는 용도가 다릅니다.

## Sentry 연동

`APP_CONFIG.sentry.enabled`를 `true`로 바꾸고 백엔드에 `/admin/integrations/sentry`를 구현합니다. 백엔드가 Sentry API에서 최근 이슈, 영향 사용자 수, 릴리스별 오류율을 집계해 관리자 화면에 필요한 최소 정보만 반환하도록 구성합니다.

Sentry auth token과 오류 원문의 개인정보는 프론트로 보내지 않습니다. 상세 스택 트레이스는 권한이 설정된 Sentry 콘솔에서 확인하는 편이 안전합니다.

## 운영 전 체크리스트

- 관리자 계정에 MFA 적용
- 역할 기반 권한(조회·CS·정지·소유자) 분리
- 모든 상태 변경에 관리자 ID, 대상, 이전/이후 값, 시각 기록
- 세션 만료 및 강제 로그아웃 구현
- CORS allowlist와 CSRF 보호 설정
- GitHub Pages 공개 URL 앞에 Cloudflare Access 등의 추가 접근 제어 적용 검토
- `APP_CONFIG.dataMode`가 `api`인지 배포 전 확인
