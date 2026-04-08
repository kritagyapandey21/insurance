# Telegram Affiliate Bot Setup Guide

## Overview
This guide explains how to set up Telegram API credentials and use the affiliate bot to verify trader registration status.

## What is @AffiliatePocketBot?
@AffiliatePocketBot is a Telegram bot that provides information about traders registered through your affiliate link on Pocket Option. It returns:
- Registration date
- Last activity date
- Account verification status
- Country
- FTD (First Deposit) amount and date
- Account balance

## Prerequisites
1. A personal Telegram account
2. Access to Telegram Developer Portal
3. NodeJS installed

## Step 1: Get Telegram API Credentials

### 1.1 Go to Telegram Developer Portal
- Visit: https://my.telegram.org/apps
- Log in with your Telegram account

### 1.2 Create an Application
- Click "Create new application"
- Fill in the required fields:
  - **App title**: `Insurance Platform` (or any name)
  - **Short name**: `insurance-platform`
  - **Platform**: Select "Desktop" or appropriate platform
  - **Description**: Optional

### 1.3 Get Your Credentials
After creating the app, you'll see:
- **api_id**: Copy this number
- **api_hash**: Copy this hash value

## Step 2: Configure Environment Variables

### 2.1 Update .env Files
Create or update the following files with your credentials:

**telegram-bot/.env**
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Telegram API Credentials (for Affiliate Bot verification)
TELEGRAM_API_ID=123456789
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE_NUMBER=+1234567890

# Mini App URL
MINI_APP_URL=https://your-mini-app.vercel.app

# Environment
NODE_ENV=development
```

Replace:
- `123456789` with your actual API ID
- `abcdef...` with your actual API hash
- `+1234567890` with your actual phone number (in international format)

### 2.2 Important Notes
- **Keep your API hash secret!** Do not commit it to version control.
- The phone number must match the account used with your API credentials.
- Use the format: `+[country_code][number]` (e.g., `+12025551234`)

## Step 3: Test the Setup

### 3.1 Run the Test Script
```bash
# From project root directory
node test-affiliate-bot.js <trader_id>

# Example
node test-affiliate-bot.js 12345678
```

### 3.2 Expected Output
```
============================================================
🤖 Affiliate Bot Trader Verification Test
============================================================

📋 Environment Check:
  ✅ TELEGRAM_API_ID: ***
  ✅ TELEGRAM_API_HASH: ***
  ✅ TELEGRAM_PHONE_NUMBER: ***

✅ All credentials set

🔐 Initializing Telegram client...

🔍 Verifying trader ID: 12345678

✅ Verification Result:
{
  "registered": true,
  "uid": "12345678",
  "regDate": "2024-03-15",
  "activityDate": "2024-03-30",
  "country": "US",
  "verified": true,
  "balance": "1250.50",
  "ftdAmount": "100.00",
  "ftdDate": "2024-03-15"
}

📊 Summary:
  • Registration Date: 2024-03-15
  • Last Activity: 2024-03-30
  • Country: US
  • Verified: Yes ✅
  • Balance: 1250.50
  • FTD Amount: 100.00
```

## Step 4: Integration Points

### 4.1 API Endpoint
The affiliate bot verification is available via:

**POST** `/api/verify-trader-affiliate`

Request body:
```json
{
  "traderId": "12345678"
}
```

Response (success):
```json
{
  "success": true,
  "message": "Trader verified through affiliate system",
  "data": {
    "success": true,
    "registered": true,
    "traderId": "12345678",
    "data": {
      "uid": "12345678",
      "regDate": "2024-03-15",
      "country": "US",
      "verified": true,
      "balance": "1250.50"
    },
    "updated": true
  }
}
```

### 4.2 Admin Functions
Use in your backend code:

```javascript
const admin = require('./admin');

// Verify a trader
const result = await admin.verifyTraderWithAffiliateBot('12345678');

if (result.success && result.registered) {
    console.log('Trader verified!', result.data);
} else {
    console.log('Trader not verified');
}
```

## Step 5: Troubleshooting

### Issue: "Missing Telegram API credentials"
- **Solution**: Check that all three environment variables are set in .env
- Run: `echo $TELEGRAM_API_ID` to verify

### Issue: "Error: Must be logged in"
- **Solution**: Telegram client lost session
- Delete the session file and authenticate again
- Session files are typically in a `.session` directory

### Issue: "No response from bot (timeout)"
- **Cause**: @AffiliatePocketBot might be offline or slow to respond
- **Solution**: Try again after a few seconds
- Responses are cached for 1 hour to avoid rate limiting

### Issue: "Invalid transaction hash format" on payment route
- **Solution**: Ensure you're providing the correct hash format for the network
- BEP-20 (BSC): 64 character hex string
- TRC-20 (Tron): 64 character hex string

## Security Best Practices

1. **Never commit .env files** to git
2. **Rotate API credentials** if you suspect compromise
3. **Use separate accounts** for development and production
4. **Enable 2FA** on your Telegram account
5. **Limit API access** - only use on trusted servers
6. **Monitor usage** - check Telegram's API activity logs

## Caching & Rate Limiting

- Trader verification results are cached for **1 hour**
- This prevents rate limiting from @AffiliatePocketBot
- Cache is in-memory and resets on server restart

## Production Deployment

When deploying to production:

1. Set all environment variables via your hosting provider's secrets management
2. Use a `.env.production` file (do not commit to git)
3. Consider using Docker secrets or AWS Secrets Manager
4. Ensure .env files are in .gitignore

Example for Vercel or Heroku:
```bash
# Set environment variable
heroku config:set TELEGRAM_API_ID=123456789
heroku config:set TELEGRAM_API_HASH=your_hash
heroku config:set TELEGRAM_PHONE_NUMBER=+1234567890
```

## Additional Resources

- [Telegram Client API Documentation](https://docs.telethon.dev/)
- [Telegram Developer Portal](https://my.telegram.org)
- [Pocket Option Affiliate Program](https://pocketoption.com/affiliates)

## Support

For issues with:
- **Telegram API setup**: Refer to Telegram Developer Documentation
- **Affiliate Bot**: Contact Pocket Option support
- **Our integration**: Check the error logs and test script output

---

**Last Updated**: March 30, 2026
