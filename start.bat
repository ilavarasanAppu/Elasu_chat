@echo off
REM ============================================================
REM  One-Click GhostReply Background Launcher (start.bat)
REM ============================================================

cd /d "%~dp0"
chcp 65001 >nul

if not defined PORT set PORT=3000

REM 1. Auto-free port if already occupied
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
)

REM 2. Check node dependencies
if not exist "node_modules\" (
    echo [i] Installing dependencies...
    call npm install --silent
)

REM 3. Launch GhostReply in background detached
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'src/server.js' -WindowStyle Hidden"

REM 4. Open browser
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

REM 5. Auto-close Terminal Immediately
exit
