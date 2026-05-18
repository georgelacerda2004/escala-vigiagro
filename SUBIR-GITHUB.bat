@echo off
chcp 65001 >nul
title VIGIAGRO - Subir codigo para o GitHub
cd /d "%~dp0"

echo ============================================================
echo   PASSO 2 - Enviar o codigo para o GitHub
echo ============================================================
echo.
echo  Antes de continuar, voce precisa ter:
echo   1) Uma conta no github.com
echo   2) Um repositorio NOVO e VAZIO criado (sem README)
echo   3) O endereco dele, parecido com:
echo      https://github.com/SEU_USUARIO/escala-vigiagro.git
echo.
set /p REPO=Cole aqui o endereco do repositorio e tecle ENTER:

if "%REPO%"=="" (
  echo Nenhum endereco informado. Saindo.
  pause & exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERRO: git nao encontrado. Avise o suporte.
  pause & exit /b 1
)

echo.
echo Configurando o repositorio...
git remote remove origin >nul 2>&1
git remote add origin %REPO%
git branch -M main
git add -A
git -c core.autocrlf=false commit -m "Atualizacao" >nul 2>&1

echo.
echo Enviando... (vai abrir o navegador para voce ENTRAR no GitHub
echo e clicar em AUTORIZAR. Faca o login e volte aqui.)
echo.
git push -u origin main

echo.
if errorlevel 1 (
  echo ============================================================
  echo  Algo deu errado no envio. Possiveis causas:
  echo   - O repositorio nao estava vazio (recrie sem README)
  echo   - Login do GitHub nao concluido
  echo  Tente rodar este arquivo novamente.
  echo ============================================================
) else (
  echo ============================================================
  echo  SUCESSO! O codigo esta no GitHub.
  echo  Volte para o chat e diga: "Passo 2 ok"
  echo ============================================================
)
pause
