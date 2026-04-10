#!/bin/bash

# Quick diagnostic script - run this on your VPS to check everything

echo ""
echo "========================================"
echo "🔧 QUICK BACKEND DIAGNOSTIC"
echo "========================================"
echo ""

# Check if Node.js is installed
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js installed: $NODE_VERSION"
else
    echo "   ❌ Node.js not found"
fi

# Check if npm is installed
echo ""
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm installed: $NPM_VERSION"
else
    echo "   ❌ npm not found"
fi

# Check PostgreSQL
echo ""
echo "🗄️  Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "   ✅ psql client installed"
    
    # Try to connect
    if psql -h localhost -U insurance_user -d insurance_db -c "SELECT 1" 2>/dev/null; then
        echo "   ✅ Connected to database"
        
        # Check claims table
        TABLE_CHECK=$(psql -h localhost -U insurance_user -d insurance_db -c "SELECT COUNT(*) FROM claims;" 2>/dev/null)
        if [ $? -eq 0 ]; then
            CLAIM_COUNT=$(echo "$TABLE_CHECK" | tail -1 | xargs)
            echo "   ✅ Claims table exists with $CLAIM_COUNT records"
        else
            echo "   ⚠️  Could not query claims table"
        fi
        
        # Check users table
        USER_COUNT=$(psql -h localhost -U insurance_user -d insurance_db -c "SELECT COUNT(*) FROM users" 2>/dev/null | tail -1 | xargs)
        echo "   ✅ Users table has $USER_COUNT records"
    else
        echo "   ❌ Cannot connect to PostgreSQL"
        echo "      Try: psql -h localhost -U insurance_user -d insurance_db"
    fi
else
    echo "   ⚠️  psql client not installed"
    echo "      Install: sudo apt-get install postgresql-client-12"
fi

# Check if backend is running
echo ""
echo "🚀 Checking backend server..."
if pm2 list 2>/dev/null | grep -q "server\|backend"; then
    echo "   ✅ Backend appears to be running in PM2"
    
    # Try health check
    HEALTH=$(curl -s http://localhost:5000/health 2>/dev/null)
    if [ -n "$HEALTH" ]; then
        echo "   ✅ Backend is responding to requests"
    else
        echo "   ⚠️  Backend not responding on localhost:5000"
    fi
else
    echo "   ⚠️  Backend not found in PM2"
    echo "      View all processes: pm2 list"
fi

# Check if telegram bot is running
echo ""
echo "🤖 Checking Telegram bot..."
if pm2 list 2>/dev/null | grep -q "bot"; then
    echo "   ✅ Telegram bot appears to be running"
else
    echo "   ⚠️  Telegram bot not found in PM2"
fi

# Show PM2 status
echo ""
echo "📊 PM2 Process Status:"
pm2 list 2>/dev/null || echo "   ⚠️  PM2 not available or no processes running"

# Instructions
echo ""
echo "========================================"
echo "📝 NEXT STEPS"
echo "========================================"
echo ""
echo "1. If PostgreSQL is down:"
echo "   sudo systemctl restart postgresql"
echo ""
echo "2. If backend is down:"
echo "   cd /path/to/backend && npm start"
echo "   or"
echo "   pm2 start server.js --name backend"
echo ""
echo "3. Check backend logs:"
echo "   pm2 logs backend"
echo ""
echo "4. View all claims in database:"
echo "   psql -h localhost -U insurance_user -d insurance_db -c \"SELECT * FROM claims;\""
echo ""
echo "5. View claims by status:"
echo "   psql -h localhost -U insurance_user -d insurance_db -c \"SELECT status, COUNT(*) FROM claims GROUP BY status;\""
echo ""
echo "6. Run full diagnostic:"
echo "   node test-backend-connection.js"
echo ""
echo "========================================"
echo ""
