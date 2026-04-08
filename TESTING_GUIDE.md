# 🧪 Testing Guide

Complete testing scenarios for the PocketShield Insurance Platform.

---

## Test Environment Setup

### Prerequisites
- Node.js 16+ running
- MongoDB running locally or on Atlas
- All services started (bot, backend, mini-app)
- Telegram app installed (for bot testing)

### Test Data Setup

**Create test trader:**
```javascript
// In MongoDB console
db.users.insertOne({
  fullName: "Test User",
  traderId: "TEST_TRADER_001",
  initialAmount: 100,
  insuranceFee: 10,
  paymentStatus: "confirmed",
  coverageStatus: "active",
  createdAt: new Date()
})
```

---

## 1. Telegram Bot Testing

### Test Case 1.1: /start Command
**Steps:**
1. Open Telegram
2. Search for your bot
3. Send `/start`

**Expected Result:**
- ✅ Welcome message appears
- ✅ "Get Insured Now" button visible
- ✅ Professional formatting with emojis

**Test Data:**
```
User ID: Your Telegram ID
Bot response: Contains company name, emojis, button
```

### Test Case 1.2: /help Command
**Steps:**
1. Send `/help` command

**Expected Result:**
- ✅ List of commands appears
- ✅ Each command has description
- ✅ Support contact visible

### Test Case 1.3: /status Command
**Steps:**
1. Send `/status` command

**Expected Result:**
- ✅ Shows "No active insurance" initially
- ✅ After payment, shows active status
- ✅ Button to get insured

### Test Case 1.4: WebApp Button
**Steps:**
1. Click "Get Insured Now" button
2. Should open mini app

**Expected Result:**
- ✅ Mini app loads in fullscreen
- ✅ Terms screen visible
- ✅ No errors in console

---

## 2. Mini App Frontend Testing

### Test Case 2.1: Screen Navigation
**Steps:**
1. Load mini app
2. Accept terms
3. Fill user details
4. Click "Proceed to Payment"
5. Click "I Have Paid"
6. Wait for verification

**Expected Result:**
- ✅ All screens load correctly
- ✅ Smooth transitions between screens
- ✅ No console errors
- ✅ Loading animations work

### Test Case 2.2: Form Validation - Full Name
**Test Data:**
| Input | Expected | Result |
|-------|----------|--------|
| Empty | Error | ✅ |
| "J" | Error: min 2 | ✅ |
| "John Doe" | Accept | ✅ |
| "John Doe " | Trim & Accept | ✅ |

**Steps:**
1. Go to User Details screen
2. Try different inputs
3. Watch error messages

### Test Case 2.3: Form Validation - Trader ID
**Test Data:**
| Input | Expected | Result |
|-------|----------|--------|
| Empty | Error | ✅ |
| "AB" | Error: min 3 | ✅ |
| "TRADER-001" | Accept | ✅ |
| "Trader@123" | Error: invalid chars | ✅ |
| "Valid_ID_123" | Accept | ✅ |

### Test Case 2.4: Form Validation - Amount
**Test Data:**
| Input | Expected | Result |
|-------|----------|--------|
| Empty | Error | ✅ |
| "50" | Error: min 100 | ✅ |
| "100" | Accept | ✅ |
| "1000000" | Accept | ✅ |
| "1000001" | Error: max | ✅ |
| "-100" | Error | ✅ |

### Test Case 2.5: Fee Calculation
**Test Data:**
| Amount | Fee | Total | Result |
|--------|-----|-------|--------|
| 100 | 10 | 110 | ✅ |
| 500 | 50 | 550 | ✅ |
| 1000 | 100 | 1100 | ✅ |

**Steps:**
1. Enter different amounts
2. Check fee display updates real-time

### Test Case 2.6: QR Code Generation
**Steps:**
1. Go to Payment screen
2. Check QR code appears
3. Scan with phone camera

**Expected Result:**
- ✅ QR code displays
- ✅ Shows payment instruction
- ✅ Valid ethereum: URL format

### Test Case 2.7: Copy Wallet Address
**Steps:**
1. On Payment screen
2. Click copy button (📋)
3. Paste in another field

**Expected Result:**
- ✅ Alert confirms copy
- ✅ Wallet address copied
- ✅ Correct address pasted

### Test Case 2.8: Payment Success Flow
**Steps:**
1. Complete form
2. Show payment screen
3. Click "I Have Paid"
4. Wait for verification

