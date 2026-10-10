@echo off
title Apex College Library Management System
color 0b

echo =============================================================
echo   Apex College Library Management System (Next-Gen LMS)
echo =============================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (v18 or higher) from https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists, install if missing
if not exist node_modules (
    echo [INFO] Installing required dependencies...
    call npm install
)

:: Check if database exists, seed if missing
if not exist data\library.db (
    echo [INFO] Initializing and seeding database with sample library data...
    call node database\seed.js
)

echo [INFO] Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo [INFO] Starting LMS Server...
echo.
node server.js

pause
