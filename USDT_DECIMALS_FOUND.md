# USDT Decimal Errors - Exact Locations

## ❌ ERROR LOCATION #1: BEP20 USDT Verification

**File:** `backend/services/paymentService.js`  
**Line:** 106

```javascript
const amountHex = log.data;
const amount = parseInt(amountHex, 16) / 1e18; // ❌ WRONG COMMENT!
```

**Issue:**
The comment says: "Binance-Peg USDT on BSC uses 18 decimals"

But this CONTRADICTS the actual token specification! Let me clarify:

| Token | Chain | Decimals | Division Factor |
|-------|-------|----------|-----------------|
| Standard USDT | Ethereum, Tron | **6** | **1e6** ✅ |
| Binance-Peg USDT | BSC | **18** | **1e18** ✅ (Actually correct!) |

**Status:** Line 106 is actually correct for Binance-Peg USDT (18 decimals)
- But the comment is misleading

---

## ⚠️ POTENTIAL ERROR LOCATION #2: Etherscan Verification

**File:** `backend/services/paymentService.js`  
**Line:** 313-315 (in `verifyTransactionEtherscan` method)

```javascript
// Convert Wei to USDT (USDT has 6 decimals)
const amount = parseFloat(tx.value) / 1e18;
```

**Problems:**
1. ❌ **Comment is contradictory:** Says "USDT has 6 decimals" but divides by 1e18
2. ❌ **Wrong method:** `tx.value` is ETH amount in Wei, NOT the USDT token amount
3. ❌ **This only works for ETH transfers**, not ERC20 token transfers

**What should happen:**
For USDT token transfers on Ethereum, we need to:
- Look at transaction LOGS (like BEP20 does)
- Decode the `Transfer` event
- Extract amount from event data
- Divide by 1e6 (because standard USDT = 6 decimals)

**Current code is treating this like an ETH payment, not a USDT token payment!**

---

## 🔴 THE ACTUAL CRITICAL ISSUE

The Etherscan verification (`verifyTransactionEtherscan`) is fundamentally broken:

```javascript
// ❌ This code checks if someone sent you ETH
const amount = parseFloat(tx.value) / 1e18; // Wei to ETH

// ✅ But we need to verify USDT tokens being sent
// Should be checking logs for Transfer events like BEP20 does
```

---

## 📋 Summary

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| Line 106 | Comment misleading (but divisor is correct for Binance-Peg) | 🟡 Medium | Update comment to clarify |
| Line 313 | Checking wrong thing (ETH instead of USDT token) | 🔴 CRITICAL | Rewrite to parse token logs |

---

## Where is line 313 exactly?

Let me show you:
