/**
 * Payment Routes
 * Handles payment verification and insurance signup
 */

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Claim = require("../models/Claim");
const PaymentService = require("../services/paymentService");
const { validatePaymentRequest, validatePaymentVerification } = require("../middleware/validation");

const paymentService = new PaymentService();

async function cleanupExpiredCoverageIfNeeded() {
    try {
        const deletedCount = await User.deleteExpiredCoverageUsers();
        if (deletedCount > 0) {
            console.log(`[Cleanup] Removed ${deletedCount} expired insurance record(s)`);
        }
    } catch (error) {
        console.error(`[Cleanup Error] ${error.message}`);
    }
}

/**
 * GET /api/payment-options
 * Get available payment methods and wallet addresses
 */
router.get("/payment-options", (req, res) => {
    try {
        const paymentOptions = paymentService.getPaymentOptions();
        
        res.json({
            success: true,
            data: paymentOptions,
            message: "Available payment methods for USDT insurance premium"
        });
    } catch (error) {
        console.error(`[Payment Options Error] ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Error fetching payment options"
        });
    }
});

/**
 * POST /api/verify-payment
 * Verify payment on specific network
 * Body: { txHash, amount, network (bep20 or trc20) }
 */
router.post("/verify-payment", async (req, res) => {
    try {
        const { txHash, amount, network } = req.body;

        if (!txHash || !amount || !network) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: txHash, amount, network"
            });
        }

        console.log(`[Verify Payment] TxHash: ${txHash}, Amount: ${amount}, Network: ${network}`);

        // Validate transaction hash format
        if (!paymentService.isValidTransactionHash(txHash, network)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction hash format"
            });
        }

        const result = await paymentService.verifyPayment(txHash, amount, network);

        if (result.success) {
            return res.json({
                success: true,
                message: "Payment verified successfully",
                data: result
            });
        } else {
            return res.status(402).json({
                success: false,
                message: result.error || "Payment verification failed",
                data: result
            });
        }
    } catch (error) {
        console.error(`[Payment Verification Error] ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Error verifying payment",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * POST /api/check-payment
 * Verify payment and create/update user insurance record
 */
router.post("/check-payment", validatePaymentRequest, async (req, res) => {
    try {
        const { traderId, amount, fullName, telegramId, uniquePaymentId, walletAddress } = req.validatedData;
        const { txHash, network } = req.body;

        console.log(`[Payment Check] Processing payment for Trader: ${traderId}, Amount: ${amount} USDT, Network: ${network}, TxHash: ${txHash}`);

        // Validate transaction hash
        if (!txHash || txHash.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Transaction hash is required"
            });
        }

        // Validate transaction hash format
        if (!paymentService.isValidTransactionHash(txHash, network)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction hash format"
            });
        }

        // Check for duplicate payment
        const isDuplicate = await paymentService.isDuplicatePayment(traderId, amount, User);
        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                message: "Duplicate payment detected. Insurance already active for this trader."
            });
        }

        // Check for duplicate transaction hash across all users
        const isDuplicateHash = await paymentService.isDuplicateTransactionHash(txHash, User);
        if (isDuplicateHash) {
            return res.status(409).json({
                success: false,
                message: "This transaction hash has already been used for payment verification."
            });
        }

        // Check if user already exists
        let user = await User.findOne({ traderId });

        if (user && user.paymentStatus === "confirmed") {
            return res.status(409).json({
                success: false,
                message: "This trader already has an active insurance policy."
            });
        }

        // The payment amount is the premium paid by the user.
        // Coverage amount is derived as 10x premium based on a 10% premium rate.
        const premiumAmount = Number(amount);
        const coverageAmount = premiumAmount * 10;

        // Create or update user with pending status
        if (!user) {
            user = new User({
                fullName,
                traderId,
            initialAmount: coverageAmount,
            insuranceFee: premiumAmount,
                telegramId,
                uniquePaymentId,
                walletAddress,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
                paymentStatus: "pending",
                transactionHash: txHash,
                paymentNetwork: network
            });
        } else {
            user.fullName = fullName;
            user.initialAmount = coverageAmount;
            user.insuranceFee = premiumAmount;
            user.uniquePaymentId = uniquePaymentId;
            user.paymentStatus = "pending";
            user.transactionHash = txHash;
            user.paymentNetwork = network;
        }

        // Save user with pending status
        await user.save();

        // Verify payment on blockchain
        console.log(`[Payment Verification] Verifying ${network} transaction: ${txHash}`);
        const verification = await paymentService.verifyPayment(txHash, amount, network);

        if (verification.success) {
            console.log(`[Payment Success] Transaction verified: ${verification.transactionHash}`);
            
            // Update user status to confirmed
            user.paymentStatus = "confirmed";
            user.paymentVerifiedAt = new Date();
            user.coverageStatus = "active";
            user.coverageStartDate = new Date();
            
            // Set coverage end date to 3 months from now
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);
            user.coverageEndDate = endDate;

            await user.save();

            return res.json({
                success: true,
                message: "Payment verified. Insurance coverage activated!",
                data: {
                    policyId: user._id,
                    traderId: user.traderId,
                    coverageStartDate: user.coverageStartDate,
                    coverageEndDate: user.coverageEndDate,
                    coverageAmount: user.initialAmount,
                    premiumPaid: user.insuranceFee,
                    transactionHash: verification.transactionHash,
                    confirmations: verification.confirmations
                }
            });
        } else {
            // Payment verification failed
            user.paymentStatus = "failed";
            await user.save();

            console.log(`[Payment Failed] Transaction verification failed: ${verification.error}`);

            return res.status(402).json({
                success: false,
                message: `Payment verification failed: ${verification.error}`,
                details: verification
            });
        }
    } catch (error) {
        console.error(`[Payment Error] ${error.message}`, error);

        res.status(500).json({
            success: false,
            message: "Error processing payment",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * GET /api/user-status/:traderId
 * Check insurance status for a trader
 */
router.get("/user-status/:traderId", async (req, res) => {
    try {
        await cleanupExpiredCoverageIfNeeded();
        const { traderId } = req.params;

        const user = await User.findOne({ traderId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            data: {
                traderId: user.traderId,
                fullName: user.fullName,
                coverageStatus: user.coverageStatus,
                coverageStartDate: user.coverageStartDate,
                coverageEndDate: user.coverageEndDate,
                initialAmount: user.initialAmount,
                paymentStatus: user.paymentStatus
            }
        });
    } catch (error) {
        console.error(`[Status Check Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching user status"
        });
    }
});

/**
 * POST /api/claim
 * Submit an insurance claim
 */
router.post("/claim", async (req, res) => {
    try {
        await cleanupExpiredCoverageIfNeeded();
        const { traderId, amount, description, telegramId } = req.body;

        // Validation
        if (!traderId || !amount || !description) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: traderId, amount, description"
            });
        }

        if (amount <= 0 || amount > 1000000) {
            return res.status(400).json({
                success: false,
                message: "Invalid claim amount"
            });
        }

        // Find user by trader ID
        const user = await User.findOne({ traderId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Create claim
        const claimId = `CLM_${traderId}_${Date.now()}`;
        const claim = new Claim({
            claimId: claimId,
            traderId: traderId,
            userId: user.id,
            telegramId: telegramId || user.telegramId,
            amount: parseFloat(amount),
            description: description.trim(),
            status: "pending_review",
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await claim.save();

        console.log(`[✅ Claim Submitted] Claim ID: ${claimId}, Trader: ${traderId}, Amount: ${amount} USDT`);

        res.json({
            success: true,
            message: "Claim submitted successfully. Our team will review it within 14 business days.",
            data: {
                claimId: claimId,
                status: "pending_review",
                submittedAt: claim.createdAt,
                amount: amount
            }
        });
    } catch (error) {
        console.error(`[❌ Claim Error] ${error.message}`, error);

        res.status(500).json({
            success: false,
            message: "Error submitting claim",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * GET /api/claims
 * Get all claims (admin endpoint)
 */
router.get("/claims", async (req, res) => {
    try {
        const { status, traderId, limit = 50, offset = 0 } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (traderId) filter.traderId = traderId;

        const claims = await Claim.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));

        const total = await Claim.countDocuments(filter);

        res.json({
            success: true,
            data: claims,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                remaining: Math.max(0, total - parseInt(offset) - parseInt(limit))
            }
        });
    } catch (error) {
        console.error(`[Claims List Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching claims"
        });
    }
});

/**
 * GET /api/claims/:claimId
 * Get specific claim details
 */
router.get("/claims/:claimId", async (req, res) => {
    try {
        const { claimId } = req.params;

        const claim = await Claim.findOne({ claimId });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Claim not found"
            });
        }

        res.json({
            success: true,
            data: claim
        });
    } catch (error) {
        console.error(`[Claim Details Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching claim details"
        });
    }
});

/**
 * PATCH /api/claims/:claimId/approve
 * Admin approve a claim
 */
router.patch("/claims/:claimId/approve", async (req, res) => {
    try {
        const { claimId } = req.params;
        const { payoutAmount, adminNotes } = req.body;

        const claim = await Claim.findOne({ claimId });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Claim not found"
            });
        }

        // Update claim status to approved
        claim.status = "approved";
        claim.payoutAmount = payoutAmount || claim.amount;
        claim.adminNotes = adminNotes || "";
        claim.approvedAt = new Date();
        claim.updatedAt = new Date();

        await claim.save();

        console.log(`[✅ Claim Approved] ID: ${claimId}, Payout Amount: ${claim.payoutAmount}`);

        res.json({
            success: true,
            message: "Claim approved successfully",
            data: claim
        });
    } catch (error) {
        console.error(`[Claim Approval Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error approving claim"
        });
    }
});

