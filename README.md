# 오크크 랭크 클럽 v7

디스코드 친구들의 League of Legends 솔로랭크와 같은 팀 전적을 모아 보는
Vite + React + Vercel + Supabase 프로젝트입니다.

## 핵심 기능

- Riot ID 친구 최대 30명 등록
- 현재 티어·LP·시즌 승패 표시
- 최근 솔로랭크 최대 20경기 표시
- 현재 연승왕·연패왕
- 등록 플레이어끼리 같은 경기·같은 팀 승률
- 최고/최저 듀오 조합과 전체 조합 표
- 랭크/듀오/커뮤니티 3개 탭
- 닉네임 + PIN 로그인과 초대 코드 가입
- 채팅과 활동 포인트
- 하루 1회 무료 예측
- 생성 후 8시간 뒤 판정
- `|score_delta|` 0/20/40/60에 따라 정답 보상 5/10/15/20 오크크
- 참가 및 오답 포인트 차감 없음

## 기존 프로젝트 업데이트

`APPLY_GUIDE.md`를 확인하세요. 가장 간단한 방법은 압축 해제 후 `APPLY_UPDATE.bat` 실행입니다.

## 새 프로젝트 설치

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. GitHub에 업로드
4. Vercel에 Import
5. 환경변수 설정
6. 배포
7. `docs/SUPABASE_CRON.md`를 참고하여 주기 갱신 설정

## 환경변수

| 이름 | 설명 |
|---|---|
| `RIOT_API_KEY` | Riot Developer Portal API Key |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase 서버용 Secret Key |
| `SESSION_SECRET` | 32자 이상의 무작위 문자열 |
| `INVITE_CODE` | 가입 초대 코드 |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `CRON_SECRET` | 주기 갱신 API 인증값 |

## 로컬 검사

```bash
npm install
npm test
npm run build
```

Vercel 서버 함수까지 로컬에서 실행하려면 Vercel CLI의 `vercel dev`를 사용합니다.

## 듀오 통계의 의미

`queueId = 420`, 동일 `matchId`, 동일 `teamId` 조건을 만족한 기록입니다.
Riot API가 실제 사전 구성 파티 여부를 직접 제공하지 않으므로, 사이트에도 ‘같은 팀 기록’이라는 설명을 함께 표시합니다.
