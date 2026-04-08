#!/bin/bash

# PocketShield Insurance Platform - Quick Start Setup Script
# This script sets up the entire project for local development

echo "🛡️  CryptoShield Insurance Platform - Setup"
echo "================================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed. Please install from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Setup Telegram Bot
echo ""
echo "📱 Setting up Telegram Bot..."
cd telegram-bot
cp .env.example .env
npm install
echo "✅ Bot setup complete. Update .env with your token."

# Setup Backend
echo ""
echo "🚀 Setting up Backend..."
cd ../backend
cp .env.example .env
npm install
echo "✅ Backend setup complete. Update .env with your keys."

# Setup Mini App
echo ""
echo "🎨 Setting up Mini App..."
cd ../mini-app
cp .env.example .env
echo "✅ Mini App setup complete."

# Return to root
cd ..

echo ""
echo "================================================"
echo "✨ Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Update telegram-bot/.env"
echo "2. Update backend/.env"
echo "3. Start MongoDB: mongod"
echo "4. Run: npm run dev (in each directory)"
echo ""
echo "For Docker: docker-compose up"
echo "================================================"
