# Claim Processing - Fixed ✅

## Issues Fixed

### 1. **Claims Not Saved to Database** ❌ → ✅ FIXED
**Before:**
```javascript
// Placeholder endpoint - claims only logged, never saved
console.log(`[Claim Submitted] Trader: ${traderId}...`);
res.json({ claimId: `CLM_${traderId}_${Date.now()}` }); // Fake ID!
```

**After:**
```javascript
// Real implementation - claims saved to PostgreSQL
const claimId = `CLM_${traderId}_${Date.now()}`;
const claim = new Claim({
    claimId: claimId,
    traderId: traderId,
    userId: user.id,
    telegramId: telegramId,
    amount: parseFloat(amount),
    description: description.trim(),
    status: "pending_review"
});
await claim.save(); // ✅ Actually saved to database!
```

---

### 2. **Admin Only Sees In-Memory Objects (Lost on Restart)** ❌ → ✅ FIXED
**Before:**
```javascript
// telegram-bot/bot.js
global.claimData = global.claimData || {};  // In-memory storage
const claimsArray = Object.entries(global.claimData);  // Lost on restart!
```

**After:**
```javascript
// Queries persistent database
const response = await axios.get(`${BACKEND_URL}/api/claims?status=pending_review`);
const claims = response.data.data;  // ✅ From PostgreSQL - survives restarts
```

---

## What Was Created

### 1. **New Claim Model** (`backend/models/Claim.js`)
- ✅ PostgreSQL table with full schema
- ✅ Automatic index creation for fast queries
- ✅ Mongoose-like interface matching User model
- ✅ CRUD operations (Create, Read, Update, Delete)

**Database Table Structure:**
```sql
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    claim_id TEXT UNIQUE,
    trader_id TEXT NOT NULL,
    user_id INTEGER,
    telegram_id BIGINT,
    amount NUMERIC(20, 8),
    description TEXT,
    status TEXT,           -- pending_review|approved|rejected|paid
    admin_notes TEXT,
    denial_reason TEXT,
    payout_amount NUMERIC,
    payout_tx_hash TEXT,
    evidence_urls TEXT,    -- JSON array
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
```

### 2. **New API Endpoints** (`backend/routes/payment.js`)

#### Claim Submission
```javascript
POST /api/claim
Body: {
    traderId: "TRADER_ABC",
    amount: 100,
    description: "Total loss of account",
    telegramId: 123456789
}
Response: {
    success: true,
    claimId: "CLM_TRADER_ABC_1712000000000",
    status: "pending_review"
}
```

#### Admin Endpoints (NEW)
```javascript
GET    /api/claims                     // Get all claims with filters
GET    /api/claims/:claimId           // Get specific claim
GET    /api/claims/user/:traderId     // Get user's claims
PATCH  /api/claims/:claimId/approve   // Admin approve + set payout
PATCH  /api/claims/:claimId/reject    // Admin reject with reason
```

### 3. **Backend Improvements**

**server.js:**
- ✅ Added Claim model import
- ✅ Initialize claims table on startup
- ✅ Log table initialization status

**payment.js:**
- ✅ Import Claim model
- ✅ Full claim validation logic
- ✅ Duplicate claim detection (24-hour window)
- ✅ Coverage expiration check
- ✅ User verification
- ✅ Admin management endpoints
- ✅ Proper error handling with HTTP status codes

### 4. **Frontend (Telegram Bot) Improvements**

**bot.js - Admin Claims View:**
- ✅ Fetch claims from `/api/claims` endpoint
- ✅ Display persistent data (not lost on restart)
- ✅ Show claim details (ID, trader ID, amount, status)
- ✅ Pagination ready

**bot.js - Claim Submission:**
- ✅ Call `/api/claim` API endpoint
- ✅ Save claim to database
- ✅ Returns real claim ID from database
- ✅ Admin notification with review buttons
- ✅ Proper error handling

---

## Data Flow - BEFORE vs AFTER

### ❌ BEFORE (Broken)
```
User clicks "Claim Insurance"
    ↓
Bot stores in global.claimData (memory)
    ↓
Bot restart happens
    ↓
global.claimData = {} (LOST!)
    ↓
Admin sees nothing
```

### ✅ AFTER (Working)
```
User clicks "Claim Insurance"
    ↓
Bot calls POST /api/claim
    ↓
Backend saves to PostgreSQL database
    ↓
Returns claim ID
    ↓
Bot restart happens
    ↓
Database still has all claims
    ↓
Admin calls GET /api/claims
    ↓
Retrieves all persistent claims from DB
```

---

## Validation Added

✅ Trader ID exists and has insurance  
✅ Coverage is active (not expired, not inactive)  
✅ Coverage hasn't ended yet  
✅ User doesn't have pending claim in last 24h  
✅ Claim amount is valid (> 0, < 1,000,000)  
✅ Description is not empty  

---

## Error Handling

All endpoints return proper HTTP status codes:
- `400` - Missing/invalid fields
- `404` - User/claim not found
- `409` - No active coverage / Duplicate claim
- `500` - Server error

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/models/Claim.js` | ✅ **CREATED** - New model |
| `backend/server.js` | ✅ Import Claim, initialize table |
| `backend/routes/payment.js` | ✅ Claim submission + 5 new endpoints |
| `telegram-bot/bot.js` | ✅ Submit to API, fetch from DB |

---

## Testing the Fix

### 1. Start the backend
```bash
cd backend
npm install
npm start
```

### 2. Start the Telegram bot
```bash
cd telegram-bot
npm install
npm start
```

### 3. Test claim submission
- User sends trader ID → Claim saved to DB
- Check database:
```sql
SELECT * FROM claims ORDER BY created_at DESC;
```

### 4. Test admin claim retrieval
- Admin views pending claims → Fetches from database
- Restart bot → Claims still visible ✅

### 5. Test API directly
```bash
# Submit claim
curl -X POST http://localhost:5000/api/claim \
  -H "Content-Type: application/json" \
  -d '{"traderId":"TRADER_123","amount":50,"description":"Total loss"}'

# Get all pending claims
curl http://localhost:5000/api/claims?status=pending_review

# Approve claim
curl -X PATCH http://localhost:5000/api/claims/CLM_123/approve \
  -H "Content-Type: application/json" \
  -d '{"payoutAmount":500,"adminNotes":"Verified"}'
```

---

## What's Still TODO

- [ ] Add payout processing (send actual funds)
- [ ] Add file upload for evidence
- [ ] Add claim dispute/appeal system
- [ ] Add claim history to mini-app
- [ ] Add email notifications
- [ ] Add KYC verification before payout
- [ ] Add claim analytics dashboard
- [ ] Add fraud detection

---

## Status: 🟢 FIXED

✅ Claims now saved to persistent database  
✅ Admin can retrieve all claims anytime  
✅ Data survives bot restarts  
✅ Proper API endpoints created  
✅ Full validation implemented  
✅ Error handling in place  

Next priority: Fix USDT decimal error in BEP20 verification
