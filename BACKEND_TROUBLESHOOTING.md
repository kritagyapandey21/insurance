# 🔧 Backend Claims Database Fix & Troubleshooting Guide

## Problem
Claims approved in the bot are failing to save to the database with error:
```
⚠️ Claim approved but backend save failed. Database save failed, stored locally.
```

## Root Cause Analysis

The bot attempts to POST claim data to `${BACKEND_URL}/api/claim` but the request is **failing**. This could be due to:
- ❌ Backend server not running
- ❌ PostgreSQL database not accessible
- ❌ Network connectivity issue between bot and backend
- ❌ Endpoint misconfiguration
- ❌ Backend server crashed

---

## Fix #1: Check Backend Server Status

### Option A: On Your VPS (SSH Terminal)

```bash
# 1. SSH into your VPS
ssh user@your_vps_ip

# 2. Navigate to backend
cd /path/to/telegram-insurance-platform/backend

# 3. Check if server is running
pm2 list
# or
ps aux | grep node

# 4. View backend logs
pm2 logs backend
# or
tail -f ~/.pm2/logs/backend-out.log
tail -f ~/.pm2/logs/backend-error.log

# 5. If not running, start it
npm start
# or
pm2 start server.js --name backend
```

### Option B: From Local Machine

```bash
# Test if backend is accessible
curl http://your_vps_ip:5000/health

# Expected response:
# {"status":"ok","timestamp":"2026-04-10T...","uptime":1234}

# If this fails, backend is down
```

---

## Fix #2: Run Diagnostic Tests

Run this script to test all backend connectivity:

```bash
# From project root on VPS
node test-backend-connection.js
```

**Expected Output:**
```
✅ Health Check: PASS
✅ Create User: PASS
✅ Claim Submission: PASS
✅ Claims List: PASS
✅ Users List: PASS

📈 Overall: 5/5 tests passed
```

---

## Fix #3: Check PostgreSQL Database

### Connect to Database

```bash
# From VPS terminal
psql -h localhost -U insurance_user -d insurance_db

# If prompted for password, enter: StrongPass@123 (or check .env)
```

### Check Claims Table

```sql
-- View all claims
SELECT * FROM claims;

-- Count claims by status
SELECT status, COUNT(*) FROM claims GROUP BY status;

-- View recent failed claims
SELECT * FROM claims WHERE status = 'pending_review' ORDER BY created_at DESC LIMIT 10;

-- Check if table exists
\dt claims

-- Exit PostgreSQL
\q
```

### Fix: Create Claims Table (if missing)

```sql
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

CREATE INDEX idx_claims_trader_id ON claims(trader_id);
CREATE INDEX idx_claims_telegram_id ON claims(telegram_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
```

---

## Fix #4: Verify Backend Configuration

Check your `.env` file in the backend directory:

```bash
# SSH into VPS
cd /path/to/telegram-insurance-platform/backend

# Show .env (be careful with credentials!)
cat .env | grep -E "POSTGRES|DATABASE|PORT|NODE_ENV"
```

**Expected values:**
```env
POSTGRES_HOST=localhost          # or your DB host
POSTGRES_PORT=5432              # default PostgreSQL port
POSTGRES_USER=insurance_user
POSTGRES_PASSWORD=StrongPass@123
POSTGRES_DB=insurance_db
NODE_ENV=production             # (or development)
PORT=5000
```

### Fix: Database Connection Issue

If PostgreSQL won't connect:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Check if service is listening
sudo netstat -tlnp | grep 5432
# or
sudo ss -tlnp | grep 5432
```

---

## Fix #5: Update Bot Environment

Ensure the bot's `.env` has correct backend URL:

```bash
# In telegram-bot/.env
cat .env | grep BACKEND_URL

# Should output:
# BACKEND_URL=http://your_vps_ip:5000
# or
# BACKEND_URL=http://localhost:5000 (if on same server)
```

---

## Manual Database Recovery

If claims are stuck in local memory, manually insert them into database:

```sql
INSERT INTO claims (
    claim_id, 
    trader_id, 
    user_id, 
    telegram_id, 
    amount, 
    description, 
    status, 
    created_at
) VALUES (
    'CLM_267189011_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
    '267189011',
    (SELECT id FROM users WHERE trader_id = '267189011' LIMIT 1),
    1076818877,
    100,
    'Insurance claim for trader 267189011',
    'approved',
    NOW()
);

-- Verify insertion
SELECT * FROM claims WHERE trader_id = '267189011';
```

---

## Quick Fix Checklist

- [ ] Backend server is running: `pm2 list` shows backend status
- [ ] PostgreSQL is running: `sudo systemctl status postgresql` 
- [ ] Backend URL is correct in `.env`: `BACKEND_URL=http://your_vps_ip:5000`
- [ ] Database connection works: Run `node test-backend-connection.js`
- [ ] Claims table exists: `SELECT * FROM claims LIMIT 1;`
- [ ] Backend logs show no errors: `pm2 logs backend`
- [ ] Network firewall allows port 5000: `curl http://your_vps_ip:5000/health`

---

## Restart Everything (Nuclear Option)

```bash
# SSH to VPS
ssh user@your_vps_ip

# Stop all services
pm2 stop all

# Restart database
sudo systemctl restart postgresql

# Restart backend
pm2 start server.js --name backend

# Restart bot
pm2 start bot.js --name telegram-bot

# Check status
pm2 list

# View logs
pm2 logs
```

---

## Next Steps

1. **Run diagnostic**: `node test-backend-connection.js`
2. **Check backend logs**: `pm2 logs backend`
3. **Verify database**: Connect via `psql` and check tables
4. **Test claim submission**: Approve a test claim in Telegram
5. **Monitor**: Watch real-time logs with `pm2 monit`

---

## Support Commands

```bash
# View all running processes
pm2 list

# View live logs
pm2 logs backend
pm2 logs telegram-bot

# Real-time monitoring
pm2 monit

# Save PM2 state (persist across reboots)
pm2 save
pm2 startup

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Delete PM2 apps
pm2 delete all
```

---

## Database Query Examples

```sql
-- View claims statistics
SELECT 
  status, 
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM claims 
GROUP BY status;

-- Find specific user's claims
SELECT * FROM claims WHERE trader_id = '267189011';

-- View recent claims
SELECT claim_id, trader_id, amount, status, created_at 
FROM claims 
ORDER BY created_at DESC 
LIMIT 20;

-- Check claim approval rate
SELECT 
  ROUND(COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*), 2) as approval_rate
FROM claims;
```

---

Last Updated: April 10, 2026
