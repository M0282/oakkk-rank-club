# 배포 안내

## 1. Supabase 생성

1. Supabase에 로그인합니다.
2. `New project`를 선택합니다.
3. 프로젝트 이름과 데이터베이스 비밀번호를 정합니다.
4. 프로젝트 생성이 끝나면 왼쪽의 `SQL Editor`를 엽니다.
5. 이 프로젝트의 `supabase/schema.sql` 내용을 전부 붙여넣고 실행합니다.

정상 실행되면 아래 테이블이 생성됩니다.

- `users`
- `players`
- `chat_messages`
- `predictions`

초기 친구 두 명도 `players`에 자동 등록됩니다.

## 2. Supabase 환경변수 확인

Supabase 프로젝트에서 `Connect` 또는 `Settings > API Keys`를 엽니다.

```text
SUPABASE_URL=https://프로젝트ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

구형 프로젝트에서 Secret Key가 보이지 않으면 Legacy `service_role` 값을
`SUPABASE_SERVICE_ROLE_KEY`라는 이름으로 사용할 수 있습니다.

Secret/service_role 키는 GitHub, 채팅, 브라우저 코드에 올리면 안 됩니다.

## 3. GitHub 업로드

새 저장소를 만들고 이 프로젝트의 파일을 올립니다. 저장소 첫 화면에서
`api`, `src`, `lib`, `supabase`, `package.json`이 바로 보여야 합니다.

## 4. Vercel Import

1. Vercel에서 `Add New > Project`
2. GitHub 저장소 선택
3. Framework Preset `Vite`
4. Root Directory `./`
5. Environment Variables 입력
6. Deploy

## 5. 필요한 환경변수

```text
RIOT_API_KEY=RGAPI-...
SUPABASE_URL=https://프로젝트ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SESSION_SECRET=32자이상의무작위문자열
INVITE_CODE=친구가입용코드
ADMIN_PASSWORD=관리자비밀번호
CRON_SECRET=별도의긴무작위문자열
```

PowerShell에서 SESSION_SECRET 만들기:

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})
```

## 6. 환경변수 변경 후

```text
Deployments
→ 최신 배포 오른쪽 점 세 개
→ Redeploy
```

## 7. 사용법

### 가입
사이트의 `로그인` 버튼에서 `가입` 탭을 선택하고 닉네임, PIN,
Vercel의 `INVITE_CODE`와 같은 초대 코드를 입력합니다.
신규 가입자는 오크크 50개로 시작합니다.

### 친구 추가
로그인 후 `게임이름#태그` 형식으로 입력합니다.

```text
아샷추만마셔요#KR1
```

### 관리자 모드
`관리자 모드` 버튼을 누르고 Vercel의 `ADMIN_PASSWORD`를 입력합니다.
친구 카드와 채팅 메시지의 삭제 버튼이 표시됩니다.

### 예측
- 하루 1회
- 48시간 뒤 자동 판정
- 정답이면 난이도에 따라 5~20 오크크
- 참가 비용과 오답 차감 없음
- 기한이 지난 예측은 사이트가 다시 열릴 때 판정

## 8. 데이터 갱신

- 화면은 1분마다 다시 요청합니다.
- Riot 데이터는 5분 이상 오래됐을 때 갱신합니다.
- 한 번의 요청에서 일부 친구만 갱신해 호출이 몰리지 않게 합니다.
- `즉시 갱신`은 한 번에 최대 6명의 오래된 데이터를 갱신합니다.
- 기존 경기 상세는 DB에서 재사용하고 새 경기만 Riot API에서 가져옵니다.


## 9. 한 시간 단위 자동 판정

`docs/SUPABASE_CRON.md` 안내에 따라 Supabase Cron을 설정하면 예측 만료 후 통상 1시간 이내에 판정됩니다.
