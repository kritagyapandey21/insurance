# 📡 API Documentation

Complete reference for all PocketShield Insurance API endpoints.

---

## Base URLs

| Environment | URL |
|---|---|
| Local Development | `http://localhost:5000` |
| Staging | `https://staging-api.example.com` |
| Production | `https://api.pocketshield.io` |

---

## Authentication

All API endpoints accept a standard JSON POST request. No API key required for public endpoints.

**Headers:**
```
Content-Type: application/json
```

---

## Endpoints

### 1. Health Check

Check if the API is running.

```
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-03-28T12:00:00.000Z",
  "uptime": 3600.5
}
```

---

### 2. Check Payment ⭐ (Main Endpoint)

Verify payment and activate insurance coverage.

```
POST /api/check-payment
```

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "traderId": "TRADER_ABC123",
  "amount": 100.50,
  "fullName": "John Doe",
  "telegramId": 123456789,
  "uniquePaymentId": "PAY_123456789_1711612800000",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc822e5c5e4329"
}
```

**Request Field Validation:**
| Field | Type | Rules |
|-------|------|-------|
| traderId | string | 3-50 chars, alphanumeric + underscore/dash |
| amount | number | 100-1,000,000 USDT |
| fullName | string | 2+ characters |
| telegramId | number | Optional, valid Telegram ID |
| uniquePaymentId | string | Optional, unique per transaction |
| walletAddress | string | Optional, Ethereum address |

**Response (200 OK) - Success:**
```json
{
  "success": true,
  "message": "Payment verified. Insurance coverage activated!",
  "data": {
    "policyId": "507f1f77bcf86cd799439011",
    "traderId": "TRADER_ABC123",
    "coverageStartDate": "2024-03-28T12:00:00.000Z",
    "coverageEndDate": "2025-03-28T12:00:00.000Z",
    "coverageAmount": 100.50,
    "premiumPaid": 10.05
  }
}
```

**Response (409 Conflict) - Duplicate:**
```json
{
  "success": false,
  "message": "Duplicate payment detected. Insurance already active for this trader."
}
```

**Response (400 Bad Request) - Invalid Input:**
```json
{
  "success": false,
  "message": "Invalid amount. Minimum: 100 USDT, Maximum: 1,000,000 USDT"
}
```

**Response (402 Payment Required) - Verification Failed:**
```json
{
  "success": false,
  "message": "Payment verification failed"
}
```

**Error Codes:**
| Code | Meaning |
|------|---------|
| 400 | Bad request (validation error) |
| 402 | Payment not verified |
| 409 | Conflict (duplicate payment) |
| 500 | Server error |

---

### 3. Get User Status

Retrieve insurance status for a specific trader.

```
GET /api/user-status/:traderId
```

**Parameters:**
- `traderId` (path) - string - Trader ID

**Example:**
```
GET /api/user-status/TRADER_ABC123
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "traderId": "TRADER_ABC123",
    "fullName": "John Doe",
    "coverageStatus": "active",
    "coverageStartDate": "2024-03-28T12:00:00.000Z",
    "coverageEndDate": "2025-03-28T12:00:00.000Z",
    "initialAmount": 100.50,
    "paymentStatus": "confirmed"
  }
}
```

**Coverage Status Values:**
- `inactive` - No active coverage
- `active` - Coverage is currently active
- `expired` - Coverage period has ended
- `claimed` - Claim has been filed

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 4. Submit Claim

File an insurance claim.

```
POST /api/claim
```

**Request Body:**
```json
{
  "traderId": "TRADER_ABC123",
  "amount": 50.00,
  "description": "Smart contract vulnerability loss"
}
```

**Request Field Validation:**
| Field | Type | Rules |
|-------|------|-------|
| traderId | string | Required |
| amount | number | 0.01 - coverage amount |
| description | string | 10+ characters |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Claim submitted successfully. Our team will review it within 14 business days.",
  "data": {
    "claimId": "CLM_TRADER_ABC123_1711612800000",
    "status": "pending_review"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Response (409 Conflict):**
```json
{
  "success": false,
  "message": "No active coverage"
}
```

---

### 5. Platform Statistics

Get aggregate platform data.

```
GET /api/stats
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "activeUsers": 980,
    "totalPremiums": 125000.50,
    "totalCoverage": 1250000.00,
    "timestamp": "2024-03-28T12:00:00.000Z"
  }
}
```

---

## Rate Limiting

All endpoints are rate limited to prevent abuse.

**Limits:**
- 100 requests per 15 minutes per IP address
- Rate limit headers included in response

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1711612800
```

**Response (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

---

## CORS

Cross-Origin Resource Sharing is enabled for specified origins.

**Allowed Origins:**
- `http://localhost:3000` (development)
- `https://your-domain.vercel.app` (production)
- `https://t.me` (Telegram)

**Allowed Methods:**
- GET
- POST

**Allowed Headers:**
- Content-Type
- Authorization

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Additional error details (dev mode only)"
}
```

**Common Error Codes:**

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Missing required fields | Add missing fields |
| 400 | Invalid trader ID | Use alphanumeric chars only |
| 402 | Payment verification failed | Check transaction on blockchain |
| 409 | Duplicate payment | User already has active policy |
| 429 | Too many requests | Wait before retrying |
| 500 | Internal server error | Contact support |

---

## Request Examples

### Using cURL

**Check Payment:**
```bash
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "TRADER_123",
    "amount": 100,
    "fullName": "John Doe",
    "telegramId": 123456789,
    "uniquePaymentId": "PAY_123_456"
  }'
```

**Get Status:**
```bash
curl http://localhost:5000/api/user-status/TRADER_123
```

**Get Stats:**
```bash
curl http://localhost:5000/api/stats
```

### Using JavaScript Fetch

**Check Payment:**
```javascript
const response = await fetch('http://localhost:5000/api/check-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    traderId: 'TRADER_123',
    amount: 100,
    fullName: 'John Doe',
    telegramId: 123456789,
    uniquePaymentId: 'PAY_123_456'
  })
});

const data = await response.json();
console.log(data);
```

### Using Postman

1. Create new POST request
2. URL: `http://localhost:5000/api/check-payment`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "traderId": "TRADER_123",
  "amount": 100,
  "fullName": "John Doe",
  "telegramId": 123456789,
  "uniquePaymentId": "PAY_123_456"
}
```
5. Send

---

## Data Types

| Type | Description | Example |
|------|-------------|---------|
| string | Text | `"TRADER_ABC"` |
| number | Integer or float | `100.50` |
| timestamp | ISO 8601 | `"2024-03-28T12:00:00Z"` |
| boolean | True/False | `true` |
| array | List | `[1, 2, 3]` |

---

## Response Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid input |
| 402 | Payment Required | Payment verification failed |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate or invalid state |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

---

## Webhook Support (Future)

Webhooks for payment verification events:

```
POST your-app.com/webhooks/payment
```

**Payload:**
```json
{
  "event": "payment.verified",
  "traderId": "TRADER_123",
  "policyId": "507f1f77bcf86cd799439011",
  "timestamp": "2024-03-28T12:00:00Z"
}
```

---

## Testing Checklist

- [ ] All endpoints return correct status codes
- [ ] Error messages are descriptive
- [ ] Rate limiting works
- [ ] CORS headers present
- [ ] Response format is consistent
- [ ] Timestamps are in ISO 8601 format
- [ ] Sensitive data not exposed
- [ ] Performance < 500ms per request

---

**For support or API issues:** support@pocketshield.io
