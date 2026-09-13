@echo off
title GhostReply - Server Stopper
color 0E

echo.
echo  ╔════════════════════════════════════════════════════════════════╗
echo  ║              GHOSTREPLY SERVER STOPPER                         ║
echo  ║          Clean Shutdown for GhostReply Server                  ║
echo  ╚════════════════════════════════════════════════════════════════╝
echo.

if not defined PORT set PORT=3000

echo  [CHECK] Looking for GhostReply server on port %PORT%...

set KILLED=0

REM Step 1: Request graceful HTTP shutdown if server is listening
curl -s -m 2 -X POST "http://localhost:%PORT%/api/server/stop" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo  [INFO] Graceful shutdown signal sent to GhostReply server.
    timeout /t 1 /nobreak >nul 2>&1
    set KILLED=1
)

REM Step 2: Terminate any process still actively listening on the target port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        echo  [INFO] Found active process on port %PORT% [PID: %%a]. Stopping...
        taskkill /F /PID %%a >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            echo  [OK] Successfully terminated process PID %%a.
            set KILLED=1
        )
    )
)

REM Step 3: Check if port is now free
timeout /t 1 /nobreak >nul 2>&1
set STILL_RUNNING=0
for /f "tokens=5" %%b in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    if not "%%b"=="" set STILL_RUNNING=1
)

echo.
if "%STILL_RUNNING%"=="0" (
    if "%KILLED%"=="1" (
        color 0A
        echo  ╔════════════════════════════════════════════════════════════════╗
        echo  ║  [SUCCESS] GhostReply server stopped successfully!             ║
        echo  ║            Port %PORT% is now completely free.                 ║
        echo  ╚════════════════════════════════════════════════════════════════╝
    ) else (
        color 0B
        echo  [INFO] No active GhostReply server found on port %PORT%.
        echo  [OK] Port %PORT% is already free and ready to use.
    )
) else (
    color 0C
    echo  [WARNING] Port %PORT% still appears to be occupied.
    echo  You may need to run this script as Administrator.
)

echo.
echo  Press any key to close this window...
pause >nul
