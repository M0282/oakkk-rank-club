# 오크크 랭크 클럽 완성본 적용 안내

## 이번 버전에 포함된 기능

- 등록 플레이어별 솔로랭크 최근 **20경기** 수집 및 카드 표시
- Riot Match-V5 상세 결과를 Supabase `matches`, `match_participants`에 캐시
- 등록된 사람끼리 같은 경기·같은 팀이었던 기록 집계
- 최고 승률 조합, 최저 승률 조합, 전체 조합 순위표
- `01 랭크 보드 / 02 듀오 통계 / 03 커뮤니티` 페이지 분리
- 친구 추가를 커뮤니티 페이지 최하단의 접힌 메뉴로 이동
- 무료 예측 난이도별 정답 보상 `5 / 10 / 15 / 20 오크크`
- 참가 비용과 오답 차감은 계속 0
- Node.js 24 설정 및 공개 npm 레지스트리 기반 `package-lock.json`

## 1. 가장 쉬운 덮어쓰기

이 ZIP은 기존 Git 저장소 바깥에 압축을 풉니다. 압축을 푼 폴더에서 다음 파일을 더블 클릭합니다.

```text
APPLY_UPDATE.bat
```

PowerShell 한 줄로 실행하려면:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\apply-update.ps1
```

기본 대상 경로는 현재 사용 중인 다음 폴더입니다.

```text
C:\Users\우성한\Downloads\oakkk-rank-club\oakkk-rank-club
```

경로가 다르면:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\apply-update.ps1 -Target "C:\다른\프로젝트\경로"
```

스크립트는 `.git`, `.env`, `.env.local`, `node_modules`를 보존하고 소스 파일만 교체한 뒤 `npm install`, `npm test`, `npm run build`까지 검사합니다. 기존 저장소에 커밋하지 않은 변경이 있으면 안전을 위해 중단합니다.

## 2. Supabase 마이그레이션 — 필수

GitHub에 푸시하기 전에 Supabase Dashboard의 **SQL Editor**에서 다음 파일을 열어 전체 실행합니다.

```text
supabase/migration_2026_07_complete.sql
```

이 작업으로 다음이 추가됩니다.

- `predictions.base_score`
- `predictions.offset`
- `predictions.potential_reward`
- `matches`
- `match_participants`
- 난이도별 보상을 지급하는 `resolve_prediction()` 함수

마이그레이션은 `if not exists` 기반으로 작성되어 같은 파일을 실수로 다시 실행해도 데이터 테이블을 삭제하지 않습니다.

## 3. GitHub와 Vercel 반영

기존 프로젝트 폴더에서 Git Bash를 열고 실행합니다.

```bash
git add .
git commit -m "Add 20-match duo stats and prediction rewards"
git pull --rebase origin main
git push origin main
```

Vercel이 GitHub 저장소와 연결되어 있으면 자동으로 새 배포가 시작됩니다.

## 4. 배포 직후 듀오 통계 채우기

기존 DB의 `recent_matches`에는 전체 참가자 정보가 없으므로 최초에는 듀오 통계가 비어 있을 수 있습니다.

- `즉시 갱신` 한 번에 갱신되는 인원: 최대 2명
- 일반 페이지 조회 시 오래된 플레이어 1명씩 순환 갱신
- 각 플레이어의 최초 갱신에서 최근 20경기 상세를 캐시
- 이후에는 이미 저장된 경기 상세를 재사용하므로 API 호출량이 크게 감소

등록 인원이 많다면 `즉시 갱신`을 여러 번 누르되, 한 번의 갱신이 끝난 뒤 다음 갱신을 누릅니다. 화면의 `02 듀오 통계`에서 수집된 플레이어 수와 경기 수를 확인할 수 있습니다.

## 통계 의미

사이트의 ‘듀오’는 공개 Riot API에서 확인 가능한 다음 조건을 의미합니다.

- 솔로/듀오 랭크 `queueId = 420`
- 동일한 `matchId`
- 동일한 `teamId`

Riot API는 실제 사전 구성 파티 여부를 직접 제공하지 않으므로, 우연히 같은 팀으로 매칭된 경기도 포함될 수 있습니다. 화면에도 이 한계를 명시했습니다.
