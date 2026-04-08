/**
 * PostgreSQL User Model
 * Stores insurance user and payment data with a Mongoose-like interface.
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
    fullName: "full_name",
    traderId: "trader_id",
    telegramId: "telegram_id",
    initialAmount: "initial_amount",
    insuranceFee: "insurance_fee",
    paymentStatus: "payment_status",
    transactionHash: "transaction_hash",
    walletAddress: "wallet_address",
    uniquePaymentId: "unique_payment_id",
    paymentNetwork: "payment_network",
    coverageStartDate: "coverage_start_date",
    coverageEndDate: "coverage_end_date",
    coverageStatus: "coverage_status",
    confirmations: "confirmations",
    chain: "chain",
    ipAddress: "ip_address",
    userAgent: "user_agent",
    paymentVerifiedAt: "payment_verified_at",
    affiliateVerified: "affiliate_verified",
    affiliateVerifiedAt: "affiliate_verified_at",
    affiliateData: "affiliate_data",
    createdAt: "created_at",
    updatedAt: "updated_at",
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
        fullName: row.full_name,
        traderId: row.trader_id,
        telegramId: row.telegram_id,
        initialAmount: toNumber(row.initial_amount),
        insuranceFee: toNumber(row.insurance_fee),
        paymentStatus: row.payment_status,
        transactionHash: row.transaction_hash,
        walletAddress: row.wallet_address,
        uniquePaymentId: row.unique_payment_id,
        paymentNetwork: row.payment_network,
        coverageStartDate: row.coverage_start_date,
        coverageEndDate: row.coverage_end_date,
        coverageStatus: row.coverage_status,
        confirmations: row.confirmations,
        chain: row.chain,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        paymentVerifiedAt: row.payment_verified_at,
        affiliateVerified: row.affiliate_verified,
        affiliateVerifiedAt: row.affiliate_verified_at,
        affiliateData: row.affiliate_data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
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

class UserQuery {
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
        let query = "SELECT * FROM users";

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
        const rows = result.rows.map((row) => new User(fromRow(row)));

        if (!this.projection || Object.keys(this.projection).length === 0) {
            return rows;
        }

        const allowed = Object.entries(this.projection)
            .filter(([, value]) => value)
            .map(([key]) => key);

        return rows.map((user) => {
            const projected = {};
            allowed.forEach((key) => {
                projected[key] = user[key];
            });
            projected._id = user._id;
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

class User {
    constructor(data = {}) {
        Object.assign(this, data);
    }

    static async initialize() {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name TEXT NOT NULL,
                trader_id TEXT NOT NULL UNIQUE,
                telegram_id BIGINT,
                initial_amount NUMERIC(20, 8) NOT NULL DEFAULT 100,
                insurance_fee NUMERIC(20, 8) NOT NULL DEFAULT 10,
                payment_status TEXT NOT NULL DEFAULT 'pending',
                transaction_hash TEXT,
                wallet_address TEXT,
                unique_payment_id TEXT,
                payment_network TEXT,
                coverage_start_date TIMESTAMPTZ,
                coverage_end_date TIMESTAMPTZ,
                coverage_status TEXT NOT NULL DEFAULT 'inactive',
                confirmations INTEGER NOT NULL DEFAULT 0,
                chain TEXT NOT NULL DEFAULT 'ethereum',
                ip_address TEXT,
                user_agent TEXT,
                payment_verified_at TIMESTAMPTZ,
                affiliate_verified BOOLEAN NOT NULL DEFAULT FALSE,
                affiliate_verified_at TIMESTAMPTZ,
                affiliate_data JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_trader_id ON users(trader_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_tx_hash ON users(transaction_hash);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_payment_status ON users(payment_status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_coverage_status ON users(coverage_status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);");
    }

    static async checkConnection() {
        await pool.query("SELECT 1");
    }

    static find(filter = {}, projection = null) {
        return new UserQuery(filter, projection);
    }

    static async findOne(filter = {}) {
        const query = new UserQuery(filter).limit(1);
        const items = await query.execute();
        return items[0] || null;
    }

    static async updateOne(filter = {}, updates = {}) {
        const existing = await User.findOne(filter);
        if (!existing) {
            return { matchedCount: 0, modifiedCount: 0 };
        }

        Object.assign(existing, updates);
        await existing.save();
        return { matchedCount: 1, modifiedCount: 1 };
    }

    static async countDocuments(filter = {}) {
        const { whereSql, values } = buildWhereClause(filter);
        const result = await pool.query(`SELECT COUNT(*)::int AS count FROM users ${whereSql}`, values);
        return result.rows[0]?.count || 0;
    }

    static async aggregate(pipeline = []) {
        const groupStep = pipeline.find((step) => step.$group && step.$group.total && step.$group.total.$sum);
        if (!groupStep) {
            return [];
        }

        const sumField = String(groupStep.$group.total.$sum || "").replace("$", "");
        const column = toDbField(sumField);
        const result = await pool.query(`SELECT COALESCE(SUM(${column}), 0) AS total FROM users`);

        return [{ total: toNumber(result.rows[0]?.total || 0) }];
    }

    async save() {
        const data = {
            full_name: this.fullName,
            trader_id: this.traderId,
            telegram_id: this.telegramId,
            initial_amount: this.initialAmount,
            insurance_fee: this.insuranceFee,
            payment_status: this.paymentStatus,
            transaction_hash: this.transactionHash,
            wallet_address: this.walletAddress,
            unique_payment_id: this.uniquePaymentId,
            payment_network: this.paymentNetwork,
            coverage_start_date: this.coverageStartDate,
            coverage_end_date: this.coverageEndDate,
            coverage_status: this.coverageStatus,
            confirmations: this.confirmations,
            chain: this.chain,
            ip_address: this.ipAddress,
            user_agent: this.userAgent,
            payment_verified_at: this.paymentVerifiedAt,
            affiliate_verified: this.affiliateVerified,
            affiliate_verified_at: this.affiliateVerifiedAt,
            affiliate_data: this.affiliateData
        };

        if (data.insurance_fee === undefined || data.insurance_fee === null) {
            data.insurance_fee = Number(data.initial_amount || 0) * 0.1;
        }

        if (this._id) {
            const fields = Object.keys(data);
            const setSql = fields.map((field, idx) => `${field} = $${idx + 1}`).join(", ");
            const values = fields.map((field) => data[field]);
            values.push(this._id);

            const result = await pool.query(
                `
                UPDATE users
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
            INSERT INTO users (${fields.join(", ")})
            VALUES (${placeholders})
            RETURNING *
            `,
            values
        );

        Object.assign(this, fromRow(result.rows[0]));
        return this;
    }
}

module.exports = User;
