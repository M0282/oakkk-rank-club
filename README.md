# 오크크 랭크 클럽

디스코드 친구들의 League of Legends 솔로 랭크를 모아 보는
Vite + React + Vercel + Supabase 프로젝트입니다.

## 포함 기능

- 사이트에서 `게임이름#태그` 입력 후 친구 추가
- 등록 친구 최대 30명
- 현재 솔로 랭크·LP·시즌 승패
- 최근 솔로 랭크 3경기 승률을 작은 카드로 표시
- 최근 5경기 범위에서 현재 연승왕·연패왕 자동 선정
- 사이트 닉네임 + PIN 로그인
- 디스코드 초대 코드 기반 가입
- 100자 커뮤니티 채팅과 10초 작성 제한
- 관리자 친구 삭제·채팅 삭제
- 오크크 활동 포인트
- 하루 1회, 48시간 뒤 랭크 상태 무료 예측
- 예측 참가 비용 없음
- 오답 시 오크크 차감 없음
- 정답 시 고정 보상 10 오크크
- 오크크 구매·판매·양도·환전 기능 없음
- 블록체인·암호화폐 기능 없음

## 중요 구조

```text
브라우저
  └─ Vercel React 사이트
       └─ /api Vercel Functions
            ├─ Riot API
            └─ Supabase PostgreSQL
```

Riot API 키와 Supabase Secret Key는 브라우저 코드에 포함되지 않습니다.

## 설치 순서

자세한 화면별 순서는 `docs/DEPLOY.md`를 확인하세요.

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 전체 실행
3. GitHub에 프로젝트 업로드
4. Vercel에 저장소 Import
5. Vercel 환경변수 설정
6. Deploy 또는 Redeploy
7. 정확한 예측 판정을 위해 `docs/SUPABASE_CRON.md` 설정

## Vercel 환경변수

| 이름 | 설명 |
|---|---|
| `RIOT_API_KEY` | Riot Developer API 키 |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SECRET_KEY` | Supabase 서버용 Secret Key |
| `SESSION_SECRET` | 32자 이상의 무작위 문자열 |
| `INVITE_CODE` | 디스코드 친구에게 공유할 가입 코드 |
| `ADMIN_PASSWORD` | 친구·채팅 삭제에 사용할 관리자 비밀번호 |
| `CRON_SECRET` | Supabase Cron이 갱신 API를 호출할 때 사용하는 비밀값 |

구형 Supabase 프로젝트의 경우 `SUPABASE_SERVICE_ROLE_KEY`도 지원합니다.

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

Vite 개발 서버만으로는 `/api` 서버 함수가 실행되지 않습니다. 전체 기능을 로컬에서
시험하려면 Vercel CLI의 `vercel dev`를 사용하세요.

## 예측 규칙

- 한국 시간 기준 하루 1회
- 등록 시점으로부터 48시간 뒤 판정
- 참가 비용 0
- 정답 보상 10 오크크
- 오답 손실 0
- 이용자 간 전송 불가
- 구매·판매·현금·상품 교환 불가

티어 승급 시 LP가 다시 낮아지는 문제를 피하기 위해 서버 내부에서만 공식 티어,
단계, LP를 연속 비교값으로 변환합니다. 화면에는 공식 티어와 LP 형식으로만
표시하며 별도의 MMR이나 ELO를 계산하지 않습니다.
