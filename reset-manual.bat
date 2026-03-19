@echo off
title ODM-CMMS - Manual Reset
color 0E
cls

echo.
echo  ===========================================
echo   ODM-CMMS - Manual Database Reset
echo  ===========================================
echo.
echo  Since MySQL is not in PATH, follow these steps:
echo.
echo  STEP 1: Open MySQL Command Line Client
echo          (Search "MySQL" in Start Menu)
echo.
echo  STEP 2: Run these commands:
echo.
echo    DROP DATABASE IF EXISTS odm_cmms;
echo    CREATE DATABASE odm_cmms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
echo    USE odm_cmms;
echo    SOURCE database/schema.sql;
echo    EXIT;
echo.
echo  STEP 3: Come back here and press any key
echo.
pause

echo.
echo  [1/3] Updating passwords...
mysql -u root -proot123 odm_cmms -e "UPDATE users SET password_hash = '\$2a\$10\$6r3P1Q6zdTBVD6X1kf99wOqoFjD8ZC7yL6RWx2Myq2E4Xp.F0GLJC' WHERE username IN ('admin', 'operator1', 'operator2');" 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] Could not update via command line
    echo  Please run this in MySQL:
echo.
    echo    USE odm_cmms;
echo    UPDATE users SET password_hash = '\$2a\$10\$6r3P1Q6zdTBVD6X1kf99wOqoFjD8ZC7yL6RWx2Myq2E4Xp.F0GLJC' WHERE username IN ('admin', 'operator1', 'operator2');
echo.
)

echo.
echo  [2/3] Checking for SMP files...
if exist "SMP Folder" (
    echo  Found SMP Folder - Importing...
    node src/utils/batch-import-smps.js "SMP Folder"
) else (
    echo  No SMP Folder found
echo.
    echo  To import SMPs later:
echo    1. Create folder: SMP Folder
echo    2. Add your SMP files
echo    3. Run: npm run import:smps
echo.
)

echo.
echo  [3/3] Done!
echo.
echo  ===========================================
echo   NEXT STEPS:
echo  ===========================================
echo.
echo  1. Run: start-server.bat
echo  2. Open: http://localhost:3000
echo  3. Login: admin / admin123
echo.
pause
