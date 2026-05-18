@echo off
title VIGIAGRO - Publicar na Web (tunel Cloudflare)
cd /d "%~dp0"
set "NODE=%~dp0.tools\node"
set "PATH=%NODE%;%PATH%"
set "CF=%~dp0.tools\cloudflared.exe"

echo ============================================================
echo   VIGIAGRO - Escala de Plantoes  ^|  Publicar na internet
echo ============================================================
echo.
echo  SEGURANCA: as senhas padrao sao previsiveis (nome + 123).
echo  Recomenda-se rodar TROCAR-SENHAS.bat ANTES de divulgar a URL.
echo  Mantenha este PC ligado enquanto os colegas usarem.
echo.
pause

echo.
echo [1/4] Baixando cloudflared (so na primeira vez)...
if not exist "%CF%" (
  curl -L --fail -o "%CF%" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  if errorlevel 1 (
     echo  ERRO ao baixar. Verifique a internet e tente de novo.
     pause & exit /b 1
  )
)

echo [2/4] Reiniciando o backend (porta 4000)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4000 .*LISTENING"') do taskkill /F /PID %%p >nul 2>&1
timeout /t 2 /nobreak >nul
start "VIGIAGRO Backend" cmd /k "cd /d "%~dp0backend" && "%NODE%\node.exe" src\server.js"

echo [3/4] Aguardando o servidor subir...
timeout /t 9 /nobreak >nul

echo [4/4] Abrindo o tunel publico...
echo.
echo ============================================================
echo   PROCURE ABAIXO a linha parecida com:
echo     https://algumacoisa.trycloudflare.com
echo   ESSE e o endereco. Envie aos colegas (funciona no celular).
echo   Para PARAR: feche esta janela e a janela "VIGIAGRO Backend".
echo ============================================================
echo.
"%CF%" tunnel --url http://localhost:4000
pause
