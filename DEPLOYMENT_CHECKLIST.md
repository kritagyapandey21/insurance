# 🚀 PocketShield Insurance - Deployment Checklist

## Pre-Deployment 📋

### Code Quality
- [ ] All console.logs removed (except errors)
- [ ] No hardcoded API keys
- [ ] No dummy/test data in production
- [ ] All TODOs addressed
- [ ] Code comments cleaned up

### Testing
- [ ] Bot /start command works
- [ ] Mini App all 5 screens functional
- [ ] Form validation working
- [ ] Payment API call successful
- [ ] Success modal displays correctly
- [ ] Mobile responsiveness tested

### Security
- [ ] HTTPS enabled everywhere
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all forms
- [ ] No sensitive data in logs
- [ ] Database authentication enabled
- [ ] API keys in environment variables only

---

## Deployment to Vercel (Mini App)

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set environment variables
- [ ] Deploy
- [ ] Test deployment URL
- [ ] Update bot MINI_APP_URL

**Commands:**
```bash
vercel login
cd mini-app
vercel
```

---

## Deployment to Render (Backend)

- [ ] Create Render account
- [ ] Create Web Service
- [ ] Connect GitHub
- [ ] Configure build & start commands
- [ ] Set environment variables
- [ ] Add MongoDB Atlas connection
- [ ] Deploy
- [ ] Test API endpoints

**Environment Variables to set:**
- MONGODB_URI
- ETHERSCAN_API_KEY
- ETHEREUM_RPC_URL
- INSURANCE_WALLET_ADDRESS
- FRONTEND_URL
- NODE_ENV=production

---

## MongoDB Atlas Setup

- [ ] Create free cluster
- [ ] Create database user
- [ ] Get connection string
- [ ] Whitelist IP addresses
- [ ] Create indexes:
  ```javascript
  db.users.createIndex({ traderId: 1 })
  db.users.createIndex({ telegramId: 1 })
  db.users.createIndex({ uniquePaymentId: 1 })
  db.users.createIndex({ transactionHash: 1 })
  ```
- [ ] Enable backups

---

## Telegram Bot Deployment

### Option 1: Render (Recommended)
- [ ] Push code to GitHub
- [ ] Create new Web Service on Render
- [ ] Set TELEGRAM_BOT_TOKEN
- [ ] Set MINI_APP_URL to deployed Vercel URL
- [ ] Deploy

### Option 2: Heroku
- [ ] Install Heroku CLI
- [ ] Create Heroku app
- [ ] Set config variables
- [ ] Deploy via git push

```bash
heroku create your-bot-name
heroku config:set TELEGRAM_BOT_TOKEN=xxx
heroku config:set MINI_APP_URL=https://your-app.vercel.app
git push heroku main
```

---

## API Keys Required ⚙️

1. **Telegram Bot Token**
   - Get from: @BotFather
   - Format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

2. **Etherscan API Key**
   - Get from: https://etherscan.io/apis
   - Free tier: 5 calls/second

3. **Alchemy Key (Optional)**
   - Get from: https://www.alchemy.com
   - No calls limit

4. **MongoDB URI**
   - Get from: https://www.mongodb.com/atlas
   - Format: mongodb+srv://user:pass@cluster.mongodb.net/dbname

---

## Post-Deployment Testing 🧪

### API Endpoints
- [ ] `GET /health` returns 200
- [ ] `POST /api/check-payment` with mock data
- [ ] `GET /api/user-status/test_id` returns 404
- [ ] `GET /api/stats` returns data
- [ ] Rate limiting works (100+ requests)

### Bot
- [ ] /start command opens mini app
- [ ] /help displays commands
- [ ] /status shows user status
- [ ] Button click opens mini app URL

### Mini App
- [ ] All screens load
- [ ] Form validation works
- [ ] API calls succeed
- [ ] Success modal displays
- [ ] Confetti animation plays
- [ ] Mobile responsive

### Security
- [ ] No console errors
- [ ] CORS headers correct
- [ ] Database connection secure
- [ ] Rate limit working
- [ ] No SQL injection possible

---

## Monitoring & Maintenance 📊

### Setup Monitoring
- [ ] Enable Render logs
- [ ] Enable MongoDB Atlas alerts
- [ ] Setup error tracking (Sentry optional)
- [ ] Monitor API response times
- [ ] Track payment verification failures

### Regular Tasks
- [ ] Weekly: Check error logs
- [ ] Monthly: Review statistics
- [ ] Quarterly: Security audit
- [ ] Quarterly: Dependency updates
- [ ] Annually: Penetration testing

### Backup & Disaster Recovery
- [ ] MongoDB Atlas backups enabled
- [ ] Backup retention: 7+ days
- [ ] Document recovery procedure
- [ ] Test restore process monthly

---

## Domain & SSL 🔒

- [ ] Purchase domain name
- [ ] Setup DNS records
- [ ] Enable SSL certificate (free with Vercel/Render)
- [ ] Configure custom domain for:
  - Mini App (Vercel)
  - Backend API (Render)
  - Bot webhook (if not using polling)

---

## Go Live! 🎉

- [ ] Update Telegram bot privacy policy
- [ ] Test full user flow 10+ times
- [ ] Announce on Telegram channels
- [ ] Monitor for 24 hours post-launch
- [ ] Be ready for support requests

---

## Rollback Plan 🔄

If critical issues occur:
1. Render: Click "Suspend" to stop service
2. Vercel: Revert to previous deployment
3. Bot: Update MINI_APP_URL to previous version
4. Database: Restore from backup if needed

---

## Final Checklist

- [ ] All `.env.example` files updated
- [ ] README.md is complete & accurate
- [ ] No test/dummy data in production
- [ ] Logging enabled for errors
- [ ] Support contact info visible
- [ ] Terms of service visible in app
- [ ] Privacy policy documented
- [ ] Admin can monitor platform

---

**Ready to Deploy? 🚀**

Double-check this list before going live!
