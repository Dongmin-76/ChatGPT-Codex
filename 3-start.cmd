@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 LTS를 먼저 설치하세요: https://nodejs.org/en/download
  pause
  exit /b 1
)
node scripts\launcher.mjs start
pause
