#!/usr/bin/env bash
set -e

echo "🚜 Dairy 4.0 Platform – Bootstrap Installer"
echo "=========================================="
echo ""

# Detect OS
OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" == "Darwin" ]; then
  PYTHON_CMD="python3"
  ACTIVATE_CMD="source venv/bin/activate"
elif [ "$OS_TYPE" == "Linux" ]; then
  PYTHON_CMD="python3"
  ACTIVATE_CMD="source venv/bin/activate"
elif [ "$OS_TYPE" == "MINGW64_NT" ] || [ "$OS_TYPE" == "CYGWIN_NT" ]; then
  PYTHON_CMD="python"
  ACTIVATE_CMD="./venv/Scripts/activate"
else
  echo "⚠️  Unsupported OS. Please set up manually."
  exit 1
fi

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
  $PYTHON_CMD -m venv venv
  echo "✓ Virtual environment created"
fi

eval $ACTIVATE_CMD
pip install -q -r requirements.txt
echo "✓ Backend dependencies installed"

cd ..

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
  npm install -q
  echo "✓ Frontend dependencies installed"
else
  echo "✓ Frontend dependencies already present"
fi

cd ..

echo ""
echo "=========================================="
echo "✅ Bootstrap complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate  # or ./venv/Scripts/activate on Windows"
echo "   uvicorn main:app --reload"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:5173 and log in with:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "📚 Full docs: See README.md in the root directory"
echo "🔧 MLOps integration: See /backend/models/weights/README.md"
