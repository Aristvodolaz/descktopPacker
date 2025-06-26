#!/bin/bash

# Script to fix nvm configuration issues
echo "Fixing nvm configuration..."

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Fix the prefix issue
echo "Removing problematic prefix settings..."
nvm use --delete-prefix v18.20.5 --silent 2>/dev/null || true

# Check and fix .npmrc file
if [ -f "$HOME/.npmrc" ]; then
    echo "Checking .npmrc file for problematic settings..."
    
    # Backup the original file
    cp "$HOME/.npmrc" "$HOME/.npmrc.backup"
    
    # Remove globalconfig and prefix lines
    sed -i '/^globalconfig=/d' "$HOME/.npmrc"
    sed -i '/^prefix=/d' "$HOME/.npmrc"
    
    echo "Fixed .npmrc file. Original backed up as .npmrc.backup"
fi

# Use the correct Node.js version
echo "Setting Node.js version to 18.20.5..."
nvm use 18.20.5

echo "Configuration fixed! You can now restart PM2."
echo "Run: pm2 restart packer-desktop-web" 