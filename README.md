# 도화지 운영실

도화지(`dohwaji.app`) 운영자를 위한 정적 관리자 프론트엔드입니다. 별도 빌드 없이 GitHub Pages에 배포할 수 있고, 기본 상태에서는 현실적인 mock data로 모든 화면과 주요 상호작용을 확인할 수 있습니다.

## 포함 화면

- **Dashboard**: DAU, 가입, 지도 생성, 영향 사용자 KPI, 추이 차트, 운영 신호
- **Users**: 이름·이메일·UID 검색, 상태 필터, 사용자 상세, 최근 활동, 관리 작업 진입점
- **Usage**: DAU/MAU, D7 리텐션, 전환율, 이벤트 추이, 퍼널, 이벤트 순위
- **System**: 서비스 상태, 응답 시간, 가동률, 앱 버전, 장애 이력, Sentry 연결 지점
- **Costs**: 월 누적 비용, 예산 소진율, 월말 예측, 공급사별 비용, 사용자당 비용

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

## 운영 API로 전환

[src/config.js](./src/config.js)에서 아래 값을 변경합니다.

```js
export const APP_CONFIG = {
  dataMode: 'api',
  authMode: 'api',
  apiBaseUrl: 'https://api.dohwaji.app',
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
| `src/services/dataService.js` | mock/API 모드 선택과 화면 데이터 조합 |
| `src/data/mockData.js` | 개발·시연용 데이터 |

예상 백엔드 계약은 아래와 같습니다.

```text
GET    /admin/auth/session
POST   /admin/auth/login
POST   /admin/auth/logout

GET    /admin/dashboard
GET    /admin/users?q=
GET    /admin/users/:id
PATCH  /admin/users/:id/status
GET    /admin/usage
GET    /admin/system
GET    /admin/costs

GET    /admin/integrations/posthog?range=7d
GET    /admin/integrations/sentry?range=24h
```

API 응답은 현재 mock data와 같은 형태를 권장합니다. 계약이 달라지면 화면 코드를 바꾸지 말고 `dataService`에서 정규화하세요.

## 관리자 인증 설계

GitHub Pages는 관리자 인증 수단으로 사용하지 않습니다. 운영 모드에서는 다음 구성을 전제로 합니다.

1. 로그인 폼이 `POST /admin/auth/login`을 호출합니다.
2. 백엔드가 `Secure`, `HttpOnly`, `SameSite` 속성을 가진 세션 쿠키를 발급합니다. `admin.dohwaji.app` 같은 동일 사이트 도메인에서는 `Lax`를 우선 검토하고, `github.io` 주소에서 교차 사이트 쿠키가 꼭 필요하면 `SameSite=None; Secure`와 강한 CSRF 방어를 함께 적용합니다.
3. 모든 `/admin/*` 요청은 `credentials: 'include'`로 세션 쿠키를 전송합니다.
4. 백엔드는 매 요청에서 관리자 역할과 권한을 검사하고, 변경 작업은 감사 로그에 남깁니다.
5. `admin.dohwaji.app`만 허용하도록 CORS origin을 제한하고 CSRF 방어를 적용합니다.

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
- mock 모드가 아닌지 배포 전 확인
