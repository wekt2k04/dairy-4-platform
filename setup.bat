@echo off
REM Dairy 4.0 Platform – Bootstrap Installer (Windows)

echo 🚜 Dairy 4.0 Platform – Bootstrap Installer
echo ==========================================
echo.

REM Backend setup
echo 📦 Setting up backend...
cd backend

if not exist "venv" (
  python -m venv venv
  echo ✓ Virtual environment created
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt
echo ✓ Backend dependencies installed

cd ..

REM Frontend setup
echo.
echo 📦 Setting up frontend...
cd frontend

if not exist "node_modules" (
  call npm install -q
  echo ✓ Frontend dependencies installed
) else (
  echo ✓ Frontend dependencies already present
)

cd ..

echo.
echo ==========================================
echo ✅ Bootstrap complete!
echo.
echo Next steps:
echo.
echo 1. Start the backend:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    uvicorn main:app --reload
echo.
echo 2. In a new terminal, start the frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 3. Open http://localhost:5173 and log in with:
echo    Username: admin
echo    Password: admin
echo.
echo 📚 Full docs: See README.md in the root directory
echo 🔧 MLOps integration: See /backend/models/weights/README.md
