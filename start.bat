@echo off
echo Starting Express + Next.js example...
start "Express Backend" cmd /k "cd /d %~dp0examples\express-next\backend && pnpm dev"
start "Express Frontend" cmd /k "cd /d %~dp0examples\express-next\frontend && pnpm dev"

echo Starting Flask + Next.js example...
start "Flask Backend" cmd /k "cd /d %~dp0examples\flask-next\backend && pip install -r requirements.txt && python app.py"
start "Flask Frontend" cmd /k "cd /d %~dp0examples\flask-next\frontend && pnpm dev"

echo.
echo All servers starting...
echo.
echo Express Backend:  http://localhost:5000
echo Express Frontend: http://localhost:3000
echo.
echo Flask Backend:    http://localhost:8000
echo Flask Frontend:   http://localhost:3001