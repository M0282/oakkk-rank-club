# Supabase Cron 설정

예측을 48시간이 지난 뒤 가능한 한 빠르게 판정하려면 Supabase Cron에서
Vercel의 `/api/cron-refresh`를 한 시간마다 호출합니다.

## 1. Vercel 환경변수 추가

```text
CRON_SECRET=충분히긴무작위문자열
```

환경변수를 추가한 뒤 Vercel에서 Redeploy합니다.

## 2. Supabase Cron 활성화

Supabase 프로젝트에서 다음으로 이동합니다.

```text
Integrations
→ Cron
→ Enable
```

## 3. HTTP 요청 작업 생성

```text
Create job
```

설정 예시:

```text
Name: oakkk-hourly-refresh
Schedule: 0 * * * *
Method: GET
URL: https://본인사이트.vercel.app/api/cron-refresh
```

요청 헤더:

```text
Authorization: Bearer Vercel에_입력한_CRON_SECRET
```

한 시간마다 실행되므로 예측은 48시간이 지난 뒤 통상 1시간 이내에 판정됩니다.
사이트가 열릴 때도 만료된 예측을 추가로 확인합니다.

Cron 설정 없이도 기능은 작동하지만, 아무도 사이트를 열지 않으면 판정 시점이
다음 방문 때까지 늦어집니다.
