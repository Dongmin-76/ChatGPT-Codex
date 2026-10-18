@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 LTS를 먼저 설치하세요: https://nodejs.org/en/download
  pause
  exit /b 1
)
node scripts\launcher.mjs install
if errorlevel 1 echo 설치가 완료되지 않았습니다. 위 오류를 확인한 뒤 다시 실행하세요.
pause
