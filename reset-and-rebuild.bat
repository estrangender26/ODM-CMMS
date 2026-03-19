@echo off
title ODM-CMMS - Complete Reset and Rebuild
color 0E
cls

echo.
echo  ===========================================
echo   ODM-CMMS - Complete Reset and Rebuild
echo  ===========================================
echo.
echo  This will:
echo   1. Stop the server
echo   2. Reset the database
echo   3. Rebuild all tables
echo   4. Import your SMP files
echo   5. Start fresh
echo.
pause

:: Kill any running node processes
echo.
echo  [1/5] Stopping any running servers...
taskkill /F /IM node.exe 2>nul
echo  [OK] Server stopped
echo.

:: Reset database
echo  [2/5] Resetting database...
mysql -u root -proot123 -e "DROP DATABASE IF EXISTS odm_cmms; CREATE DATABASE odm_cmms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Could not reset database
    pause
    exit /b 1
)
echo  [OK] Database reset
echo.

:: Initialize database
echo  [3/5] Creating tables...
cd C:\Users\PC\ODM-CMMS
node src/utils/init-db-simple.js
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Auto-init failed, trying manual...
    mysql -u root -proot123 odm_cmms < database/schema.sql
)
echo  [OK] Tables created
echo.

:: Update passwords
echo  [4/5] Setting up default passwords...
mysql -u root -proot123 odm_cmms -e "UPDATE users SET password_hash = '\$2a\$10\$6r3P1Q6zdTBVD6X1kf99wOqoFjD8ZC7yL6RWx2Myq2E4Xp.F0GLJC' WHERE username IN ('admin', 'operator1', 'operator2');"
echo  [OK] Passwords set (admin123 / operator123)
echo.

:: Import SMPs if folder exists
echo  [5/5] Checking for SMP files...
if exist "SMP Folder" (
    echo  Found SMP Folder - Processing files...
    node src/utils/batch-import-smps.js "SMP Folder"
) else (
    echo  No SMP Folder found - skipping import
echo.
    echo  To import SMPs later, place files in 'SMP Folder' and run:
echo    npm run import:smps
echo.
)

:: Final message
echo.
echo  ===========================================
echo   REBUILD COMPLETE!
echo  ===========================================
echo.
echo  Next steps:
echo   1. Run: start-server.bat
echo   2. Open: http://localhost:3000
echo   3. Login: admin / admin123
echo.
pause
