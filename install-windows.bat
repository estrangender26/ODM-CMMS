@echo off
setlocal EnableDelayedExpansion

title ODM-CMMS Windows Installer
color 0B

:: ============================================
:: ODM-CMMS Windows Installer Script
:: ============================================

call :printHeader

echo.
echo  This script will:
echo   1. Check for Node.js and MySQL
echo   2. Install project dependencies
echo   3. Setup the database
echo   4. Configure environment variables
echo   5. Start the server
echo.
pause

:: ============================================
:: Step 1: Check Prerequisites
:: ============================================
call :printStep "Step 1: Checking Prerequisites"

:: Check Node.js
call :checkNodeJS
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Node.js is required but not installed.
    echo  Please download and install Node.js 18+ from:
    echo  https://nodejs.org/
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

:: Check npm
call :checkNPM
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)

echo  [OK] Node.js %NODE_VERSION% found
echo  [OK] npm %NPM_VERSION% found

:: Check MySQL
call :checkMySQL
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] MySQL command not found in PATH.
    echo.
    echo  Please ensure MySQL is installed and added to PATH:
    echo  Default location: C:\Program Files\MySQL\MySQL Server 8.0\bin
    echo.
    echo  Would you like to:
    echo   1. Continue anyway (if MySQL is installed but not in PATH)
    echo   2. Download MySQL
    echo   3. Exit
    choice /C 123 /N /M "Select option:"
    
    if %ERRORLEVEL% equ 2 (
        start https://dev.mysql.com/downloads/installer/
        exit /b 1
    )
    if %ERRORLEVEL% equ 3 (
        exit /b 1
    )
)

:: ============================================
:: Step 2: Install Dependencies
:: ============================================
call :printStep "Step 2: Installing Dependencies"

if not exist "node_modules" (
    echo  Installing npm packages... (this may take a few minutes)
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed
) else (
    echo  [OK] Dependencies already installed
)

:: ============================================
:: Step 3: Configure Environment
:: ============================================
call :printStep "Step 3: Configuring Environment"

if not exist ".env" (
    echo  Creating .env file...
    
    set /p DB_PASS="Enter MySQL root password [default: root]: "
    if "!DB_PASS!"=="" set DB_PASS=root
    
    set /p DB_NAME="Enter database name [default: odm_cmms]: "
    if "!DB_NAME!"=="" set DB_NAME=odm_cmms
    
    set /p JWT_SECRET="Enter JWT secret (or press Enter for random): "
    if "!JWT_SECRET!"=="" (
        for /f "tokens=*" %%a in ('powershell -Command "-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | %% {[char]$_})"') do set JWT_SECRET=%%a
    )
    
    (
        echo # Server Configuration
        echo PORT=3000
        echo HOST=localhost
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=!DB_NAME!
        echo DB_USER=root
        echo DB_PASSWORD=!DB_PASS!
        echo DB_CONNECTION_LIMIT=10
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=!JWT_SECRET!
        echo JWT_EXPIRES_IN=24h
        echo.
        echo # File Upload Configuration
        echo UPLOAD_MAX_SIZE=10485760
        echo UPLOAD_DIR=uploads
    ) > .env
    
    echo  [OK] .env file created
    echo.
    echo  Configuration saved:
    echo   - Database: !DB_NAME!
    echo   - Port: 3000
    echo.
) else (
    echo  [OK] .env file already exists
)

:: ============================================
:: Step 4: Setup Database
:: ============================================
call :printStep "Step 4: Setting up Database"

echo  Creating database and tables...
echo.

:: Try to run database initialization
node src/utils/init-db.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Automatic database setup failed.
    echo.
    echo  Please manually create the database:
    echo.
    echo  1. Open MySQL Command Line Client
    echo  2. Run these commands:
    echo.
    echo    CREATE DATABASE odm_cmms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    echo    USE odm_cmms;
    echo    SOURCE database/schema.sql;
    echo.
    echo  Press any key to continue anyway...
    pause >nul
) else (
    echo  [OK] Database setup complete
)

:: ============================================
:: Step 5: Start Server
:: ============================================
call :printStep "Step 5: Starting Server"

echo.
echo  ===========================================
echo   Setup Complete!
echo  ===========================================
echo.
echo   Starting server...
echo.
echo   The application will be available at:
echo   http://localhost:3000
echo.
echo   Default logins:
echo    Admin:    admin / admin123
echo    Operator: operator1 / operator123
echo.
echo   Press Ctrl+C to stop the server
echo.
echo  ===========================================
echo.

:: Start the server
npm run dev

:: If npm run dev fails, try npm start
if %ERRORLEVEL% neq 0 (
    echo  Trying alternative start method...
    npm start
)

pause
exit /b 0

:: ============================================
:: Functions
:: ============================================

:printHeader
cls
echo.
echo  ===========================================
echo   ODM-CMMS - Windows Installer
echo  ===========================================
echo.
goto :eof

:printStep
echo.
echo  -------------------------------------------
echo   %~1
echo  -------------------------------------------
echo.
goto :eof

:checkNodeJS
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 exit /b 1
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
goto :eof

:checkNPM
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 exit /b 1
for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
goto :eof

:checkMySQL
mysql --version >nul 2>&1
if %ERRORLEVEL% neq 0 exit /b 1
goto :eof
