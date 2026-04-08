# 🏗️ Project Architecture & Structure

Complete technical overview of the PocketShield Insurance Platform.

---

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TELEGRAM USER                           │
└────────────┬────────────────────────────────────────────────┘
             │
             │ /start
             ▼
┌──────────────────────────────────────────────────────────────┐
│            TELEGRAM BOT (telegraf)                           │
│  • /start → Welcome + Button                               │
│  • Button → Opens WebApp                                    │
│  • /help → Show commands                                    │
│  • /status → Check coverage                                 │
└────────────┬─────────────────────────────────────────────────┘
             │
             │ WebApp URL with params
             ▼
┌──────────────────────────────────────────────────────────────┐
│          TELEGRAM MINI APP (Vanilla JS)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Screen 1: Terms & Agreement                        │    │
│  │ Screen 2: User Details (Name, ID, Amount)         │    │
│  │ Screen 3: Payment (Fee, Wallet, QR)               │    │
│  │ Screen 4: Verification (Loader)                    │    │
│  │ Screen 5: Success (Confetti + Close)              │    │
│  └──────────────────┬─────────────────────────────────┘    │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      │ POST /api/check-payment
                      ▼
        ┌─────────────────────────────────┐
        │     BACKEND API (Express)       │
        │  ┌───────────────────────────┐  │
        │  │ /api/check-payment        │  │
        │  │ • Validate input          │  │
        │  │ • Check for duplicates    │  │
        │  │ • Verify blockchain tx    │  │
        │  │ • Create/update user      │  │
        │  └──────────┬────────────────┘  │
        └─────────────┼──────────────────┘
                      │
                      ├─────────────────────┐
                      │                     │
                      ▼                     ▼
            ┌──────────────────┐  ┌──────────────────┐
            │  ETHERSCAN API   │  │ BLOCKCHAIN NODE  │
            │  • Verify TX     │  │ • RPC endpoint   │
            │  • Check status  │  │ • Confirmations  │
            └──────────────────┘  └──────────────────┘
                      │                     │
                      └─────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │   MongoDB Database   │
                    │  • Store user data   │
                    │  • Payment records   │
                    │  • Coverage info     │
                    └──────────────────────┘
```

---

## 📁 Complete File Listing

### TELEGRAM BOT (`/telegram-bot`)

| File | Lines | Purpose |
|------|-------|---------|
| `bot.js` | 120 | Main bot logic with commands |
| `package.json` | 25 | Dependencies: telegraf, dotenv |
| `.env.example` | 8 | Environment template |
| `Dockerfile` | 12 | Docker containerization |

**Key Functions:**
- `bot.start()` - Welcome message + WebApp button
- `bot.help()` - Command list
- `bot.command('status')` - Check insurance status
- `bot.catch()` - Error handling

---

### MINI APP FRONTEND (`/mini-app`)

#### HTML (`index.html` - 600 lines)
| Section | Purpose |
|---------|---------|
| Loading Screen | Initial loader |
| Terms Screen | Agreement with checkbox |
| User Details | Form with validation |
| Payment Screen | Wallet & QR display |
| Verification Screen | Animated loader |
| Success Screen | Modal with confetti |
| Confetti Canvas | Animation layer |

#### CSS (`css/styles.css` - 800 lines)

**Key Sections:**
```
1. Variables & Theme (40 lines)
2. Base Styles (50 lines)
3. Screen Management (30 lines)
4. Loading State (40 lines)
5. Terms & Checkbox (60 lines)
6. Forms & Inputs (100 lines)
7. Insurance Fee Display (40 lines)
8. Payment Screen (80 lines)
9. Verification Screen (50 lines)
10. Success Modal (80 lines)
11. Buttons (60 lines)
12. Glassmorphism (20 lines)
13. Animations (100 lines)
14. Responsive Design (100 lines)
```

#### JavaScript (`js/app.js` - 500 lines)

**Core Classes:**
```javascript
class InsuranceApp {
  constructor()
  init()
  setupTelegram()
  setupEventListeners()
  showScreen()
  validateUserDetails()
  calculateFee()
  initializePaymentScreen()
  generateQRCode()
  verifyPayment()
  showSuccessScreen()
  closeApp()
}
```

**Methods Breakdown:**
| Method | Lines | Purpose |
|--------|-------|---------|
| `init()` | 5 | Bootstrap |
| `setupTelegram()` | 15 | SDK integration |
| `showScreen()` | 20 | Screen switching |
| `validateUserDetails()` | 40 | Form validation |
| `calculateFee()` | 10 | 10% calculation |
| `verifyPayment()` | 30 | API call + verification |

#### Confetti (`js/confetti.js` - 80 lines)

```javascript
class Confetti {
  constructor()      // Setup canvas
  create()           // Generate particles
  animate()          // Animation loop
  stop()             // Cleanup
}
```

---

### BACKEND API (`/backend`)

#### Server (`server.js` - 100 lines)

```javascript
// Middleware Stack:
app.use(helmet())           // Security
app.use(cors())             // CORS
app.use(express.json())     // Body parser
app.use(rateLimit())        // Rate limiting
app.use('/api', routes)     // Routes