/**
 * PATCH /api/claims/:claimId/reject
 * Admin reject a claim
 */
router.patch("/claims/:claimId/reject", async (req, res) => {
    try {
        const { claimId } = req.params;
        const { denialReason, adminNotes } = req.body;

        const claim = await Claim.findOne({ claimId });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Claim not found"
            });
        }

        // Update claim status to rejected
        claim.status = "rejected";
        claim.denialReason = denialReason || "No reason provided";
        claim.adminNotes = adminNotes || "";
        claim.resolvedAt = new Date();
        claim.updatedAt = new Date();

        await claim.save();

        console.log(`[✅ Claim Rejected] ID: ${claimId}, Reason: ${denialReason}`);

        res.json({
            success: true,
            message: "Claim rejected successfully",
            data: claim
        });
    } catch (error) {
        console.error(`[Claim Rejection Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error rejecting claim"
        });
    }
});

/**
 * GET /api/claims/user/:traderId
 * Get all claims for a specific user/trader
 */
router.get("/claims/user/:traderId", async (req, res) => {
    try {
        const { traderId } = req.params;

        const claims = await Claim.find({ traderId })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: claims
        });
    } catch (error) {
        console.error(`[User Claims Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching user claims"
        });
    }
});

/**
 * GET /api/stats
 * Get platform statistics (admin only)
 */
