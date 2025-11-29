#!/bin/bash
# BlockLife AI - Termux Setup Script
# Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

echo "========================================"
echo "    BlockLife AI - Termux Setup"
echo "========================================"
echo ""

# Check if running in Termux
if [ -z "$PREFIX" ]; then
    echo "Warning: This script is designed for Termux on Android."
    echo "Continuing anyway..."
fi

echo "Updating packages..."
pkg update -y
pkg upgrade -y

echo ""
echo "Installing Node.js..."
pkg install nodejs-lts -y

echo ""
echo "Installing Git..."
pkg install git -y

echo ""
echo "Checking installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Git version: $(git --version)"

echo ""
echo "Installing BlockLife dependencies..."
cd "$(dirname "$0")/.."
npm install

echo ""
echo "Building BlockLife..."
npm run build

echo ""
echo "========================================"
echo "    Setup Complete!"
echo "========================================"
echo ""
echo "To start BlockLife, run:"
echo "  npm start"
echo ""
echo "Or for development:"
echo "  npm run dev"
echo ""