// MongoDB Connection
mongoose.connect(MONGO_URI)

// Error Handling
app.use(errorHandler)
```

#### Database Model (`models/User.js` - 120 lines)

```javascript
UserSchema {
  // Personal
  fullName        // String, required
  traderId        // String, unique, required
  telegramId      // Number, unique, sparse
  
  // Insurance
  initialAmount   // Number, 100-1M
  insuranceFee    // Number (calculated)
  
  // Payment
  paymentStatus   // pending|confirmed|failed
  transactionHash // Unique, sparse
  walletAddress   // Ethereum address
  uniquePaymentId // Unique payment ID
  
  // Coverage
  coverageStatus  // inactive|active|expired|claimed
  coverageStartDate
  coverageEndDate
  
  // Metadata
  ipAddress
  userAgent
  createdAt
  updatedAt
  paymentVerifiedAt
}
```

**Indexes Created:**
```
traderId         // Fast lookup
telegramId       // Fast lookup
uniquePaymentId  // Duplicate prevention
transactionHash  // Payment tracking
paymentStatus    // Query filtering
createdAt        // Time-based queries
```

#### Payment Routes (`routes/payment.js` - 200+ lines)

```javascript
// Endpoints:
POST   /api/check-payment
GET    /api/user-status/:traderId
POST   /api/claim
GET    /api/stats

// Each endpoint:
1. Input validation
2. Database operations
3. External API calls (if needed)
4. Error handling
5. Response formatting
```

**Endpoint Details:**
| Endpoint | Method | Purpose | Returns |
|----------|--------|---------|---------|
| check-payment | POST | Verify & activate | Policy ID |
| user-status | GET | Check coverage | User data |
| claim | POST | File claim | Claim ID |
| stats | GET | Platform data | Aggregates |

#### Payment Service (`services/paymentService.js` - 150 lines)

```javascript
class PaymentService {
  constructor()                          // Setup Web3
  verifyTransactionEtherscan()          // Etherscan API
  verifyTransactionWeb3()                // Web3 RPC
  verifyPaymentNOWPayments()            // NOWPayments
  verifyPayment()                        // Main method
  isDuplicatePayment()                   // Duplicate check
  generateUniquePaymentAmount()          // Amount variance
}
```

**Verification Methods:**
1. **Etherscan API** (Default)
   - Fast
   - Reliable
   - No node required
   - Free tier available

2. **Web3.js** (Alternative)
   - Direct RPC calls
   - Needs full node
   - More control
   - Faster

3. **NOWPayments** (Multi-chain)
   - Multi-blockchain support
   - One API for all chains
   - Payment processor

#### Validation Middleware (`middleware/validation.js` - 200+ lines)

```javascript
validatePaymentRequest()      // Validates /api/check-payment
validatePaymentVerification() // Validates verification
validateEmail()               // Email format
validateTraderId()            // Trader ID format
validateAmount()              // Amount range
validateEthereumAddress()     // Address format
validateTxHash()              // TX hash format
```

**Validation Rules:**
```
Field         | Pattern                    | Example
traderId      | ^[A-Za-z0-9_\-]{3,50}$   | TRADER_ABC123
amount        | 100 ≤ x ≤ 1,000,000      | 1000
address       | 0x[a-fA-F0-9]{40}        | 0x1a2b3c4d...
txHash        | 0x[a-fA-F0-9]{64}        | 0xabc123...
```

#### Admin Utilities (`admin.js` - 60 lines)

```javascript
getAllUsers()               // Paginated user list
getUnverifiedPayments()     // Pending payments
getActivePolicies()         // Active coverage
getExpiredPolicies()        // Expired coverage
approveManualPayment()      // Admin override
rejectPayment()             // Reject payment
```

---

### CONFIGURATION FILES

| File | Purpose |
|------|---------|
| `docker-compose.yml` | MongoDB + Backend services |
| `backend/Dockerfile` | Backend container |
| `telegram-bot/Dockerfile` | Bot container |
| `.gitignore` | Git exclusions |
| `setup.sh` | Automated setup |

---

### DOCUMENTATION FILES

| File | Lines | Content |
|------|-------|---------|
| `README.md` | 500+ | Complete guide |
| `QUICK_START.md` | 150 | 5-minute setup |
| `API_DOCUMENTATION.md` | 400+ | Full API reference |
| `TESTING_GUIDE.md` | 500+ | Test scenarios |
| `DEPLOYMENT_CHECKLIST.md` | 200+ | Pre-launch |
| `PROJECT_SUMMARY.md` | 300+ | Deliverables |

---

## 🔄 Data Flow

### User Registration & Payment Flow

```
1. User starts bot
   ├─ Bot sends welcome
   └─ Bot shows WebApp button

