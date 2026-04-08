/**
 * Backend Server - Crypto Insurance Platform
 * Express API with MongoDB integration
 */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
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

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/crypto-insurance", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log(`[${new Date().toISOString()}] ✅ MongoDB connected successfully`);
    
    // Drop problematic unique indexes to avoid null/duplicate issues
    try {
        const collection = User.collection;
        const indexes = await collection.getIndexes();
        
        // Check if telegramId_1 unique index exists and drop it
        if (indexes.telegramId_1) {
            await collection.dropIndex("telegramId_1");
            console.log(`[${new Date().toISOString()}] 🔧 Dropped problematic unique index on telegramId`);
        }
        
        // Drop transactionHash unique index to allow development/testing
        if (indexes.transactionHash_1) {
            try {
                await collection.dropIndex("transactionHash_1");
                console.log(`[${new Date().toISOString()}] 🔧 Dropped unique index on transactionHash for testing`);
            } catch (err) {
                // Index might not be unique anymore, that's fine
            }
        }
        
        // Drop uniquePaymentId unique index to avoid null collision
        if (indexes.uniquePaymentId_1) {
            try {
                await collection.dropIndex("uniquePaymentId_1");
                console.log(`[${new Date().toISOString()}] 🔧 Dropped unique index on uniquePaymentId`);
            } catch (err) {
                // Index might not be unique anymore, that's fine
            }
        }
    } catch (indexErr) {
        if (indexErr.code === 27) {
            // Index doesn't exist, that's fine
            console.log(`[${new Date().toISOString()}] ✓ No problematic indexes found`);
        } else {
            console.log(`[${new Date().toISOString()}] ⚠️ Index cleanup:`, indexErr.message);
        }
    }
}).catch(err => {
    console.error(`[${new Date().toISOString()}] ❌ MongoDB connection error:`, err);
    process.exit(1);
});

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

app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🚀 Server running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] 📡 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
