@echo off
setlocal
cd /d "%~dp0"
title AI Security Evaluation Demo

echo.
echo ========================================
echo   AI Security Evaluation Demo Launcher
echo ========================================
echo.
echo Demo URL: http://127.0.0.1:8080/dashboard
echo Close this window to stop the Demo.
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] pnpm is not available. Please install project dependencies first.
    pause
    exit /b 1
)

start "" powershell -NoProfile -WindowStyle Hidden -File "%~dp0scripts\open-demo.ps1"
call pnpm run start:demo

if errorlevel 1 (
    echo.
    echo [ERROR] Demo failed to start.
    pause
)
endlocal
