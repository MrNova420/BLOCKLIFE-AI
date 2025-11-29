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
echo "Installing required packages..."
pkg install -y nodejs-lts git python make clang pkg-config

echo ""
echo "Installing native module build dependencies..."
# These are needed for compiling native Node.js modules
pkg install -y binutils libc++ 2>/dev/null || true

echo ""
echo "Checking installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Git version: $(git --version)"
echo "Python version: $(python3 --version)"
echo "Clang version: $(clang --version 2>/dev/null | head -1 || echo 'not installed')"

echo ""
echo "Setting up npm for native compilation..."
# Configure npm to use clang for native modules
npm config set python python3
# Set compiler flags for Termux
export CC=clang
export CXX=clang++
export npm_config_clang=1

echo ""
echo "Installing BlockLife dependencies..."
cd "$(dirname "$0")/.."

echo ""
echo "========================================"
echo "  Installing packages - this may take"
echo "  several minutes for native modules"
echo "========================================"
echo ""

# First try normal install
npm install 2>&1 | tee /tmp/npm-install.log
install_status=$?

# Check what installed successfully
echo ""
echo "========================================"
echo "  Checking installed features"
echo "========================================"

sqlite_ok=false
bedrock_ok=false
llama_ok=false

if node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "  ✓ SQLite storage (better-sqlite3)"
    sqlite_ok=true
else
    echo "  ✗ SQLite storage - using JSON fallback"
fi

if node -e "require('bedrock-protocol')" 2>/dev/null; then
    echo "  ✓ Bedrock Edition support"
    bedrock_ok=true
else
    echo "  ✗ Bedrock Edition - Java Edition still works"
fi

# node-llama-cpp uses ESM, test with dynamic import
if node --input-type=module -e "await import('node-llama-cpp')" 2>/dev/null; then
    echo "  ✓ Local AI models (node-llama-cpp)"
    llama_ok=true
else
    echo "  ✗ Local AI models - use Ollama instead"
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
    echo "To start BlockLife:"
    echo "  npm start"
    echo ""
    
    echo "Available features:"
    echo "  ✓ Core simulation engine"
    echo "  ✓ Web dashboard (localhost:3000)"
    echo "  ✓ Java Edition Minecraft"
    echo "  ✓ Ollama AI integration"
    echo "  ✓ Built-in AI rules"
    
    if [ "$sqlite_ok" = true ]; then
        echo "  ✓ SQLite storage (faster)"
    else
        echo "  • JSON storage (fallback)"
    fi
    
    if [ "$bedrock_ok" = true ]; then
        echo "  ✓ Bedrock Edition Minecraft"
    fi
    
    if [ "$llama_ok" = true ]; then
        echo "  ✓ Local AI models"
    fi
    
    echo ""
    
    # Show tips if native modules failed
    if [ "$bedrock_ok" = false ] || [ "$llama_ok" = false ]; then
        echo "========================================"
        echo "  Tips for missing features"
        echo "========================================"
        echo ""
        echo "Some native modules failed to compile."
        echo "To try again with more build tools:"
        echo ""
        echo "  pkg install -y proot-distro"
        echo "  proot-distro install ubuntu"
        echo "  proot-distro login ubuntu"
        echo "  apt update && apt install -y nodejs npm build-essential"
        echo "  cd /path/to/BLOCKLIFE-AI && npm install"
        echo ""
        echo "Or use a Linux server/VPS for full features."
        echo ""
    fi
else
    echo ""
    echo "========================================"
    echo "    Build Failed"
    echo "========================================"
    echo ""
    echo "The TypeScript build failed."
    echo "Try: npm run clean && npm run build"
    echo ""
    exit 1
fi
