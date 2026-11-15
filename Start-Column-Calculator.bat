@echo off
setlocal
python --version >nul 2>nul
if errorlevel 1 (
  echo Python is required. Install Python, then follow backend\README.md to install dependencies.
  pause
  exit /b 1
)
start "Structoria Backend" powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -Command "Set-Location -LiteralPath '%~dp0backend'; python app.py"
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