router.get("/stats", async (req, res) => {
    try {
        await cleanupExpiredCoverageIfNeeded();
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ coverageStatus: "active" });
        const totalPremiums = await User.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$insuranceFee" }
                }
            }
        ]);

        const totalCoverage = await User.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$initialAmount" }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalPremiums: totalPremiums[0]?.total || 0,
                totalCoverage: totalCoverage[0]?.total || 0,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error(`[Stats Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching statistics"
        });
    }
});

/**
 * POST /api/create-user
 * Create a new user record from telegram bot
 */
router.post("/create-user", async (req, res) => {
    try {
        const { fullName, traderId, telegramId, initialAmount, insuranceFee } = req.body;

        if (!traderId || !fullName) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: fullName, traderId"
            });
        }

        // Check if user already exists
        let user = await User.findOne({ traderId });

        if (user) {
            return res.status(409).json({
                success: false,
                message: "Trader ID already registered",
                data: user
            });
        }

        // Create new user
        user = new User({
            fullName,
            traderId,
            telegramId: telegramId || null,
            initialAmount: initialAmount || 100,
            insuranceFee: insuranceFee || (initialAmount ? initialAmount * 0.1 : 10),
            paymentStatus: "pending",
            coverageStatus: "inactive"
        });

        await user.save();

        console.log(`[${new Date().toISOString()}] ✅ New user created from telegram: ${traderId}`);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                userId: user._id,
                traderId: user.traderId,
                fullName: user.fullName,
                insuranceFee: user.insuranceFee,
                paymentStatus: user.paymentStatus
            }
        });
    } catch (error) {
        console.error(`[Create User Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error creating user",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * GET /api/users-list
 * Get all users with premium details (for admin)
 */
router.get("/users-list", async (req, res) => {
    try {
        await cleanupExpiredCoverageIfNeeded();
        const users = await User.find({}, {
            fullName: 1,
            traderId: 1,
            telegramId: 1,
            initialAmount: 1,
            insuranceFee: 1,
            paymentStatus: 1,
            coverageStatus: 1,
            coverageStartDate: 1,
            coverageEndDate: 1,
            paymentVerifiedAt: 1,
            registeredAt: 1,
            createdAt: 1
        }).sort({ createdAt: -1 });

        const totalPremium = users.reduce((sum, user) => sum + (user.insuranceFee || 0), 0);

        res.json({
            success: true,
            data: users,
            summary: {
                totalUsers: users.length,
                totalPremiumCollected: totalPremium,
                averagePremium: users.length > 0 ? totalPremium / users.length : 0
            }
        });
    } catch (error) {
        console.error(`[Users List Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching users list"
        });
    }
});

/**
 * GET /api/user-by-telegram/:telegramId
 * Get user insurance data by telegram ID
 */
router.get("/user-by-telegram/:telegramId", async (req, res) => {
    try {
        await cleanupExpiredCoverageIfNeeded();
        const { telegramId } = req.params;

        const user = await User.findOne({ telegramId: parseInt(telegramId) });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No insurance record found"
            });
        }

        // Calculate coverage expiry date (3 months from coverage start or creation)
        let validUntil = null;
        if (user.coverageEndDate) {
            validUntil = user.coverageEndDate;
        } else if (user.coverageStartDate) {
            const endDate = new Date(user.coverageStartDate);
            endDate.setMonth(endDate.getMonth() + 3);
            validUntil = endDate;
        } else {
            // Use creation date + 3 months
            const createdDate = user.createdAt || new Date();
            const endDate = new Date(createdDate);
            endDate.setMonth(endDate.getMonth() + 3);
            validUntil = endDate;
        }

        res.json({
            success: true,
            data: {
                traderId: user.traderId,
                fullName: user.fullName,
                telegramId: user.telegramId,
                initialAmount: user.initialAmount,
                insuranceFee: user.insuranceFee,
                paymentStatus: user.paymentStatus,
                coverageStatus: user.coverageStatus,
                coverageStartDate: user.coverageStartDate,
                coverageEndDate: validUntil,
                transactionHash: user.transactionHash,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error(`[User By Telegram Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error fetching user data"
        });
    }
});

/**
 * POST /api/verify-trader-affiliate
 * Verify if trader was registered through affiliate link via @AffiliatePocketBot
 * Body: { traderId }
 */
router.post("/verify-trader-affiliate", async (req, res) => {
    try {
        const { traderId } = req.body;

        if (!traderId || !traderId.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Trader ID is required"
            });
        }

        console.log(`[Affiliate Verification] Starting verification for trader: ${traderId}`);

        // Import admin functions
        const admin = require("../admin");

        // Verify with affiliate bot
        const verificationResult = await admin.verifyTraderWithAffiliateBot(traderId);

        if (verificationResult.success) {
            return res.json({
                success: true,
                message: verificationResult.registered ? "Trader verified through affiliate system" : "Trader not found in affiliate system",
                data: verificationResult
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Error verifying trader",
                error: verificationResult.error
            });
        }

    } catch (error) {
        console.error(`[Affiliate Verification Error] ${error.message}`);

        res.status(500).json({
            success: false,
            message: "Error verifying trader with affiliate bot",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * POST /api/claims/complete-payout
 * Finalize claim payout and remove user insurance records
 * Body: { traderId }
 */
router.post("/claims/complete-payout", async (req, res) => {
    try {
        const traderId = req.body?.traderId ? String(req.body.traderId).trim() : "";

        if (!traderId) {
            return res.status(400).json({
                success: false,
                message: "Trader ID is required"
            });
        }

        const existingUser = await User.findOne({ traderId });
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found for provided trader ID"
            });
        }

        const claimsBeforeDelete = await Claim.countDocuments({ traderId });
        const userDeleteResult = await User.deleteMany({ traderId });

        // claims table has FK ON DELETE CASCADE via trader_id, so related claims are removed with user.
        const claimsAfterDelete = await Claim.countDocuments({ traderId });

        console.log(`[Payout Cleanup] Trader ${traderId}: usersDeleted=${userDeleteResult.deletedCount}, claimsBefore=${claimsBeforeDelete}, claimsAfter=${claimsAfterDelete}`);

        return res.json({
            success: true,
            message: "Payout finalized and records cleaned up",
            data: {
                traderId,
                usersDeleted: userDeleteResult.deletedCount,
                claimsDeleted: Math.max(0, claimsBeforeDelete - claimsAfterDelete)
            }
        });
    } catch (error) {
        console.error(`[Payout Cleanup Error] ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Error finalizing payout cleanup",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

module.exports = router;
