# ⚡ Quick Start Guide

Get the platform running in 5 minutes!

## 1. Prerequisites ✅

```bash
# Check Node.js (v16+)
node --version

# Check npm
npm --version

# (Optional) Install MongoDB
# macOS: brew install mongodb-community
# Windows: Download from mongodb.com
```

---

## 2. Clone & Install 📦

```bash
# Clone project
git clone your-repo-url
cd telegram-insurance-platform

# Install dependencies
cd telegram-bot && npm install
cd ../backend && npm install
cd ../mini-app

# No install needed for mini-app (vanilla JS)
cd ..
```

---

## 3. Configure Environment 🔧

### Telegram Bot
```bash
cd telegram-bot
cp .env.example .env

# Edit .env - Add your values:
# TELEGRAM_BOT_TOKEN=your_token_from_botfather
# MINI_APP_URL=http://localhost:3000
```

### Backend
```bash
cd ../backend
cp .env.example .env

# Edit .env - Add your values:
# MONGODB_URI=mongodb://localhost:27017/crypto-insurance
# ETHERSCAN_API_KEY=your_key_from_etherscan
# INSURANCE_WALLET_ADDRESS=0x1a2b...
```

---

## 4. Start Services 🚀

### Option A: Docker (Easiest)
```bash
# Requires Docker & Docker Compose
cd ..
docker-compose up

# In new terminal:
cd telegram-bot
npm run dev
```

### Option B: Manual
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Bot
cd telegram-bot
npm run dev

# Terminal 4: Mini App
cd mini-app
python -m http.server 3000
# Or use VS Code Live Server extension
```

---

## 5. Test Everything 🧪

### Test Bot
1. Open Telegram
2. Search for your bot (search by token in BotFather)
3. Send `/start`
4. Should see welcome message + button
5. Click button → should open mini app

### Test API
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok",...}
```

### Test Mini App
1. Open http://localhost:3000 in browser
2. Should see Terms screen
3. Fill form → verify payment screen
4. Test responsive on mobile (F12 → toggle device)

---

## 6. Deploy 🌐

### Deploy Mini App (Vercel)
```bash
npm install -g vercel
cd mini-app
vercel
# Copy URL from output
```

### Deploy Backend (Render)
1. Push code to GitHub
2. Go to render.com
3. New Web Service
4. Connect GitHub
5. Fill environment variables
6. Deploy

### Update Bot
```bash
# Update telegram-bot/.env
MINI_APP_URL=https://your-vercel-app.vercel.app
npm run dev
```

---

## 7. Troubleshooting 🔧

| Issue | Solution |
|-------|----------|
| Bot not starting | Check TELEGRAM_BOT_TOKEN in .env |
| API returns 404 | Ensure backend is running on port 5000 |
| MongoDB error | Install MongoDB or use MongoDB Atlas |
| Mini app blank | Check browser console for errors (F12) |
| QR code not showing | Verify QRCode library loaded from CDN |

---

## 📚 Useful Commands

```bash
# Development (watch mode)
npm run dev

# Production
npm start

# Check logs
# Backend: npm run dev shows console output
# Bot: Same terminal shows logs
# Database: Check MongoDB logs

# Test payment endpoint
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "TEST123",
    "amount": 100,
    "fullName": "Test User",
    "telegramId": 123456789,
    "uniquePaymentId": "PAY_123_456"
  }'
```

---

## 📝 File Changes You Might Need To Make

### In `mini-app/js/app.js` (line ~160)
```javascript
// Change this line for your wallet
this.walletAddress = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1';
```

### In mini app for production (line ~530)
```javascript
getBackendURL() {
    // Change to: return 'https://your-backend.render.com';
    return 'http://localhost:5000';
}
```

---

## ✨ You're All Set!

- Mini App: http://localhost:3000
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health
- Telegram: Your bot

**Next: Read README.md for full documentation**

---

**Need Help?** Check the main README.md or troubleshooting section
