#!/bin/bash
# BlockLife AI - Stop Script
# Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

echo "Stopping BlockLife AI..."

# Find and kill BlockLife process
pkill -f "node.*blocklife" || true
pkill -f "ts-node.*blocklife" || true

echo "BlockLife stopped."
