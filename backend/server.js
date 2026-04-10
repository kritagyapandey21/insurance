/**
 * Backend Server - Crypto Insurance Platform
 * Express API with PostgreSQL integration
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes and models
const paymentRoutes = require("./routes/payment");
const User = require("./models/User");
const Claim = require("./models/Claim"); // Load Claim model

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());

// Trust proxy to allow rate limiting to work correctly behind a reverse proxy
app.set('trust proxy', 1);

// CORS
app.use(cors());

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later"
});
app.use("/api/", limiter);

// ============================================
// DATABASE CONNECTION
// ============================================

async function initializeDatabase() {
    try {
        await User.initialize();
        await Claim.initialize();
        await User.checkConnection();
        console.log(`[${new Date().toISOString()}] ✅ PostgreSQL connected successfully`);
        console.log(`[${new Date().toISOString()}] ✅ Database tables initialized`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ PostgreSQL connection error:`, err.message);
        process.exit(1);
    }
}

async function runExpiredCoverageCleanup() {
    try {
        const deletedCount = await User.deleteExpiredCoverageUsers();
        if (deletedCount > 0) {
            console.log(`[${new Date().toISOString()}] 🧹 Removed ${deletedCount} expired insurance record(s)`);
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ Expired coverage cleanup failed:`, err.message);
    }
}

function startCoverageCleanupJob() {
    const cleanupIntervalMinutes = Number(process.env.COVERAGE_CLEANUP_INTERVAL_MINUTES || 60);
    const intervalMs = Math.max(5, cleanupIntervalMinutes) * 60 * 1000;

    // Run once immediately on boot, then on schedule.
    runExpiredCoverageCleanup();
    setInterval(runExpiredCoverageCleanup, intervalMs);
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Payment routes
app.use("/api", paymentRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`, err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        error: process.env.NODE_ENV === "development" ? err : {}
    });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
    await initializeDatabase();
    startCoverageCleanupJob();

    app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] 🚀 Server running on port ${PORT}`);
        console.log(`[${new Date().toISOString()}] 📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
}

startServer();

module.exports = app;
