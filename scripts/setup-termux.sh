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
echo "Installing Python (required for some npm packages)..."
pkg install python -y

echo ""
echo "Checking installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Git version: $(git --version)"
echo "Python version: $(python3 --version)"

echo ""
echo "Installing BlockLife dependencies..."
cd "$(dirname "$0")/.."

# Install all dependencies (optional ones will gracefully fail if needed)
echo "Installing packages..."
echo ""

npm install
install_status=$?

if [ $install_status -ne 0 ]; then
    echo ""
    echo "Warning: Some optional packages may have failed to install."
    echo "This is normal on Termux - core functionality will work."
    echo ""
fi

# Run postinstall script
echo ""
echo "Running setup script..."
node scripts/postinstall.js

echo ""
echo "Building BlockLife..."
if npm run build; then
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
    echo "Features available:"
    echo "  ✓ Core simulation engine"
    echo "  ✓ Web dashboard"
    echo "  ✓ Java Edition Minecraft support"
    echo "  ✓ Ollama AI integration"
    echo ""
    echo "Note: Bedrock Edition and local AI models require"
    echo "native modules that may not compile on Termux."
    echo "Use Java Edition servers and Ollama for best experience."
    echo ""
else
    echo ""
    echo "========================================"
    echo "    Build Failed"
    echo "========================================"
    echo ""
    echo "The build failed. Please check the error messages above."
    echo "If you see TypeScript errors, try running:"
    echo "  npm run clean && npm run build"
    echo ""
    exit 1
fi
