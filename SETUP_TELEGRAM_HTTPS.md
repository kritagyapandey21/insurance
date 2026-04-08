# Setting Up HTTPS for Telegram Mini App Testing

Telegram requires HTTPS URLs for Web Apps. For local development, you need to create an HTTPS tunnel to your localhost:3000 mini app.

## Option 1: Using ngrok (Recommended for Local Testing)

### 1. Install ngrok
- Download from https://ngrok.com/download
- Or use `choco install ngrok` on Windows (if you have Chocolatey)

### 2. Create HTTPS Tunnel
```bash
ngrok http 3000
```

You'll see output like:
```
ngrok by @inconshreveable (Ctrl+C to quit)

Session Status                online
Account                       Pro
Version                       3.x.x
Region                        us
Forwarding                    https://example-ngrok.ngrok.io -> http://localhost:3000
Forwarding                    http://example-ngrok.ngrok.io -> http://localhost:3000
```

### 3. Update .env File
In `telegram-bot/.env`, replace:
```
MINI_APP_URL=https://your-domain.ngrok.io
```

Copy the HTTPS URL from ngrok (e.g., `https://example-ngrok.ngrok.io`)

### 4. Restart the Telegram Bot
```bash
cd telegram-bot
npm start
```

### 5. Test in Telegram
- Send `/start` to the bot
- Click the "🛡️ Get Insured Now" button
- Your mini app will open in the Telegram Web App!

---

## Option 2: Deploy Mini App to Vercel (Recommended for Production)

### 1. Deploy Frontend
```bash
npm install -g vercel
vercel --prod
```

### 2. Get HTTPS URL
Vercel automatically provides an HTTPS URL like:
`https://crypto-insurance-mini-app.vercel.app`

### 3. Update .env
```
MINI_APP_URL=https://crypto-insurance-mini-app.vercel.app
```

### 4. Restart Bot
```bash
npm start
```

---

## Option 3: Use Local Certificate (Advanced)

If you want to serve HTTPS locally without ngrok:
1. Generate self-signed certificate
2. Update mini app server to use HTTPS
3. But Telegram may reject self-signed certificates

**Not recommended** - Use ngrok or Vercel instead.

---

## Troubleshooting

### Error: "Only HTTPS links are allowed"
- Make sure MINI_APP_URL in `.env` starts with `https://`
- Restart the bot after updating .env

### Error: "ngrok command not found"
- Add ngrok to your system PATH
- Or use full path to ngrok executable

### ngrok tunnel expires
- ngrok URLs are temporary and change on each session
- Update MINI_APP_URL with new ngrok URL each time

---

## Current Status

- Mini App Server: Running on `http://localhost:3000`
- Bot Configuration: Waiting for HTTPS URL
- Tests: Set up HTTPS tunnel, then run `/start` command in Telegram

Done! Now your Telegram bot can properly open the Web App. ✅