**Expected Result:**
- ✅ Verification screen shows
- ✅ Loader animates
- ✅ Success modal appears
- ✅ Confetti animation plays
- ✅ Auto-closes after 3 seconds

### Test Case 2.9: Mobile Responsiveness
**Steps:**
1. Open in mobile device emulator (F12)
2. Test at different sizes:
   - 320px (iPhone SE)
   - 375px (iPhone 12)
   - 425px (Galaxy S21)
   - 768px (iPad)

**Expected Result:**
- ✅ All elements visible
- ✅ Text readable
- ✅ Buttons clickable
- ✅ No horizontal scroll
- ✅ Forms full width

### Test Case 2.10: Dark Theme
**Steps:**
1. Load mini app
2. Check all colors

**Expected Result:**
- ✅ Dark background (#0a0e27)
- ✅ Green accents (#00ff88)
- ✅ High contrast text
- ✅ Glassmorphism visible
- ✅ Animations smooth

---

## 3. Backend API Testing

### Test Case 3.1: Health Check
**Request:**
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.456
}
```

**Result:** ✅

### Test Case 3.2: Check Payment - Valid
**Request:**
```bash
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "VALID_TEST_001",
    "amount": 100,
    "fullName": "Test User",
    "telegramId": 123456789,
    "uniquePaymentId": "PAY_TEST_001"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment verified...",
  "data": {
    "policyId": "...",
    "traderId": "VALID_TEST_001",
    "coverageAmount": 100,
    "premiumPaid": 10
  }
}
```

**Result:** ✅

### Test Case 3.3: Check Payment - Missing Fields
**Request - Missing amount:**
```bash
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "TEST_001",
    "fullName": "Test User"
  }'
```

**Expected Response:**
- ✅ 400 status code
- ✅ Error message: "Missing required fields"

### Test Case 3.4: Check Payment - Invalid Amount
**Request - Amount too low:**
```bash
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "TEST_002",
    "amount": 50,
    "fullName": "Test User"
  }'
