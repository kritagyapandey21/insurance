/**
 * PostgreSQL Claim Model
 * Stores insurance claim submissions and history
 */

const { Pool } = require("pg");

const sslConfig = process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false;

const pool = process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: sslConfig })
    : new Pool({
        host: process.env.POSTGRES_HOST || "127.0.0.1",
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER || "insurance_user",
        password: process.env.POSTGRES_PASSWORD || "StrongPass@123",
        database: process.env.POSTGRES_DB || "insurance_db",
        ssl: sslConfig
    });

const FIELD_MAP = {
    claimId: "claim_id",
    traderId: "trader_id",
    userId: "user_id",
    telegramId: "telegram_id",
    amount: "amount",
    description: "description",
    status: "status",
    adminNotes: "admin_notes",
    denialReason: "denial_reason",
    payoutAmount: "payout_amount",
    payoutTxHash: "payout_tx_hash",
    evidenceUrls: "evidence_urls",
    createdAt: "created_at",
    updatedAt: "updated_at",
    approvedAt: "approved_at",
    resolvedAt: "resolved_at",
    _id: "id",
    id: "id"
};

function toDbField(field) {
    return FIELD_MAP[field] || field.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}

function toNumber(value) {
    return value === null || value === undefined ? value : Number(value);
}

function fromRow(row) {
    if (!row) {
        return null;
    }

    return {
        _id: row.id,
        id: row.id,
        claimId: row.claim_id,
        traderId: row.trader_id,
        userId: row.user_id,
        telegramId: row.telegram_id,
        amount: toNumber(row.amount),
        description: row.description,
        status: row.status,
        adminNotes: row.admin_notes,
        denialReason: row.denial_reason,
        payoutAmount: toNumber(row.payout_amount),
        payoutTxHash: row.payout_tx_hash,
        evidenceUrls: row.evidence_urls ? JSON.parse(row.evidence_urls) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        approvedAt: row.approved_at,
        resolvedAt: row.resolved_at
    };
}

function buildWhereClause(filter = {}, startIndex = 1) {
    const conditions = [];
    const values = [];
    let index = startIndex;

    Object.entries(filter).forEach(([key, rawValue]) => {
        const column = toDbField(key);

        if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
            if (rawValue.$gte !== undefined) {
                conditions.push(`${column} >= $${index}`);
                values.push(rawValue.$gte);
                index += 1;
            }
            if (rawValue.$lt !== undefined) {
                conditions.push(`${column} < $${index}`);
                values.push(rawValue.$lt);
                index += 1;
            }
            return;
        }

        conditions.push(`${column} = $${index}`);
        values.push(rawValue);
        index += 1;
    });

    return {
        whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        values,
        nextIndex: index
    };
}

class ClaimQuery {
    constructor(filter = {}, projection = null) {
        this.filter = filter;
        this.projection = projection;
        this.sortSpec = null;
        this.limitValue = null;
        this.offsetValue = null;
    }

    sort(spec) {
        this.sortSpec = spec;
        return this;
    }

    limit(value) {
        this.limitValue = value;
        return this;
    }

    skip(value) {
        this.offsetValue = value;
        return this;
    }

    async execute() {
        const { whereSql, values } = buildWhereClause(this.filter);
        let query = "SELECT * FROM claims";

        if (whereSql) {
            query += ` ${whereSql}`;
        }

        if (this.sortSpec) {
            const [[field, dir]] = Object.entries(this.sortSpec);
            const direction = dir === -1 ? "DESC" : "ASC";
            query += ` ORDER BY ${toDbField(field)} ${direction}`;
        }

        if (this.limitValue !== null) {
            query += ` LIMIT ${Number(this.limitValue)}`;
        }

        if (this.offsetValue !== null) {
            query += ` OFFSET ${Number(this.offsetValue)}`;
        }

        const result = await pool.query(query, values);
        const rows = result.rows.map((row) => new Claim(fromRow(row)));

        if (!this.projection || Object.keys(this.projection).length === 0) {
            return rows;
        }

        const allowed = Object.entries(this.projection)
            .filter(([, value]) => value)
            .map(([key]) => key);

        return rows.map((claim) => {
            const projected = {};
            allowed.forEach((key) => {
                projected[key] = claim[key];
            });
            projected._id = claim._id;
            return projected;
        });
    }

    then(resolve, reject) {
        return this.execute().then(resolve, reject);
    }

    catch(reject) {
        return this.execute().catch(reject);
    }

    finally(handler) {
        return this.execute().finally(handler);
    }
}

class Claim {
    constructor(data = {}) {
        Object.assign(this, data);
    }

    static async initialize() {
        await pool.query(`
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
        `);

        await pool.query("CREATE INDEX IF NOT EXISTS idx_claims_trader_id ON claims(trader_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_claims_telegram_id ON claims(telegram_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);");
    }

    static async checkConnection() {
        await pool.query("SELECT 1");
    }

    static find(filter = {}, projection = null) {
        return new ClaimQuery(filter, projection);
    }

    static async findOne(filter = {}) {
        const query = new ClaimQuery(filter).limit(1);
        const items = await query.execute();
        return items[0] || null;
    }

    static async countDocuments(filter = {}) {
        const { whereSql, values } = buildWhereClause(filter);
        const result = await pool.query(`SELECT COUNT(*)::int AS count FROM claims ${whereSql}`, values);
        return result.rows[0]?.count || 0;
    }

    static async updateOne(filter = {}, updates = {}) {
        const existing = await Claim.findOne(filter);
        if (!existing) {
            return { matchedCount: 0, modifiedCount: 0 };
        }

        Object.assign(existing, updates);
        await existing.save();
        return { matchedCount: 1, modifiedCount: 1 };
    }

    async save() {
        const data = {
            claim_id: this.claimId,
            trader_id: this.traderId,
            user_id: this.userId,
            telegram_id: this.telegramId,
            amount: this.amount,
            description: this.description,
            status: this.status || 'pending_review',
            admin_notes: this.adminNotes,
            denial_reason: this.denialReason,
            payout_amount: this.payoutAmount,
            payout_tx_hash: this.payoutTxHash,
            evidence_urls: this.evidenceUrls ? JSON.stringify(this.evidenceUrls) : null
        };

        if (this._id) {
            const fields = Object.keys(data);
            const setSql = fields.map((field, idx) => `${field} = $${idx + 1}`).join(", ");
            const values = fields.map((field) => data[field]);
            values.push(this._id);

            const result = await pool.query(
                `
                UPDATE claims
                SET ${setSql}, updated_at = NOW()
                WHERE id = $${fields.length + 1}
                RETURNING *
                `,
                values
            );

            Object.assign(this, fromRow(result.rows[0]));
            return this;
        }

        const fields = Object.keys(data).filter((field) => data[field] !== undefined);
        const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
        const values = fields.map((field) => data[field]);

        const result = await pool.query(
            `
            INSERT INTO claims (${fields.join(", ")})
            VALUES (${placeholders})
            RETURNING *
            `,
            values
        );

        Object.assign(this, fromRow(result.rows[0]));
        return this;
    }
}

module.exports = Claim;
