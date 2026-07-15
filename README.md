# 오크크 랭크 클럽

디스코드 친구들의 League of Legends 솔로 랭크와 같은 팀 전적을 모아 보는
Vite + React + Vercel + Supabase 프로젝트입니다.

## 포함 기능

- 사이트에서 `게임이름#태그` 입력 후 친구 추가
- 등록 친구 최대 30명
- 현재 솔로 랭크·LP·시즌 승패
- 등록 플레이어별 최근 솔로랭크 최대 20경기 표시
- 최근 경기 기준 현재 연승왕·연패왕 자동 선정
- 최근 경기 상세를 Supabase에 캐시하여 Riot API 중복 호출 감소
- 등록 플레이어끼리 같은 경기·같은 팀이었던 승률 집계
- 최고/최저 같은 팀 승률과 전체 조합 순위표
- `01 랭크 보드 / 02 듀오 통계 / 03 커뮤니티` 페이지 구성
- 사이트 닉네임 + PIN 로그인
- 초대 코드 기반 가입
- 커뮤니티 채팅과 관리자 삭제 기능
- 오크크 활동 포인트
- 하루 1회, 48시간 뒤 랭크 상태 무료 예측
- 난이도별 정답 보상 5/10/15/20 오크크
- 예측 참가 비용과 오답 차감 없음
- 오크크 구매·판매·양도·환전 기능 없음

## 구조

```text
브라우저
  └─ Vercel React 사이트
       └─ /api Vercel Functions
            ├─ Riot API
            └─ Supabase PostgreSQL
                 ├─ players
                 ├─ matches
                 ├─ match_participants
                 └─ predictions
```

Riot API 키와 Supabase Secret Key는 브라우저 코드에 포함되지 않습니다.

## 기존 프로젝트 업데이트

`APPLY_GUIDE.md`를 먼저 읽으세요. 핵심 순서는 다음과 같습니다.

1. 압축 해제 폴더에서 `APPLY_UPDATE.bat` 실행
2. Supabase SQL Editor에서 `supabase/migration_2026_07_complete.sql` 실행
3. Git commit/pull/push
4. Vercel 자동 배포 확인

## 새 프로젝트 설치

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. GitHub에 프로젝트 업로드
4. Vercel에 저장소 Import
5. Vercel 환경변수 설정
6. Deploy
7. `docs/SUPABASE_CRON.md`에 따라 주기 갱신 설정

## Vercel 환경변수

| 이름 | 설명 |
|---|---|
| `RIOT_API_KEY` | Riot Developer API 키 |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase 서버용 Secret Key |
| `SESSION_SECRET` | 32자 이상의 무작위 문자열 |
| `INVITE_CODE` | 친구에게 공유할 가입 코드 |
| `ADMIN_PASSWORD` | 친구·채팅 삭제에 사용할 관리자 비밀번호 |
| `CRON_SECRET` | 주기 갱신 API 인증용 비밀값 |

구형 Supabase 프로젝트의 경우 `SUPABASE_SERVICE_ROLE_KEY`도 지원합니다.

## 로컬 실행

Node.js 24가 필요합니다.

```bash
npm install
npm run dev
```

전체 `/api` 기능을 로컬에서 시험하려면 Vercel CLI의 `vercel dev`를 사용하세요.

## 듀오 통계의 의미

공개 Riot API에서 `queueId = 420`, 동일한 `matchId`, 동일한 `teamId`로 확인된
기록을 집계합니다. API가 실제 사전 구성 파티 여부를 직접 제공하지 않으므로,
우연히 같은 팀으로 매칭된 경기까지 포함될 수 있습니다.
