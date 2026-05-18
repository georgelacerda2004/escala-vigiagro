@echo off
title Escala GRU
cd /d "%~dp0"
set "NODE=%~dp0.tools\node"
set "PATH=%NODE%;%PATH%"

echo ============================================
echo   Escala GRU - iniciando o sistema...
echo ============================================
echo.

start "Escala GRU - Backend" cmd /k "cd /d "%~dp0backend" && "%NODE%\node.exe" src\server.js"
start "Escala GRU - Frontend" cmd /k "cd /d "%~dp0frontend" && "%NODE%\node.exe" node_modules\vite\bin\vite.js --host --port 5173"

echo Aguardando os servidores subirem...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173

echo.
echo Pronto! O sistema abriu no navegador: http://localhost:5173
echo Login: admin@escala.local   Senha: admin123
echo.
echo Para PARAR: feche as duas janelas pretas (Backend e Frontend).
echo Esta janela pode ser fechada.
pause
