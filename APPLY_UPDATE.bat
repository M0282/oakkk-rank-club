@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-update.ps1"
if errorlevel 1 (
  echo.
  echo 적용 중 오류가 발생했습니다.
) else (
  echo.
  echo 적용이 완료되었습니다.
)
pause
