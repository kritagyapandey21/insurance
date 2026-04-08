/**
 * MongoDB User Schema
 * Stores insurance user data and payment information
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // Personal Info
    fullName: {
        type: String,
        required: [true, "Full name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters"]
    },
    
    traderId: {
        type: String,
        required: [true, "Trader ID is required"],
        unique: true,
        trim: true,
        minlength: [3, "Trader ID must be at least 3 characters"]
    },

    telegramId: {
        type: Number,
        // Don't use unique: true with sparse to avoid null collision issues
        // Keep sparse to optimize querying
        sparse: true
    },

    // Insurance Details
    initialAmount: {
        type: Number,
        required: [true, "Initial amount is required"],
        min: [10, "Minimum deposit is 10 USDT"],
        max: [1000000, "Maximum deposit is 1,000,000 USDT"]
    },

    insuranceFee: {
        type: Number,
        required: true,
        // 10% of initialAmount
        default: function() {
            return this.initialAmount * 0.1;
        }
    },

    // Payment Information
    paymentStatus: {
        type: String,
        enum: ["pending", "confirmed", "failed"],
        default: "pending"
    },

    transactionHash: {
        type: String,
        // Don't use unique: true to allow retesting with same tx hash
        sparse: true,
        lowercase: true
    },

    walletAddress: {
        type: String,
        lowercase: true
    },

    uniquePaymentId: {
        type: String,
        sparse: true
    },

    // Coverage Details
    coverageStartDate: {
        type: Date,
        default: null
    },

    coverageEndDate: {
        type: Date,
        default: null
    },

    coverageStatus: {
        type: String,
        enum: ["inactive", "active", "expired", "claimed"],
        default: "inactive"
    },

    // Verification
    confirmations: {
        type: Number,
        default: 0,
        min: 0
    },

    chain: {
        type: String,
        enum: ["ethereum", "bsc", "polygon"],
        default: "ethereum"
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    paymentVerifiedAt: Date
});

// Add indexes
userSchema.index({ traderId: 1 });
userSchema.index({ telegramId: 1 }); // For querying, not enforcing unique
userSchema.index({ uniquePaymentId: 1 });
userSchema.index({ transactionHash: 1 });
userSchema.index({ paymentStatus: 1 });
userSchema.index({ createdAt: -1 });

// Auto-update timestamp
userSchema.pre("save", function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("User", userSchema);
