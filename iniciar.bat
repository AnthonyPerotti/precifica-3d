@echo off
setlocal enabledelayedexpansion
title Precifica 3D

cd /d "%~dp0"

echo =======================================================
echo          Iniciando Precifica 3D - Porta 5172
echo =======================================================
echo.

:: 1. Verificar instalacao do Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado no sistema.
    echo Por favor, instale o Node.js v20+ ou execute via Docker:
    echo docker compose up -d
    pause
    exit /b 1
)

:: 2. Instalar dependencias do servidor se necessario
if not exist "server\node_modules" (
    echo [INFO] Instalando dependencias do servidor...
    cd server
    call npm install
    cd ..
)

:: 3. Verificar build do frontend
if not exist "client\dist\index.html" (
    echo [INFO] Compilando frontend Vite pela primeira vez...
    if not exist "client\node_modules" (
        cd client
        call npm install
        cd ..
    )
    cd client
    call npm run build
    cd ..
)

:: 4. Garantir pastas de dados
if not exist "data" mkdir data
if not exist "data\uploads" mkdir data\uploads

:: 5. Iniciar servidor e abrir navegador
echo.
echo [INFO] Servidor iniciando em http://localhost:5172 ...
echo [INFO] Pressione Ctrl+C nesta janela para encerrar.
echo.

:: Abrir navegador apos 2 segundos
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5172"

:: Executar servidor Node
node server/src/index.js

pause
