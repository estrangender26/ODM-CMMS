@echo off
title ODM-CMMS - Setup and Start
color 0A
cls

echo.
echo  ===========================================
echo   ODM-CMMS - Auto Setup and Start
echo  ===========================================
echo.

:: Check Node.js
echo  Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js not installed!
    echo  Download from: https://nodejs.org/
    start https://nodejs.org/
    pause
    exit /b 1
)
echo  [OK] Node.js found
echo.

:: Install dependencies if needed
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo  [ERROR] Install failed
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed
echo.
) else (
    echo  [OK] Dependencies already installed
echo.
)

:: Create .env if needed
if not exist ".env" (
    echo  Creating default configuration...
    (
        echo PORT=3000
        echo HOST=localhost
        echo NODE_ENV=development
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_NAME=odm_cmms
        echo DB_USER=root
        echo DB_PASSWORD=root
        echo JWT_SECRET=local-dev-secret-key
        echo JWT_EXPIRES_IN=24h
    ) > .env
    echo  [OK] Created .env with default password: root
echo.
    echo  IMPORTANT: Edit .env if your MySQL password is different!
echo.
)

:: Test database connection
echo  Testing database connection...
node -e "require('./src/config/database').testConnection().then(ok =^> process.exit(ok ? 0 : 1)).catch(() =^> process.exit(1))" >nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Cannot connect to MySQL
echo.
    echo  Please check:
    echo  1. MySQL is installed and running
echo  2. Edit .env file with correct password
echo  3. Create database manually
echo.
    echo  Default MySQL password in .env is: root
echo.
    choice /C YN /N /M "Continue anyway? (Y/N):"
    if %ERRORLEVEL% equ 2 exit /b 1
echo.
) else (
    echo  [OK] Database connected
echo.
    
    :: Initialize database if needed
    echo  Checking database tables...
    node -e "const mysql = require('mysql2/promise'); mysql.createConnection({host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || 'root', database: process.env.DB_NAME || 'odm_cmms'}).then(c =^> c.execute('SELECT 1 FROM users LIMIT 1').then(() =^> { console.log('Database ready'); process.exit(0); }).catch(() =^> { console.log('Need to initialize'); process.exit(1); })).catch(() =^> process.exit(1))" >nul 2>&1
    
    if %ERRORLEVEL% neq 0 (
        echo  Initializing database...
        node src/utils/init-db.js
        if %ERRORLEVEL% equ 0 (
            echo  [OK] Database initialized
echo.
        ) else (
            echo  [WARNING] Database init may have failed
echo.
        )
    ) else (
        echo  [OK] Database already initialized
echo.
    )
)

:: Start server
echo  ===========================================
echo   Starting Server...
echo  ===========================================
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
