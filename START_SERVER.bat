@echo off
title Team Task Manager Server
color 1F
echo.
echo  ============================================
echo    Team Task Manager - Starting Server...
echo  ============================================
echo.

cd /d "%~dp0"
node server.js

echo.
echo  Server stopped. Press any key to exit.
pause >nul
