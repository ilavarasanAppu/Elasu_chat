@echo off
title GhostReply - Auto-Response Bot
color 0A

echo.
echo  ╔════════════════════════════════════════════════════════════════╗
echo  ║              GHOSTREPLY AUTO-RESPONSE BOT                     ║
echo  ║          Intelligent Dual-Mode Context-Aware System           ║
echo  ╚════════════════════════════════════════════════════════════════╝
echo.

:: ─── Check for Node.js ──────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: ─── Display Node.js version ────────────────────────────────────────
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [INFO] Node.js version: %NODE_VER%

:: ─── Install dependencies if needed ─────────────────────────────────
if not exist "node_modules\" (
    echo.
    echo  [SETUP] Installing dependencies... This may take a moment.
    echo.
    call npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check your internet connection.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed successfully.
) else (
    echo  [OK] Dependencies already installed.
)

echo.

:: ─── Set default port ───────────────────────────────────────────────
if not defined PORT set PORT=3000

echo  [START] Launching GhostReply on http://localhost:%PORT%
echo  [INFO]  Press Ctrl+C to stop the server.
echo.

:: ─── Open browser after a short delay ───────────────────────────────
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

:: ─── Start the server ───────────────────────────────────────────────
node src/server.js

:: ─── Server stopped ─────────────────────────────────────────────────
echo.
echo  [STOPPED] GhostReply server has been shut down.
echo.
pause
