@echo off
chcp 65001 >nul
title VIGIAGRO - Enviar atualizacao para o GitHub/Render
cd /d "%~dp0"

echo Enviando as ultimas mudancas para o GitHub...
echo (o Render vai reconstruir sozinho ao receber.)
echo.

git add -A
git -c core.autocrlf=false commit -m "Atualizacao" >nul 2>&1

git push origin main

echo.
if errorlevel 1 (
  echo ============================================================
  echo  Nao consegui enviar. Se abrir o navegador pedindo login do
  echo  GitHub, faca o login e rode este arquivo de novo.
  echo ============================================================
) else (
  echo ============================================================
  echo  SUCESSO! Atualizacao enviada.
  echo  O Render vai reconstruir em ~3-5 min (acompanhe em Events).
  echo ============================================================
)
pause
