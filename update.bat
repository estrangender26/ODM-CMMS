@echo off
title ODM-CMMS - Update
color 0E

echo.
echo  ===========================================
echo   ODM-CMMS - Update
echo  ===========================================
echo.

:: Check if git repo
if exist ".git" (
    echo  Pulling latest changes...
    git pull
    if %ERRORLEVEL% neq 0 (
        echo  [WARNING] Git pull failed, continuing anyway...
    )
)

echo.
echo  Updating dependencies...
call npm update

if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Update failed
    pause
    exit /b 1
)

echo.
echo  [OK] Update complete!
echo.
pause
