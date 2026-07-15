# 오크크 랭크 클럽 v7 적용 안내

이 패키지는 기존 Git 저장소의 `.git`과 로컬 환경변수를 유지하면서 소스만 교체합니다.
적용 전에 현재 프로젝트를 ZIP으로 자동 백업하고, 설치·테스트·빌드까지 실행합니다.

## 포함 기능

- 최근 솔로랭크 최대 20경기 수집 및 표시
- 등록 플레이어끼리 같은 `matchId`·같은 `teamId`였던 경기 집계
- 최고/최저 같은 팀 승률과 전체 조합 표
- `01 랭크 보드 / 02 듀오 통계 / 03 커뮤니티` 탭
- 친구 추가 메뉴를 커뮤니티 페이지 최하단의 접힌 영역으로 이동
- 예측 판정 시간 8시간
- 점수 변동폭 절대값에 따른 보상
  - `0`: 5 오크크
  - `±20`: 10 오크크
  - `±40`: 15 오크크
  - `±60`: 20 오크크
- 참가 비용 0, 오답 차감 0
- PostgreSQL 예약어 대신 `score_delta` 컬럼 사용

## 1. 가장 간단한 적용

압축을 Downloads에 푼 뒤, 압축 해제 폴더 안의 다음 파일을 더블 클릭합니다.

```text
APPLY_UPDATE.bat
```

기본 대상 경로:

```text
C:\Users\우성한\Downloads\oakkk-rank-club\oakkk-rank-club
```

경로가 다르면 PowerShell에서 다음처럼 실행합니다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& .\apply-update.ps1 -Target "C:\실제\프로젝트\경로"
```

스크립트가 수행하는 작업:

1. 기존 프로젝트를 `oakkk-backups` 폴더에 ZIP으로 백업
2. 소스 파일 교체
3. 공개 npm 레지스트리 확인
4. `npm install`
5. `npm test`
6. `npm run build`
7. 실행할 Supabase SQL을 클립보드에 복사

마지막에 `UPDATE APPLIED AND VERIFIED.`가 표시되어야 합니다.

## 2. Supabase SQL 실행

스크립트가 끝나면 SQL이 클립보드에 복사되어 있습니다.

1. Supabase Dashboard → SQL Editor
2. New query
3. `Ctrl+V`
4. Run

정상 결과:

```text
Success. No rows returned
```

직접 파일을 열 경우 다음 파일 하나만 사용합니다.

```text
RUN_THIS_IN_SUPABASE.sql
```

이 SQL은 통합 마이그레이션입니다. 별도의 예측 패치 SQL을 추가로 실행하지 않습니다.

## 3. GitHub 업로드

원래 프로젝트 폴더에서 실행합니다.

```powershell
cd "$HOME\Downloads\oakkk-rank-club\oakkk-rank-club"
git add .
git commit -m "Complete duo stats and 8-hour prediction update"
git pull --rebase origin main
git push origin main
```

Vercel이 GitHub와 연결되어 있으면 자동 배포가 시작됩니다.

## 4. 배포 후 확인

- Vercel 배포 상태가 `Ready`
- 랭크 보드에 최대 20경기 결과 표시
- 듀오 통계 탭 존재
- 커뮤니티 하단에 친구 추가 메뉴 존재
- 예측 화면에 8시간 판정과 5/10/15/20 보상 표시

기존 DB에는 경기 참가자 캐시가 없으므로 듀오 통계가 처음에는 비어 있을 수 있습니다.
`즉시 갱신`을 누르면 오래된 플레이어부터 최근 경기 상세가 순차적으로 저장됩니다.

## 통계 표현의 한계

Riot Match API로 확인 가능한 것은 두 플레이어가 같은 솔로랭크 경기에서 같은 팀이었다는 사실입니다.
실제 사전 구성 파티 여부는 직접 제공되지 않으므로 우연히 같은 팀으로 잡힌 경기도 포함될 수 있습니다.
