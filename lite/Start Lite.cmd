@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 is required. Install x64 Node.js and put it on PATH.
  pause
  exit /b 1
)
node lite\start.js %*
set "lite_exit=%ERRORLEVEL%"
if not "%lite_exit%"=="0" pause
exit /b %lite_exit%
