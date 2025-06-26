@echo off
echo ========================================
echo  Packer Desktop Web - Setup Script
echo ========================================
echo.

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js is installed.

echo.
echo [2/4] Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)
echo npm is installed.

echo.
echo [3/4] Installing project dependencies...
npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Setup completed successfully!
echo.
echo ========================================
echo  Available Commands:
echo ========================================
echo  npm run dev      - Start development server
echo  npm run build    - Build for production
echo  npm run preview  - Preview production build
echo ========================================
echo.
echo Press any key to start development server...
pause >nul

echo Starting development server...
npm run dev 