@echo off
setlocal
set "BACKEND_DIR=%~dp0Backend"
if not exist "%BACKEND_DIR%\app.py" set "BACKEND_DIR=%~dp0backend"
set "PYTHON=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON%" set "PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python is required. Install Python and follow backend\README.md to install dependencies.
    pause
    exit /b 1
  )
  set "PYTHON=python"
)
start "Structoria Backend" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Set-Location -LiteralPath '%BACKEND_DIR%'; & '%PYTHON%' app.py"
for /l %%i in (1,1,30) do (
  powershell.exe -NoProfile -Command "try { Invoke-WebRequest 'http://127.0.0.1:5000/api/health' -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 goto ready
  timeout /t 1 /nobreak >nul
)
echo The Structoria backend did not start. Check its PowerShell window and confirm port 5000 is available.
pause
exit /b 1

:ready
start "" "http://127.0.0.1:5000/"
