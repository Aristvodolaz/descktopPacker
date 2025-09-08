#!/bin/bash

# Packer Desktop Web Application Startup Script
# This script handles nvm configuration and starts the application

echo "Starting Packer Desktop Web Application..."

# Set the working directory
cd /home/admin-lc/descktopPacker

# Fix permissions
echo "Fixing permissions..."
chmod -R 755 .
chmod -R 755 node_modules/.bin
chmod +x node_modules/.bin/vite

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Fix nvm prefix issue if it exists
if command -v nvm &> /dev/null; then
    echo "Fixing nvm configuration..."
    nvm use --delete-prefix v18.20.5 --silent 2>/dev/null || true
    
    # Use the correct Node.js version
    echo "Using Node.js version 18.20.5..."
    nvm use 18.20.5
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js not found. Installing Node.js 18.20.5..."
        nvm install 18.20.5
        nvm use 18.20.5
    fi
else
    echo "Warning: nvm not found. Using system Node.js..."
fi

# Check Node.js version
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Install global dependencies if needed
echo "Checking global dependencies..."
if ! command -v vite &> /dev/null; then
    echo "Installing Vite globally..."
    npm install -g vite
fi

# Создаем папку для логов
mkdir -p logs

# Выбираем режим запуска
echo "Выберите режим запуска:"
echo "1) Development (npm run dev)"
echo "2) Production (npm run build && npm run preview)"
echo "3) PM2 (рекомендуется для продакшена)"

read -p "Введите номер (1-3): " choice

case $choice in
    1)
        echo "🔧 Запуск в режиме разработки..."
        npx vite
        ;;
    2)
        echo "🏗️ Сборка для продакшена..."
        npm run build
        echo "🌐 Запуск продакшена..."
        npm run preview
        ;;
    3)
        echo "🚀 Запуск через PM2..."
        if ! command -v pm2 &> /dev/null; then
            echo "📦 Установка PM2..."
            npm install -g pm2
        fi
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        echo "✅ Приложение запущено через PM2"
        echo "📊 Статус: pm2 status"
        echo "📋 Логи: pm2 logs packer-desktop-web"
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac 