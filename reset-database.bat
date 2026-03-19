@echo off
title ODM-CMMS - Reset Database
color 0C

echo.
echo  ===========================================
echo   ODM-CMMS - Database Reset
echo  ===========================================
echo.
echo  WARNING: This will DELETE all data!
echo.
choice /C YN /N /M "Are you sure you want to continue? (Y/N):"

if %ERRORLEVEL% equ 2 (
    echo  Cancelled.
    pause
    exit /b 0
)

echo.
echo  Reading configuration from .env...

:: Load environment variables
for /f "tokens=*" %%a in (.env) do (
    set %%a
)

echo.
echo  Connecting to MySQL...
echo  Database: %DB_NAME%
echo.

:: Drop and recreate database
mysql -u%DB_USER% -p%DB_PASSWORD% -e "DROP DATABASE IF EXISTS %DB_NAME%; CREATE DATABASE %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Failed to reset database
    echo  Please check your credentials in .env file
    pause
    exit /b 1
)

echo  [OK] Database reset
echo.
echo  Initializing schema and data...

node src/utils/init-db.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo  [OK] Database reset complete!
    echo.
    echo  Default logins restored:
    echo   Admin:    admin / admin123
    echo   Operator: operator1 / operator123
) else (
    echo.
    echo  [ERROR] Failed to initialize database
)

echo.
pause
