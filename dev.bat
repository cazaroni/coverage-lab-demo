@echo off
REM dev.bat - start the Coverage Lab backend (uvicorn) and frontend (pnpm dev) together on Windows.
REM
REM Usage:
REM   dev.bat              REM backend on :8000, frontend on :3000
REM   set API_PORT=9000 && dev.bat
REM   set WEB_PORT=3001 && dev.bat
REM
REM Prerequisites:
REM   - Python venv at services\api\.venv with projectedge-api installed
REM     (see services\api\README or run: cd services\api && python -m venv .venv && .venv\Scripts\pip install -e .[dev] -e ..\..\packages\analytics)
REM   - pnpm installed and `pnpm install` run at repo root
REM   - apps\web\.env.local exists (copy from apps\web\.env.example and fill Clerk keys,
REM     or set E2E_AUTH_BYPASS=true for local dev without Clerk)

setlocal enabledelayedexpansion

set "REPO_ROOT=%~dp0"
set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set "API_DIR=%REPO_ROOT%\services\api"
set "WEB_DIR=%REPO_ROOT%\apps\web"
set "VENV=%API_DIR%\.venv"

if not defined API_PORT set "API_PORT=8000"
if not defined WEB_PORT set "WEB_PORT=3000"

REM ── Preflight checks ──────────────────────────────────────────────────────────

if not exist "%VENV%\Scripts\uvicorn.exe" (
  echo.
  echo  ERROR: No uvicorn found in %VENV%
  echo.
  echo  Set up the backend venv first:
  echo    cd services\api
  echo    python -m venv .venv
  echo    .venv\Scripts\pip install -e .[dev] -e ..\..\packages\analytics
  echo.
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: pnpm not found on PATH
  exit /b 1
)

if not exist "%WEB_DIR%\.env.local" (
  echo.
  echo  WARN: apps\web\.env.local not found.
  echo  Copy apps\web\.env.example to apps\web\.env.local and fill in values.
  echo  For local dev without Clerk: set E2E_AUTH_BYPASS=true
  echo.
)

REM ── Launch backend and frontend in two separate terminals ─────────────────────
REM (Windows batch doesn't support process substitution like bash, so we'll launch
REM  each in its own terminal window for simplicity and better log separation)

echo.
echo  [dev] Starting backend on :%API_PORT% and frontend on :%WEB_PORT%
echo.
echo  Backend  http://127.0.0.1:%API_PORT%
echo  Frontend http://localhost:%WEB_PORT%
echo.
echo  Press Ctrl+C in each window to stop.
echo.

REM Start backend in a new window
start "Coverage Lab Backend" cmd /k ^
  "cd /d "%API_DIR%" && %VENV%\Scripts\uvicorn.exe app.main:app --reload --port %API_PORT%"

REM Give backend a moment to start
timeout /t 2 /nobreak

REM Start frontend in a new window
start "Coverage Lab Frontend" cmd /k ^
  "cd /d "%WEB_DIR%" && pnpm exec next dev --port %WEB_PORT%"

echo.
echo  Both processes are running in separate windows.
echo.

endlocal
