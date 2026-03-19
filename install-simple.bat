@echo off
title ODM-CMMS Installer - SIMPLE MODE
color 0B
cls

echo.
echo  ===========================================
echo   ODM-CMMS - Simple Installer
echo  ===========================================
echo.

:: Check Node.js
echo  [1/5] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not found!
    echo  Please install from: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo  [OK] Node.js found
echo.

:: Check npm
echo  [2/5] Checking npm...
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm not found!
    pause
    exit /b 1
)
npm --version
echo  [OK] npm found
echo.

:: Check MySQL (optional - warn but continue)
echo  [3/5] Checking MySQL...
mysql --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] MySQL command not found in PATH
    echo  Make sure MySQL is installed and running
    echo.
    echo  Default MySQL location:
    echo  C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    pause
) else (
    echo  [OK] MySQL found
)
echo.

:: Install dependencies
echo  [4/5] Installing dependencies...
if exist "node_modules" (
    echo  Dependencies already installed, skipping...
) else (
    echo  This may take 2-5 minutes...
    echo  Please wait...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)
echo  [OK] Dependencies ready
echo.

:: Create .env file
echo  [5/5] Creating configuration...
if exist ".env" (
    echo  Configuration already exists, skipping...
) else (
    echo.
    echo  -------------------------------------------
    echo  Database Configuration
    echo  -------------------------------------------
    echo.
    set /p DB_PASS="Enter MySQL root password: "
    if "!DB_PASS!"=="" set DB_PASS=root
    
    (
        echo # Server
        echo PORT=3000
        echo HOST=localhost
        echo NODE_ENV=development
        echo.
        echo # Database
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=odm_cmms
        echo DB_USER=root
        echo DB_PASSWORD=%DB_PASS%
        echo.
        echo # Security
        echo JWT_SECRET=change-this-in-production-12345
        echo JWT_EXPIRES_IN=24h
    ) > .env
    
    echo  [OK] Configuration saved
echo.

:: Done
echo.
echo  ===========================================
echo   Installation Complete!
echo  ===========================================
echo.
echo  Next steps:
echo  1. Make sure MySQL is running
.echo  2. Run: npm run db:init
echo  3. Run: start-server.bat
echo.
echo  Or run setup-and-start.bat to do it all
echo.
pause
