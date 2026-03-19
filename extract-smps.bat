@echo off
title Extract SMPs from Word Files
color 0B

echo.
echo  ===========================================
echo   Extract SMPs from Word Documents
echo  ===========================================
echo.
echo  This will:
echo   1. Read all .doc/.docx files in "SMP Folder"
echo   2. Extract SMP data
echo   3. Save as JSON for import
echo.
pause

cd C:\Users\PC\ODM-CMMS

echo.
echo  Extracting SMPs...
node src/utils/extract-word-smps.js "SMP Folder"

echo.
echo  ===========================================
echo   NEXT STEPS:
echo  ===========================================
echo.
echo  If extraction successful:
echo    npm run import:smps "SMP Folder"
echo.
echo  If extraction failed:
echo    1. Open Word files manually
echo    2. Copy text content
echo    3. Paste into text files (.txt)
echo    4. Save in SMP Folder
echo.
pause
