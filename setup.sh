#!/bin/bash

echo "========================================"
echo " Packer Desktop Web - Setup Script"
echo "========================================"
echo

echo "[1/4] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js is installed: $(node --version)"

echo
echo "[2/4] Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed"
    exit 1
fi
echo "npm is installed: $(npm --version)"

echo
echo "[3/4] Installing project dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo
echo "[4/4] Setup completed successfully!"
echo
echo "========================================"
echo " Available Commands:"
echo "========================================"
echo " npm run dev      - Start development server"
echo " npm run build    - Build for production"
echo " npm run preview  - Preview production build"
echo "========================================"
echo

read -p "Press Enter to start development server..."
echo "Starting development server..."
npm run dev 