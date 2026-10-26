@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instala Node.js LTS para abrir la vista previa.
  echo Despues ejecuta nuevamente este archivo.
  pause
  exit /b 1
)
start "" http://127.0.0.1:4173
node preview.mjs
pause
