# Payment Verification Guide

## Overview

The PocketShield Insurance platform supports real-time blockchain payment verification for BEP20 (Binance Smart Chain) and TRC20 (Tron Network) USDT payments.

## Transaction Verification Methods

### Demo Mode (for Development/Testing)

Demo mode allows you to test the payment verification system without making real blockchain transactions.

**Demo Transaction Hashes:**
- BEP20: Any transaction hash starting with `demo-bep20` (e.g., `demo-bep20-test`)
- TRC20: Any transaction hash starting with `demo-trc20` (e.g., `demo-trc20-test`)

**Usage:**
1. Fill out the payment form as normal
2. Enter a demo transaction hash (e.g., `demo-bep20-verification`)
3. Click "Verify Payment"
4. The system will immediately confirm the payment and activate coverage

**Benefits:**
- Test the entire payment workflow without spending money
- No external API calls needed
- Instant verification response
- Perfect for QA and user testing

### Real Blockchain Verification

For production use, the system verifies actual blockchain transactions through external APIs:

#### BEP20 (Binance Smart Chain)
- **API:** BscScan API (compatible with Etherscan)
- **Network:** BSC Mainnet (Chain ID: 56)
- **Confirmation Requirement:** Minimum 1 confirmation
- **Website:** https://bscscan.com

#### TRC20 (Tron Network)
- **API:** Tronscan API
- **Network:** Tron Mainnet
- **Confirmation Requirement:** Minimum 1 confirmation
- **Website:** https://tronscan.org

## Configuration

### Environment Variables (.env)

```bash
# Payment Network Configuration
BEP20_USDT_WALLET=0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A
TRC20_USDT_WALLET=TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd

# Default verification network
PAYMENT_VERIFICATION_METHOD=bep20

# Minimum confirmations (can be overridden per network)
MIN_CONFIRMATIONS=3

# Optional API Keys (BscScan and Tronscan allow unauthenticated requests)
BSCSCAN_API_KEY=YourBscScanApiKeyHere
TRONSCAN_API_KEY=YourTronscanApiKeyHere
```

### Getting API Keys (Optional but Recommended)

**BscScan API Key:**
1. Visit https://bscscan.com/apis
2. Create an account and login
3. Create a new API key
4. Set the key in `.env` as `BSCSCAN_API_KEY`

**Tronscan API Key:**
1. Visit https://tronscan.org/
2. Create an account and login
3. Navigate to API keys section
4. Generate a new key
5. Set the key in `.env` as `TRONSCAN_API_KEY`

## Payment Verification Flow

### Frontend Flow (mini-app)

1. User enters insurance amount (minimum 10 USDT)
2. User selects network (BEP20 or TRC20)
3. QR code displays with payment URI showing wallet address
4. User sends USDT to the wallet address (using their wallet app)
5. User enters transaction hash from their wallet
6. User clicks "Verify Payment"
7. System verifies transaction on blockchain
8. If verified: Coverage activated, confirmation displayed
9. If failed: Error message shown with reason

### Backend Verification Process

1. **Receives Payment Request:**
   - Transaction Hash
   - Expected Amount (in USDT)
   - Network (bep20 or trc20)

2. **Demo Mode Check:**
   - If txHash starts with "demo-bep20" or "demo-trc20", use demo verification
   - Instantly return success

3. **Real Verification:**
   - Check BscScan (for BEP20) or Tronscan (for TRC20) API
   - Verify transaction status
   - Verify amount matches expected
   - Verify confirmations meet minimum requirement

4. **Success/Failure:**
   - Success: Create/update user record with "confirmed" status
   - Failure: Return error message with reason

## Testing

### Quick Test with Demo Mode

```bash
# Using PowerShell
curl -X POST http://localhost:5000/api/check-payment `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"traderId":"test-1","amount":10,"fullName":"Test","telegramId":123,"network":"bep20","txHash":"demo-bep20-test"}'
```

### Test with cURL (Linux/Mac)

```bash
curl -X POST http://localhost:5000/api/check-payment \
  -H "Content-Type: application/json" \
  -d '{
    "traderId": "test-1",
    "amount": 10,
    "fullName": "Test User",
    "telegramId": 123,
    "network": "bep20",
    "txHash": "demo-bep20-test"
  }'
