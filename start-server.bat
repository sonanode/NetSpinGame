@echo off
cd /d "%~dp0.."
echo.
echo  Open in browser:  http://localhost:3456/web-mini-slot/
echo  Press Ctrl+C to stop.
echo.
npx --yes serve . -p 3456
pause
