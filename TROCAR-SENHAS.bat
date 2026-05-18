@echo off
title VIGIAGRO - Trocar senhas por senhas fortes
cd /d "%~dp0"
set "NODE=%~dp0.tools\node"
set "PATH=%NODE%;%PATH%"

echo Isto vai gerar uma senha FORTE e unica para cada servidor.
echo As senhas antigas (nome+123) deixarao de funcionar.
echo A lista nova fica em: docs\SENHAS-NOVAS.md
echo.
pause

cd /d "%~dp0backend"
"%NODE%\node.exe" scripts\resetPasswords.mjs
echo.
echo Pronto. Abra docs\SENHAS-NOVAS.md para distribuir.
pause
