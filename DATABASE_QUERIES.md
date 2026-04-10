# PostgreSQL Database Queries - Copy & Paste

## Quick Start: Connect to Database

```bash
# From VPS terminal, connect to database
psql -h localhost -U insurance_user -d insurance_db

# If prompted for password: StrongPass@123 (check your .env)
```

## Claims Diagnostics

### View All Claims
```sql
SELECT * FROM claims;
```

### Count Claims by Status
```sql
SELECT status, COUNT(*) as count FROM claims GROUP BY status;
```

### View Claims Statistics
```sql
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM claims 
GROUP BY status
ORDER BY count DESC;
```

### Find Recently Submitted Claims (Last 10)
```sql
SELECT 
    claim_id, 
    trader_id, 
    amount, 
    status, 
    created_at
FROM claims 
ORDER BY created_at DESC 
LIMIT 10;
```

### Find Specific Trader's Claims
```sql
SELECT * FROM claims WHERE trader_id = '267189011';
```

### Find Approved but Unpaid Claims
```sql
SELECT 
    claim_id,
    trader_id,
    amount,
    applied_at,
    payout_tx_hash
FROM claims 
WHERE status = 'approved' AND payout_tx_hash IS NULL;
```

### View Claims Pending Review
```sql
SELECT 
    claim_id,
    trader_id,
    amount,
    description,
    created_at
FROM claims 
WHERE status = 'pending_review'
ORDER BY created_at DESC;
```

### Get Approval Success Rate
```sql
SELECT 
    ROUND(
        COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) as approval_rate_percent
FROM claims;
```

### View Claim Timeline for Specific Trader
```sql
SELECT 
    claim_id,
    status,
    created_at,
    approved_at,
    resolved_at
FROM claims 
WHERE trader_id = '267189011'
ORDER BY created_at DESC;
```

---

## Users & Coverage Diagnostics

### View All Users with Insurance
```sql
SELECT 
    telegram_id,
    full_name,
    trader_id,
    coverage_status,
    coverage_start_date,
    coverage_end_date,
    initial_amount,
    insurance_fee
FROM users
ORDER BY created_at DESC;
```

### Count Users by Coverage Status
```sql
SELECT coverage_status, COUNT(*) FROM users GROUP BY coverage_status;
```

### View Active Policies
```sql
SELECT 
    full_name,
    trader_id,
    coverage_start_date,
    coverage_end_date,
    initial_amount
FROM users
WHERE coverage_status = 'active'
ORDER BY coverage_end_date;
```

### Find Expired Policies
```sql
SELECT 
    full_name,
    trader_id,
    coverage_end_date,
    initial_amount
FROM users
WHERE coverage_end_date < NOW()
ORDER BY coverage_end_date DESC;
```

### Total Premium Collected
```sql
SELECT 
    COUNT(*) as total_users,
    SUM(insurance_fee) as total_premiums,
    ROUND(AVG(insurance_fee), 2) as avg_premium,
    SUM(initial_amount) as total_coverage
FROM users;
```

### User Payments Pending Verification
```sql
SELECT 
    full_name,
    trader_id,
    payment_status,
    transaction_hash,
    created_at
FROM users
WHERE payment_status = 'pending'
ORDER BY created_at DESC;
```

---

## Table Structure & Maintenance

### Check Claims Table Schema
```sql
\d claims
```

### Check Users Table Schema
```sql
\d users
```

### Repair/Reinitialize Claims Table (if corrupted)
```sql
-- Backup existing claims first!
CREATE TABLE claims_backup AS SELECT * FROM claims;

-- Drop and recreate
DROP TABLE IF EXISTS claims CASCADE;

CREATE TABLE claims (
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

-- Restore data
INSERT INTO claims SELECT * FROM claims_backup;
```

### Vacuum & Optimize
```sql
VACUUM ANALYZE;
```

### Check Database Size
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Batch Operations

### Update All Pending Claims to Approved (USE CAREFULLY!)
```sql
UPDATE claims 
SET status = 'approved', approved_at = NOW()
WHERE status = 'pending_review'
AND created_at < NOW() - INTERVAL '7 days';

-- View changes
SELECT COUNT(*) FROM claims WHERE status = 'approved';
```

### Delete Old Rejected Claims (30+ days old)
```sql
DELETE FROM claims 
WHERE status = 'rejected' 
AND created_at < NOW() - INTERVAL '30 days';
```

### Export Claims to CSV
```sql
\COPY (SELECT * FROM claims ORDER BY created_at DESC) TO '/tmp/claims.csv' WITH CSV HEADER;
```

---

## Exit from PostgreSQL

```sql
\q
```

---

## Common Issues & Fixes

### "relation 'claims' does not exist"
The claims table hasn't been created. Run the table creation script above.

### "FATAL: remaining connection slots reserved for non-replication superuser connections"
Too many connections. Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### "permission denied for role 'insurance_user'"
Check .env credentials and make sure the user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON TABLE claims TO insurance_user;
GRANT ALL PRIVILEGES ON TABLE users TO insurance_user;
```

---

Last Updated: April 10, 2026
