#!/bin/bash
set -e

# Tailor Fit — Hostinger VPS Setup Fix
# This script ensures corepack is enabled and pnpm is ready to use.

echo "🚀 Starting Hostinger Setup Fix..."

# 1. Enable Corepack (Node.js built-in package manager manager)
echo "📦 Enabling Corepack..."
corepack enable

# 2. Setup pnpm
echo "📦 Setting up pnpm..."
corepack prepare pnpm@10.33.0 --activate
pnpm setup

# 3. Handle Canvas dependencies (common failure point on Linux)
echo "🎨 Installing Canvas system dependencies..."
# Note: Hostinger might not allow sudo apt, but we try or provide the command.
if command -v apt-get >/dev/null; then
    echo "Running: sudo apt-get update && sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev"
    echo "If this fails due to permissions, please contact Hostinger support to install these libraries."
    sudo apt-get update && sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev || true
else
    echo "⚠️  apt-get not found. Skipping system dependency install."
fi

# 4. Final check
echo "✅ Setup complete. Please run: source ~/.bashrc"
echo "Then you can run: pnpm run build:all"