2. User clicks button
   ├─ Opens mini app
   ├─ Telegram SDK initializes
   └─ Frontend loads

3. Accept Terms
   ├─ User reads terms
   ├─ Checks agreement
   └─ Enables Continue button

4. Fill Details
   ├─ Enter name
   ├─ Enter trader ID
   ├─ Enter amount
   └─ Frontend validates

5. Review Payment
   ├─ Display: Fee (10%)
   ├─ Display: Wallet address
   ├─ Generate: QR code
   └─ Show: Instructions

6. User Pays
   ├─ User sends USDT to wallet
   ├─ Blockchain: Tx confirmed
   └─ User clicks "I Have Paid"

7. Backend Verification
   ├─ Frontend: POST /api/check-payment
   ├─ Backend: Validate inputs
   ├─ Backend: Check duplicates
   ├─ Backend: Verify blockchain TX
   │  └─ Call: Etherscan API
   │  └─ Check: Amount match
   │  └─ Check: Recipient correct
   │  └─ Check: Confirmations ≥ 12
   ├─ Backend: Create user record
   ├─ Backend: Set coverage Active
   └─ Backend: Return success

8. Success Display
   ├─ Show success modal
   ├─ Play confetti animation
   ├─ Auto-close after 3s
   └─ Close Mini App

9. User Coverage Active
   ├─ User can check /status
   ├─ Insurance valid for 12 months
   └─ User can file claims
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────┐
│            FRONTEND (Mini App)                      │
│  ├─ Input validation (UI feedback only)            │
│  ├─ Sanitize user inputs                           │
│  └─ Telegram WebApp SDK verification               │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ HTTPS only
                      ▼
┌─────────────────────────────────────────────────────┐
│          BACKEND (Express Server)                   │
│  ├─ Helmet: Security headers                       │
│  ├─ CORS: Check origin                             │
│  ├─ Rate limit: 100/15min                          │
│  ├─ Validation: Re-validate all inputs             │
│  ├─ Sanitization: XSS prevention                   │
│  └─ Auth: Optional API key checking                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│         BLOCKCHAIN VERIFICATION                     │
│  ├─ Etherscan API: Verify TX                       │
│  ├─ Check: Recipient wallet                        │
│  ├─ Check: Amount matches                          │
│  ├─ Check: Tx status confirmed                     │
│  └─ Check: Confirmations ≥ 12                      │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│            DATABASE (MongoDB)                       │
│  ├─ Auth: Username/password required               │
│  ├─ Encryption: Connection secured                 │
│  ├─ Validation: Schema enforced                    │
│  ├─ Indexes: Fast queries                          │
│  └─ Backup: Automated snapshots                    │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
User Collection
├── _id: ObjectId (unique)
├── fullName: String (2-255)
├── traderId: String (3-50, unique)
├── telegramId: Number (unique, sparse)
├── initialAmount: Number (100-1M)
├── insuranceFee: Number (calculated 10%)
├── paymentStatus: String (pending|confirmed|failed)
├── transactionHash: String (unique, sparse)
├── walletAddress: String (Ethereum format)
├── uniquePaymentId: String (unique, sparse)
├── coverageStatus: String (inactive|active|expired|claimed)
├── coverageStartDate: Date
├── coverageEndDate: Date
├── confirmations: Number (0+)
├── chain: String (ethereum|bsc|polygon)
├── ipAddress: String
├── userAgent: String
├── createdAt: Date (auto)
├── updatedAt: Date (auto)
└── paymentVerifiedAt: Date (on confirmation)