```

**Expected Response:**
- ✅ 400 status code
- ✅ Error: "Minimum deposit is 100 USDT"

### Test Case 3.5: Check Payment - Duplicate
**Steps:**
1. Submit payment for TRADER_001
2. Submit payment again for same trader

**Expected Response - Second request:**
- ✅ 409 status code
- ✅ Error: "Duplicate payment detected"

### Test Case 3.6: Get User Status - Exists
**Request:**
```bash
curl http://localhost:5000/api/user-status/VALID_TEST_001
```

**Expected Response:**
- ✅ 200 status code
- ✅ User data returned

### Test Case 3.7: Get User Status - Not Found
**Request:**
```bash
curl http://localhost:5000/api/user-status/NONEXISTENT
```

**Expected Response:**
- ✅ 404 status code
- ✅ Error: "User not found"

### Test Case 3.8: Get Stats
**Request:**
```bash
curl http://localhost:5000/api/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "activeUsers": 3,
    "totalPremiums": 500,
    "totalCoverage": 5000
  }
}
```

**Result:** ✅

### Test Case 3.9: Rate Limiting
**Steps:**
1. Send 101 requests in 15 seconds
2. Check 101st request response

**Expected Result:**
- ✅ 429 Too Many Requests
- ✅ Error message: "Too many requests"

### Test Case 3.10: CORS Headers
**Steps:**
1. Send request from different origin
2. Check response headers

**Expected Headers:**
- ✅ Access-Control-Allow-Origin present
- ✅ Access-Control-Allow-Methods: GET, POST
- ✅ Access-Control-Allow-Headers present

---

## 4. Database Testing

### Test Case 4.1: User Creation
**Steps:**
1. Submit valid payment
2. Check MongoDB

**Expected:**
- ✅ User document created
- ✅ All fields populated
- ✅ Timestamps set

### Test Case 4.2: User Update
**Steps:**
1. Submit payment for existing trader
2. Check if updated (not duplicated)

**Expected:**
- ✅ User updated
- ✅ Only one document per trader
- ✅ updatedAt timestamp changed

### Test Case 4.3: Indexes
**Steps:**
```javascript
db.users.getIndexes()
```

**Expected Indexes:**
- ✅ traderId index
- ✅ telegramId index
- ✅ uniquePaymentId index
- ✅ transactionHash index

### Test Case 4.4: Data Validation
**Steps:**
1. Try to insert invalid data directly
2. Check MongoDB response

**Expected:**
- ✅ Validation errors returned
- ✅ Invalid data rejected

---

## 5. Security Testing

### Test Case 5.1: SQL Injection
**Attempt:**
```
traderId: "TRADER' OR '1'='1"
```

**Expected:**
- ✅ Treated as literal string
- ✅ No injection possible

### Test Case 5.2: XSS Prevention
**Attempt in full name:**
```
<script>alert('xss')</script>
```

**Expected:**
- ✅ Treated as text
- ✅ Not executed
- ✅ Sanitized

### Test Case 5.3: Invalid Ethereum Address
**Attempt:**
```
walletAddress: "0xINVALID"
```

**Expected:**
- ✅ Validation fails
- ✅ 400 error returned

### Test Case 5.4: Environment Variables
**Steps:**
1. Check backend code
2. Verify no hardcoded secrets

**Expected:**
- ✅ All keys in .env
- ✅ .env in .gitignore
- ✅ .env.example provided

### Test Case 5.5: API Key Exposure
**Steps:**
1. Send various requests
2. Check responses

**Expected:**
- ✅ No API keys in response
- ✅ No sensitive data exposed
- ✅ Error messages generic

---

## 6. End-to-End Testing

### Test Case 6.1: Complete User Journey
**Steps:**
1. Start telegram bot → /start
2. Click "Get Insured Now"
3. Accept terms
4. Fill form (full name, trader ID, amount)
5. Review payment details
6. Submit payment
7. Wait for verification
8. See success screen
9. App closes automatically

**Expected Result:**
- ✅ All steps work smoothly
- ✅ No errors in console
- ✅ Data saved to database
- ✅ User can check status

---

## Test Checklist

### Frontend ✓
- [ ] All screens render correctly
- [ ] Form validation works
- [ ] Animations smooth
- [ ] Mobile responsive
- [ ] Dark theme applied
- [ ] No console errors
- [ ] QR code generates
- [ ] Copy button works

### Backend ✓
- [ ] Health check works
- [ ] Payment endpoint responds
- [ ] Validation rejects bad input
- [ ] Rate limiting enforces limit
- [ ] CORS headers present
- [ ] Error handling graceful
- [ ] Database queries fast
- [ ] Stats accurate

### Bot ✓
- [ ] /start shows button
- [ ] /help lists commands
- [ ] /status shows info
- [ ] Button opens mini app
- [ ] No errors on unknown commands

### Database ✓
- [ ] Connections stable
- [ ] Indexes exist
- [ ] Data persists
- [ ] Queries optimized
- [ ] Backups work

### Security ✓
- [ ] No XSS vulnerabilities
- [ ] No SQL injection possible
- [ ] API keys secure
- [ ] CORS restrictive
- [ ] Rate limiting active
- [ ] HTTPS in production

---

## Performance Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Page load | < 2s | | |
| API response | < 500ms | | |
| Form submit | < 1s | | |
| Payment check | < 3s | | |
| Database query | < 100ms | | |

---

## Automated Testing (Optional)

### Jest Setup
```bash
npm install --save-dev jest supertest
```

### Example Test:
```javascript
// tests/payment.test.js
const request = require('supertest');
const app = require('../server');

describe('Payment APIs', () => {
  test('POST /api/check-payment returns 200', async () => {
    const response = await request(app)
      .post('/api/check-payment')
      .send({
        traderId: 'TEST_001',
        amount: 100,
        fullName: 'Test'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Run Tests:
```bash
npm test
```

---

## Regression Testing

Run these tests before every release:

1. ✅ User signup flow
2. ✅ Payment verification
3. ✅ Status checking
4. ✅ Bot commands
5. ✅ Mobile responsiveness
6. ✅ API rate limiting
7. ✅ Database persistence
8. ✅ Error handling

---

## Report Template

```
Date: 2024-03-28
Tester: [Name]
Build: v1.0.0

SUMMARY:
- Total Tests: 50
- Passed: 50
- Failed: 0
- Bugs Found: 0

ISSUES:
[List any bugs found]

RECOMMENDATIONS:
[Suggestions for improvement]

Sign-off: ✅ READY FOR PRODUCTION
```

---

**Happy Testing! 🧪**
