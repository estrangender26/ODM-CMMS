@echo off
title ODM-CMMS Server
color 0A

echo.
echo  ===========================================
echo   ODM-CMMS Server
echo  ===========================================
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo  [ERROR] Dependencies not found!
    echo  Please run install-windows.bat first
    pause
    exit /b 1
)

:: Check if .env exists
if not exist ".env" (
    echo  [ERROR] Configuration not found!
    echo  Please run install-windows.bat first
    pause
    exit /b 1
)

:: Check if MySQL is running
echo  Checking MySQL connection...
node -e "require('./src/config/database').testConnection().then(ok => process.exit(ok ? 0 : 1))" >nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Could not connect to MySQL
    echo  Please ensure MySQL service is running:
    echo.
    echo  1. Press Win + R
echo  2. Type: services.msc
echo  3. Find 'MySQL80' and click Start
echo.
    choice /C YN /N /M "Continue anyway? (Y/N):"
    if %ERRORLEVEL% equ 2 exit /b 1
)

echo.
echo  Starting server...
echo.
echo  URL: http://localhost:3000
echo.
echo  Default logins:
echo   Admin:    admin / admin123
echo   Operator: operator1 / operator123
echo.
echo  Press Ctrl+C to stop
echo.
echo  ===========================================
echo.

npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Server failed to start
    echo  Trying production mode...
    npm start
)

pause