```

### Payment Minimum Requirements

- **Minimum Amount:** 10 USDT
- **Maximum Amount:** 1,000,000 USDT
- **Insurance Fee:** 10% of deposit amount
- **Trader ID:** 3-50 alphanumeric characters

## Supported Networks

| Network | Token | Wallet Address | Explorer | API |
|---------|-------|---|--------|-------|
| BEP20 (BSC) | USDT (18 decimals) | 0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A | https://bscscan.com | BscScan |
| TRC20 (Tron) | USDT (6 decimals) | TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd | https://tronscan.org | Tronscan |

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|---------|
| "Transaction not found" | TX hash doesn't exist on blockchain | Verify transaction hash is correct |
| "Transaction failed" | TX status is failed/reverted | Resend transaction from wallet |
| "Incorrect recipient address" | Payment sent to wrong wallet | Send to the displayed address again |
| "Amount mismatch" | Amount sent differs from expected | Send exact amount specified |
| "Transaction not confirmed" | TX not yet finalized on chain | Wait for transaction to be included in block |
| "BEP20 verification failed" | BscScan API error | Check API key or try again later |
| "TRC20 verification failed" | Tronscan API error | Check API key or try again later |

## Frontend QR Code Format

The QR code displays payment URIs in network-specific formats:

**BEP20 URI:**
```
bep20://0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A?amount=10&decimals=18
```

**TRC20 URI:**
```
tron://TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd?amount=10&decimals=6
```

These URIs can be scanned by mobile wallets that support these blockchain networks.

## API Endpoints

### GET /api/payment-options

Get available payment networks and wallet addresses.

**Response:**
```json
{
  "success": true,
  "data": {
    "BEP20 (BSC)": {
      "network": "BEP20",
      "token": "USDT",
      "walletAddress": "0x9BBC6909Db28aC63516d4B60Eea3352ee0e3Ed5A",
      "chainId": 56,
      "blockExplorer": "https://bscscan.com"
    },
    "TRC20 (Tron)": {
      "network": "TRC20",
      "token": "USDT",
      "walletAddress": "TWhjbs9JMTuhMTJTqGBcdydMPeef5f6ytd",
      "chainId": "Tron Mainnet",
      "blockExplorer": "https://tronscan.org"
    }
  }
}
```

### POST /api/check-payment

Verify payment and activate insurance coverage.

**Request:**
```json
{
  "traderId": "trader-123",
  "amount": 50,
  "fullName": "John Doe",
  "telegramId": 123456789,
  "uniquePaymentId": "unique-id",
  "walletAddress": "user-wallet",
  "network": "bep20",
  "txHash": "0x..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment verified. Insurance coverage activated!",
  "data": {
    "policyId": "...",
    "traderId": "trader-123",
    "coverageStartDate": "2026-03-29T...",
    "coverageEndDate": "2027-03-29T...",
    "coverageAmount": 50,
    "premiumPaid": 5,
    "transactionHash": "0x...",
    "confirmations": 5
  }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "message": "Payment verification failed: Amount mismatch",
  "details": {
    "success": false,
    "error": "Amount mismatch"
  }
}
```

## Troubleshooting

### Backend Not Responding

1. Check if backend is running: `netstat -ano | findstr :5000` (Windows)
2. Check MongoDB connection: Look for "✅ MongoDB connected" in logs
3. Check for errors in backend console output

###Demo Mode Not Working

1. Ensure transaction hash starts with `demo-bep20` or `demo-trc20`
2. Verify network parameter matches: `"network": "bep20"` or `"network": "trc20"`
3. Check that minimum amount is 10 USDT

### Real Blockchain Verification Failing

1. Verify transaction hash is correct and exists on blockchain
2. Verify sent amount matches expected amount (within ±5%)
3. Verify payment sent to correct wallet address
4. Check that transaction is confirmed on blockchain
5. Try with demo mode first to verify system is working

## Development vs Production

### Development (.env)
```bash
NODE_ENV=development
PAYMENT_VERIFICATION_METHOD=bep20
MIN_CONFIRMATIONS=1
# Use demo transactions for testing
```

### Production (.env)
```bash
NODE_ENV=production
PAYMENT_VERIFICATION_METHOD=bep20
MIN_CONFIRMATIONS=12
# Only real blockchain transactions
BSCSCAN_API_KEY=your-real-api-key
TRONSCAN_API_KEY=your-real-api-key
```

## Support

For issues or questions contact support@pocketshield.io

Last Updated: 2026-03-29
