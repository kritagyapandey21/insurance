# ⚡ Quick Reference Card - Claims Database Fix

## 🚀 Start Here (5 minutes)

```bash
# SSH to VPS
ssh user@your_vps_ip

# Go to project
cd /path/to/telegram-insurance-platform

# Run diagnostic
chmod +x quick-diagnostic.sh
./quick-diagnostic.sh
```

**Look for:** Red ❌ items = problems to fix

---

## 🔴 If Backend is DOWN

```bash
# Check status
pm2 list

# Start backend
pm2 start backend/server.js --name backend

# Check logs
pm2 logs backend

# Restart everything
pm2 restart all
```

---

## 🔴 If PostgreSQL is DOWN

```bash
# Check status
sudo systemctl status postgresql

# Restart
sudo systemctl restart postgresql

# Verify it started
sudo systemctl status postgresql

# Test connection
psql -h localhost -U insurance_user -d insurance_db -c "SELECT NOW();"
```

---

## 🔴 If Claims Table is Missing

```bash
# Connect to database
psql -h localhost -U insurance_user -d insurance_db

# Create table (paste this in psql):
CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    claim_id TEXT NOT NULL UNIQUE,
    trader_id TEXT NOT NULL,
    user_id INTEGER,
    telegram_id BIGINT,
    amount NUMERIC(20, 8) NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review',
    admin_notes TEXT,
    denial_reason TEXT,
    payout_amount NUMERIC(20, 8),
    payout_tx_hash TEXT,
    evidence_urls TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    FOREIGN KEY (trader_id) REFERENCES users(trader_id) ON DELETE CASCADE
);

# Exit
\q

# Restart backend
pm2 restart backend
```

---

## 📊 Check Database Status

```bash
# Quick count
psql -h localhost -U insurance_user -d insurance_db -c "SELECT COUNT(*) FROM claims;"

# By status
psql -h localhost -U insurance_user -d insurance_db -c "SELECT status, COUNT(*) FROM claims GROUP BY status;"

# Recent claims
psql -h localhost -U insurance_user -d insurance_db -c "SELECT claim_id, trader_id, status FROM claims ORDER BY created_at DESC LIMIT 10;"
```

---

## 🧪 Test Backend Connection

```bash
# Full test suite
node test-backend-connection.js

# Quick health check
curl http://localhost:5000/health

# Test claim submission
curl -X POST http://localhost:5000/api/claim \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "TEST123",
    "amount": 100,
    "description": "Test claim",
    "telegramId": 1234567890
  }'
```

---

## 🔄 Restart Everything (Nuclear Option)

```bash
pm2 stop all
sudo systemctl restart postgresql
pm2 restart all
pm2 logs
```

---

## 📋 Common Credentials

**PostgreSQL:**
- Host: `localhost`
- Port: `5432`
- User: `insurance_user`
- Password: `StrongPass@123` (check .env)
- Database: `insurance_db`

**Backend:**
- URL: `http://localhost:5000`
- Health: `http://localhost:5000/health`
- Claims API: `POST http://localhost:5000/api/claim`

---

## 🎯 Verification Checklist

After fixing:

- [ ] `pm2 list` shows "online" for both backend and bot
- [ ] `curl http://localhost:5000/health` returns status "ok"
- [ ] `psql` connects successfully
- [ ] `SELECT COUNT(*) FROM claims;` returns a number
- [ ] `node test-backend-connection.js` shows all PASS
- [ ] Approve a test claim in Telegram bot
- [ ] Claim appears in database (check last query above)

---

## 📞 Emergency Contacts in Code

Check these files for more info:

- **Troubleshooting:** `BACKEND_TROUBLESHOOTING.md`
- **SQL Queries:** `DATABASE_QUERIES.md`
- **Full Summary:** `CLAIMS_FIX_SUMMARY.md`

---

## ⏱️ Expected Times

- Quick diagnostic: **2 min**
- Backend restart: **1 min**
- PostgreSQL restart: **2 min**
- Full backend test: **3 min**
- Database verification: **1 min**

**Total if fixing:** ~10-15 minutes (if issues are simple)

---

## 📝 Important Paths

```
Project Root:
/path/to/telegram-insurance-platform/

Backend:
/path/to/telegram-insurance-platform/backend/
├── server.js (main file)
├── .env (config)
├── package.json

Bot:
/path/to/telegram-insurance-platform/telegram-bot/
├── bot.js (main file)
├── .env (config)

Diagnostics:
├── test-backend-connection.js
├── quick-diagnostic.sh
├── DATABASE_QUERIES.md
├── BACKEND_TROUBLESHOOTING.md
```

---

🎯 **Target:** All claims save to database, no more "offline" messages

📊 **Success:** Run `SELECT COUNT(*) FROM claims;` shows increasing numbers

---

Last Updated: April 10, 2026
Print this card or keep it open! ⭐
