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
const User = require("./models/User"); // Load User model early

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));

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
        await User.checkConnection();
        console.log(`[${new Date().toISOString()}] ✅ PostgreSQL connected successfully`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] ❌ PostgreSQL connection error:`, err.message);
        process.exit(1);
    }
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

    app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] 🚀 Server running on port ${PORT}`);
        console.log(`[${new Date().toISOString()}] 📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
}

startServer();

module.exports = app;
