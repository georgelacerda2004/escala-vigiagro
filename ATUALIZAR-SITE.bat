@echo off
title VIGIAGRO - Atualizar site (rebuild)
cd /d "%~dp0"
set "NODE=%~dp0.tools\node"
set "PATH=%NODE%;%PATH%"

echo Recompilando o site (use apos mudar visual/codigo)...
cd /d "%~dp0frontend"
call "%NODE%\npm.cmd" run build
if errorlevel 1 ( echo FALHA no build. & pause & exit /b 1 )

echo Reiniciando o backend...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
timeout /t 2 /nobreak >nul
cd /d "%~dp0backend"
start "VIGIAGRO Backend" cmd /k ""%NODE%\node.exe" src\server.js"
echo Pronto. Abra http://localhost:4000 (Ctrl+F5 para recarregar).
pause
