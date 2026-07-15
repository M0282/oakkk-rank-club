param(
  [string]$Target = "$HOME\Downloads\oakkk-rank-club\oakkk-rank-club",
  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$Target = [System.IO.Path]::GetFullPath($Target)
$Source = [System.IO.Path]::GetFullPath($Source)

if ($Source -eq $Target) {
  throw "압축을 기존 프로젝트 폴더 밖에 풀고 실행해 주세요. 원본과 대상 경로가 같습니다."
}

if (-not (Test-Path (Join-Path $Target ".git"))) {
  throw "대상 폴더에서 .git을 찾지 못했습니다: $Target"
}

Push-Location $Target
try {
  $dirty = git status --porcelain
  if ($dirty -and -not $AllowDirty) {
    throw "기존 프로젝트에 커밋하지 않은 변경이 있습니다. 먼저 커밋하거나, 변경을 덮어써도 된다면 -AllowDirty 옵션으로 다시 실행하세요."
  }
} finally {
  Pop-Location
}

Write-Host "[1/6] 기존 .git과 로컬 환경변수를 유지합니다." -ForegroundColor Cyan

$replaceDirectories = @("src", "api", "lib", "shared", "scripts", "supabase", "docs")
foreach ($directory in $replaceDirectories) {
  $path = Join-Path $Target $directory
  if (Test-Path $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
  }
}

$skipNames = @(".git", "node_modules", "dist", ".env", ".env.local", ".env.production")
$items = Get-ChildItem -LiteralPath $Source -Force | Where-Object {
  $_.Name -notin $skipNames
}

foreach ($item in $items) {
  Copy-Item -LiteralPath $item.FullName -Destination $Target -Recurse -Force
}

Set-Location $Target

Write-Host "[2/6] 내부 전용 npm 주소가 없는지 검사합니다." -ForegroundColor Cyan
if (Select-String -Path ".\package-lock.json" -Pattern "applied-caas|internal.api.openai" -Quiet) {
  throw "package-lock.json에 내부 전용 레지스트리 주소가 남아 있습니다."
}

Write-Host "[3/6] 의존성을 설치합니다." -ForegroundColor Cyan
npm install --registry=https://registry.npmjs.org/ --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm install에 실패했습니다." }

Write-Host "[4/6] 핵심 로직 테스트를 실행합니다." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { throw "npm test에 실패했습니다." }

Write-Host "[5/6] 프로덕션 빌드를 검사합니다." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build에 실패했습니다." }

Write-Host "[6/6] 소스 덮어쓰기와 검증이 완료되었습니다." -ForegroundColor Green
Write-Host ""
Write-Host "중요: GitHub에 올리기 전에 Supabase SQL Editor에서 아래 파일을 전체 실행하세요." -ForegroundColor Yellow
Write-Host "  supabase\migration_2026_07_complete.sql"
Write-Host ""
Write-Host "SQL 실행 후 Git Bash에서:" -ForegroundColor Yellow
Write-Host '  git add .'
Write-Host '  git commit -m "Add 20-match duo stats and prediction rewards"'
Write-Host '  git pull --rebase origin main'
Write-Host '  git push origin main'
