@echo off
chcp 65001 >nul
title GhostReply - Auto-Response Bot
color 0B

echo.
echo  +----------------------------------------------------------------+
echo  ^|                  GHOSTREPLY DUAL-MODE AI BOT                   ^|
echo  ^|           Context-Aware Real-Time Auto-Response Engine         ^|
echo  +----------------------------------------------------------------+
echo.

:: --- Check for Node.js ---
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: --- Display Node.js version ---
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js Runtime: %NODE_VER%

:: --- Install dependencies if needed ---
if not exist "node_modules\" (
    echo.
    echo  [SETUP] Installing dependencies... This may take a moment.
    call npm install
    if %ERRORLEVEL% neq 0 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check your internet connection.
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed successfully.
) else (
    echo  [OK] Dependencies verified.
)

:: --- Set port & Auto-Free Port 3000 if occupied ---
if not defined PORT set PORT=3000

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        echo  [INFO] Port %PORT% is currently occupied by PID %%a. Freeing port...
        taskkill /F /PID %%a >nul 2>&1
        timeout /t 1 /nobreak >nul 2>&1
    )
)

echo  [OK] Port %PORT% is ready for GhostReply.
echo.
echo  +----------------------------------------------------------------+
echo  ^|  >> Live Web Studio:  http://localhost:%PORT%                     ^|
echo  ^|  >> Stop Server:      Press Ctrl+C or run stop.bat             ^|
echo  +----------------------------------------------------------------+
echo.

:: --- Open browser after short delay ---
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

:: --- Start GhostReply Server ---
node src/server.js

:: --- Server Shutdown ---
echo.
echo  [STOPPED] GhostReply server has shut down.
echo.
pause
