#!/bin/bash
# BlockLife AI - Start Script
# Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

echo "========================================"
echo "    Starting BlockLife AI"
echo "    Copyright © 2025 WeNova Interactive"
echo "========================================"
echo ""

# Change to script directory
cd "$(dirname "$0")/.."

# Check if built
if [ ! -d "dist" ]; then
    echo "Building BlockLife..."
    npm run build
fi

# Set environment
export NODE_ENV=production
export BLOCKLIFE_CONFIG=./config/default.json

# Start with auto-restart on crash
restart_count=0
max_restarts=5

while [ $restart_count -lt $max_restarts ]; do
    echo "Starting BlockLife (attempt $((restart_count + 1))/$max_restarts)..."
    node dist/main.js
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "BlockLife stopped gracefully."
        break
    fi
    
    restart_count=$((restart_count + 1))
    echo "BlockLife crashed with code $exit_code. Restarting in 5 seconds..."
    sleep 5
done

if [ $restart_count -eq $max_restarts ]; then
    echo "BlockLife crashed too many times. Please check the logs."
    exit 1
fi
