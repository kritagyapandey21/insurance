# PocketShield Insurance Platform 🛡️

A complete production-ready **Telegram Bot + Mini App system** for crypto insurance with blockchain payment verification.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Setup & Installation](#setup--installation)
6. [Configuration](#configuration)
7. [Running Locally](#running-locally)
8. [Deployment Guide](#deployment-guide)
9. [API Documentation](#api-documentation)
10. [Security](#security)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

PocketShield provides decentralized insurance for crypto traders with:
- **Telegram Bot**: Clean, professional interface
- **Mini App**: 5-screen flow with glassmorphic UI
- **Blockchain Payment**: USDT on Ethereum with verification
- **MongoDB Storage**: Secure user & transaction records
- **10% Insurance Fee**: Calculated automatically

---

## 🏗️ Architecture

```
telegram-insurance-platform/
├── telegram-bot/              # Telegram Bot (Node.js + Telegraf)
│   ├── bot.js                 # Main bot logic
│   ├── package.json
│   └── .env.example
│
├── mini-app/                  # Frontend Mini App (Vanilla JS)
│   ├── index.html             # All 5 screens
│   ├── css/
│   │   └── styles.css         # Dark theme + animations
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   └── confetti.js        # Success animation
│   └── .env.example
│
├── backend/                   # Express API
│   ├── server.js              # Main server
│   ├── models/
│   │   └── User.js            # MongoDB schema
│   ├── routes/
│   │   └── payment.js         # Payment endpoints
│   ├── middleware/
│   │   └── validation.js      # Input validation
│   ├── services/
│   │   └── paymentService.js  # Blockchain verification
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml         # Docker services
└── README.md                  # Documentation
```

---

## ✨ Features

### Telegram Bot
- `/start` - Welcome message with "Get Insured Now" button
- `/help` - Show available commands
- `/status` - Check insurance status
- WebApp integration for seamless transition to mini app

### Mini App - 5-Screen Flow

**Screen 1: Terms & Agreement**
- Scrollable terms section
- Checkbox validation
- Disabled button until accepted

**Screen 2: User Details**
- Full Name, Trader ID, Initial Deposit
- Real-time fee calculation (10%)
- Input validation

**Screen 3: Payment**
- Insurance fee display
- Wallet address (copy button)
- QR code for payment
- Clear payment instructions

**Screen 4: Payment Verification**
- API verification with animated loader
- Transaction confirmation checking

**Screen 5: Success Modal**
- Confetti animation
- Auto-close after 3 seconds
- Coverage details display

### Backend API
- `POST /api/check-payment` - Payment verification
- `GET /api/user-status/:traderId` - Check coverage
- `POST /api/claim` - Submit insurance claims
- `GET /api/stats` - Platform statistics

---

## 🛠️ Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript** (Vanilla - no dependencies)
- **Telegram WebApp SDK**
- **Poppins + Inter Fonts**
- **QR Code Library** (CDN)

### Backend
- **Node.js + Express**
- **MongoDB + Mongoose**
- **Web3.js + Etherscan API** (Payment verification)
- **Axios** (HTTP requests)
- **Helmet** + **Express Rate Limit** (Security)

### Deployment
- **Vercel** (Mini App)
- **Render** (Backend)
- **MongoDB Atlas** (Database)
- **Docker** (Local development)

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 16+ 
- MongoDB (Local or Atlas)
- Telegram Bot Token (from @BotFather)
- Etherscan API Key
- Alchemy/Infura endpoint (optional)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/telegram-insurance-platform.git
cd telegram-insurance-platform
```

### 2. Install Dependencies

```bash
# Telegram Bot
cd telegram-bot
npm install

# Backend
cd ../backend
npm install

# Mini App (No dependencies - uses vanilla JS)
cd ../mini-app
```

---

## ⚙️ Configuration

### 1. Telegram Bot Setup

Get your bot token from [BotFather](https://t.me/BotFather):

```bash
cd telegram-bot
cp .env.example .env
```

Edit `telegram-bot/.env`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
MINI_APP_URL=https://your-mini-app.vercel.app
NODE_ENV=development
```

### 2. Backend Setup

Get Etherscan API key from https://etherscan.io/apis

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/crypto-insurance

# or use MongoDB Atlas:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crypto-insurance

# Blockchain
ETHERSCAN_API_KEY=your_etherscan_key
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key
INSURANCE_WALLET_ADDRESS=0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1

# Payment Verification
PAYMENT_VERIFICATION_METHOD=etherscan
MIN_CONFIRMATIONS=12

# CORS
FRONTEND_URL=http://localhost:3000

# Port
PORT=5000
```

### 3. Mini App Setup

Edit `mini-app/js/app.js`:

```javascript
// Line ~40 - Update backend URL
getBackendURL() {
    const isDev = true; // Set to false in production
    return isDev ? 'http://localhost:5000' : 'https://your-backend.render.com';
}

// Line ~37 - Update wallet address
this.walletAddress = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1';
```

---

## 🏃 Running Locally

### Option 1: Using Docker (Recommended)

```bash
# Start MongoDB + Backend
docker-compose up

# In another terminal, start Telegram Bot
cd telegram-bot
npm install
npm run dev

# Start Mini App
# Open mini-app/index.html in browser or use live server
```

### Option 2: Manual Setup

**Terminal 1 - MongoDB:**
```bash
# Install MongoDB Community: https://docs.mongodb.com/manual/installation/

# Start MongoDB
mongod
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 3 - Telegram Bot:**
```bash
cd telegram-bot
npm install
npm run dev
```

**Terminal 4 - Mini App:**
```bash
cd mini-app
# Use Python HTTP server or VS Code Live Server
python -m http.server 3000
# or
npx http-server -p 3000
```

### Test Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) → send `/mybots` → select your bot
2. Copy bot token
3. Search your bot on Telegram (e.g., @your_bot_name)
4. Send `/start`
5. Click button to open mini app

---

## 📦 Deployment Guide

### Deploy Mini App to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd mini-app
vercel

# Copy the deployment URL
```

Update bot with mini app URL:
```env
# telegram-bot/.env
MINI_APP_URL=https://your-project.vercel.app
```

### Deploy Backend to Render

1. Go to [Render](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - Add environment variables from `backend/.env`

5. Create MongoDB database:
   - [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create free cluster
   - Get connection string
   - Update `MONGODB_URI` in Render

### Deploy Bot to Heroku (Alternative)

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set MINI_APP_URL=https://your-mini-app.vercel.app

# Deploy
git push heroku main
```

---

## 📡 API Documentation

### 1. Check Payment

**Endpoint**: `POST /api/check-payment`

**Request**:
```json
{
  "traderId": "TRADER_12345",
  "amount": 100.5,
  "fullName": "John Doe",
  "telegramId": 123456789,
  "uniquePaymentId": "PAY_123456789_1234567890",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc822e5c5e4329"
}
```

**Response - Success**:
```json
{
  "success": true,
  "message": "Payment verified. Insurance coverage activated!",
  "data": {
    "policyId": "507f1f77bcf86cd799439011",
    "traderId": "TRADER_12345",
    "coverageStartDate": "2024-03-28T12:00:00Z",
    "coverageEndDate": "2025-03-28T12:00:00Z",
    "coverageAmount": 100.5,
    "premiumPaid": 10.05
  }
}
```

### 2. Get User Status

**Endpoint**: `GET /api/user-status/:traderId`

**Response**:
```json
{
  "success": true,
  "data": {
    "traderId": "TRADER_12345",
    "fullName": "John Doe",
    "coverageStatus": "active",
    "coverageStartDate": "2024-03-28T12:00:00Z",
    "coverageEndDate": "2025-03-28T12:00:00Z",
    "initialAmount": 100.5,
    "paymentStatus": "confirmed"
  }
}
```

### 3. Submit Claim

**Endpoint**: `POST /api/claim`

**Request**:
```json
{
  "traderId": "TRADER_12345",
  "amount": 50,
  "description": "Smart contract loss"
}
```

### 4. Get Statistics

**Endpoint**: `GET /api/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 120,
    "totalPremiums": 15000.50,
    "totalCoverage": 150000,
    "timestamp": "2024-03-28T12:00:00Z"
  }
}
```

---

## 🔐 Security

### Implemented Security Measures

1. **Input Validation**
   - All fields validated on server-side
   - Sanitized trader IDs, amounts, addresses
   - Regex checks for Ethereum addresses and TX hashes

2. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents brute force attacks

3. **CORS Protection**
   - Restricted to specific origin
   - Credentials only from trusted domain

4. **Helmet.js**
   - XSS protection
   - Content Security Policy
   - HTTPS enforcement in production

5. **Database**
   - Mongodb connection with authentication
   - Indexed queries for performance
   - Automatic timestamp tracking

6. **Blockchain Verification**
   - Server-side transaction verification only
   - Minimum confirmations required (12)
   - Wallet address and amount validation
   - Transaction hash verification

7. **Duplicate Prevention**
   - Check for duplicate payments within 24 hours
   - Unique payment IDs per transaction

### Production Checklist

- [ ] Use HTTPS everywhere
- [ ] Enable CSRS tokens
- [ ] Set secure MongoDB password
- [ ] Use environment variables for secrets
- [ ] Enable API key rotation
- [ ] Monitor for suspicious patterns
- [ ] Implement API logging
- [ ] Add 2FA for admin panel
- [ ] Regular security audits
- [ ] Update dependencies regularly

---

## 🐛 Troubleshooting

### Bot Not Responding

```bash
# Check token validity
curl https://api.telegram.org/bot<TOKEN>/getMe

# Verify webhook/polling
# For webhook: Configure in BotFather → Bot Settings → Domain
# For polling: Ensure bot.launch() is running
```

### Payment Verification Fails

```bash
# Check Etherscan API
curl "https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=YOUR_KEY"

# Verify wallet address format
# Must be: 0x followed by 40 hex characters
# Example: 0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90a1

# Check transaction hash
# Format: 0x followed by 64 hex characters
```

### MongoDB Connection Error

```bash
# Test connection
mongosh "mongodb://localhost:27017"

# For Atlas:
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/database"

# Check firewall/network
# Ensure MongoDB port 27017 is open
```

### Mini App Not Loading

```bash
# Check Telegram SDK loaded
# Open DevTools → Console → verify Telegram object exists
console.log(window.Telegram)

# Verify backend URL
# Check if API calls succeed in Network tab
# CORS errors indicate frontend/backend mismatch

# Clear browser cache
# Ctrl+Shift+Delete → Clear all
```

### QR Code Not Generating

```bash
# Verify QRCode library loaded
console.log(window.QRCode)

# Check container exists
document.getElementById('qrCode')

# Verify QR text is valid
// Should be: ethereum:0x.....?value=...
```

---

## 📝 File Structure Explanation

```
telegram-insurance-platform/
│
├── telegram-bot/              # Mini App WebApp
│   ├── bot.js                 # Main bot logic with commands
│   ├── package.json           # Dependencies
│   └── .env.example           # Environment template
│
├── mini-app/                  # Frontend
│   ├── index.html             # All 5 screens + modals
│   ├── css/styles.css         # 700+ lines of styling
│   ├── js/
│   │   ├── app.js             # 450+ lines of logic
│   │   └── confetti.js        # Animation effects
│   └── assets/                # Images (if any)
│
├── backend/                   # Express Server
│   ├── server.js              # Express setup, routes
│   ├── models/
│   │   └── User.js            # MongoDB User schema (60+ fields)
│   ├── routes/
│   │   └── payment.js         # 5 API endpoints
│   ├── middleware/
│   │   └── validation.js      # Input validation (200+ lines)
│   ├── services/
│   │   └── paymentService.js  # Blockchain verification
│   └── package.json
│
├── docker-compose.yml         # Docker orchestration
└── README.md                  # This file
```

---

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Neon green (#00ff88), Cyan (#00d4ff), Pink (#ff00ff)
- **Font Stack**: Poppins (headings), Inter (body), Courier (code)
- **Border Radius**: 12px-20px (rounded cards)
- **Backdrop Filter**: Glassmorphism effect

### Animations
- Fade in/out transitions
- Smooth scale animations
- Bounce/pop effects on success
- Confetti on payment success
- Smooth button hover effects

### Responsive
- Mobile-first design
- Works on all screen sizes
- Touch-optimized buttons
- Scrollable content areas

---

## 💡 Future Enhancements

- [ ] Admin dashboard for claim management
- [ ] Email notifications
- [ ] Two-factor authentication
- [ ] Multi-chain support (BSC, Polygon)
- [ ] Insurance history & policy downloads
- [ ] Staking mechanism
- [ ] DAO governance
- [ ] Mobile app (React Native)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For issues or questions:
- Open a GitHub issue
- Email: support@pocketshield.io
- Telegram: @PocketShieldSupport

---

## 🎉 Thank You!

This platform is production-ready and can be deployed immediately.

**Happy insuring! 🛡️**