Indexes:
├── { traderId: 1 }              // Lookup by trader
├── { telegramId: 1 }            // Lookup by telegram
├── { uniquePaymentId: 1 }       // Unique payments
├── { transactionHash: 1 }       // TX lookup
├── { paymentStatus: 1 }         // Status filtering
└── { createdAt: -1 }            // Recent first
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│          TELEGRAM (Telegram Cloud)                  │
│  • Bot server: Telegram infrastructure              │
│  • Polling or Webhook: Communication                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          FRONTEND (Vercel CDN)                      │
│  • Regions: Global edge locations                   │
│  • HTTPS: Automatic SSL/TLS                         │
│  • Scaling: Automatic                               │
│  ├─ mini-app/index.html → index.html               │
│  ├─ mini-app/css/*        → /css                    │
│  └─ mini-app/js/*         → /js                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          BACKEND (Render/AWS)                       │
│  • Container: Docker image                          │
│  • Scaling: Horizontal (multiple instances)         │
│  • HTTPS: Automatic SSL/TLS                         │
│  • Health Check: /health endpoint                   │
│  ├─ Express server port 5000                        │
│  └─ Environment variables loaded                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          DATABASE (MongoDB Atlas)                   │
│  • Replica Set: 3+ nodes for HA                     │
│  • Backup: Automated snapshots                      │
│  • Encryption: TLS in transit                       │
│  • Auth: Username/password                          │
│  ├─ Cluster: crypto-insurance                       │
│  └─ Database: crypto-insurance                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          BLOCKCHAIN RPC (Alchemy/Infura)            │
│  • Ethereum Mainnet                                 │
│  • Request routing                                  │
│  • Rate limiting: API key based                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│          VERIFICATION (Etherscan API)               │
│  • TX verification                                  │
│  • Block explorer data                              │
│  • Rate limiting: Key based                         │
└─────────────────────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

### Current Capacity
- **Concurrent Users:** 100-500
- **Requests/sec:** 10-50
- **Database Size:** < 1GB (first year)
- **Storage:** < 10GB (including backups)

### Scaling Strategy
1. **Database**
   - Add read replicas
   - Implement sharding by traderId
   - Cache hot data with Redis

2. **Backend**
   - Horizontal scaling (multiple instances)
   - Load balancer (AWS ALB/NLB)
   - Message queue (RabbitMQ/Kafka)

3. **Frontend**
   - CDN already handles (Vercel)
   - Optimize bundle size
   - Implement code splitting

---

## 🔄 CI/CD Pipeline (Optional)

```yaml
# GitHub Actions example
on: [push, pull_request]

jobs:
  test:
    - Lint code
    - Run tests
    - Check coverage
  
  build:
    - Docker build
    - Push to registry
  
  deploy:
    - Deploy to staging
    - Run integration tests
    - Deploy to production
```

---

## 📊 Monitoring & Logging

### Logging Stack
```
Application Logs
├─ Console (development)
├─ File (production)
└─ ELK Stack (optional)

Error Tracking
├─ Sentry (optional)
├─ CloudWatch (AWS)
└─ Render logs
```

### Metrics to Monitor
- API response time
- Database query time
- Error rate
- Transaction success rate
- Rate limit hits
- Payment verification failures

---

## 🎓 Development Workflow

```
1. Local Development
   ├─ npm run dev (all services)
   └─ Test locally

2. Code Review
   ├─ Git commit
   ├─ Push to branch
   └─ Create PR

3. Automated Tests
   ├─ Lint (ESLint)
   ├─ Unit tests (Jest)
   └─ Integration tests

4. Staging Deployment
   ├─ Deploy to staging
   ├─ Run E2E tests
   └─ Manual QA

5. Production Deployment
   ├─ Merge to main
   ├─ Auto-deploy
   └─ Monitor for errors
```

---

This architecture is designed to be:
- **Scalable** - Handles growth
- **Secure** - Blockchain verified
- **Reliable** - Error handling everywhere
- **Maintainable** - Clean code structure
- **Documented** - Comprehensive guides

