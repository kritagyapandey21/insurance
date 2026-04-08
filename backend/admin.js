/**
 * Admin Panel Functions
 * User management, payment verification, claims management, etc.
 */

const User = require('./models/User');

// Import affiliate bot service for trader verification
let affiliateBotService = null;
try {
    affiliateBotService = require('../telegram-bot/services/affiliateBotService');
} catch (error) {
    console.warn('⚠️ Affiliate bot service not available - trader verification may not work');
}

// Get all users
async function getAllUsers(page = 1, limit = 20) {
    return await User.find()
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });
}

// Get unverified payments
async function getUnverifiedPayments() {
    return await User.find({ paymentStatus: 'pending' })
        .sort({ createdAt: -1 });
}

// Get active policies
async function getActivePolicies() {
    return await User.find({ coverageStatus: 'active' })
        .sort({ coverageStartDate: -1 });
}

// Get expired policies
async function getExpiredPolicies() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return await User.find({
        coverageEndDate: { $lt: yesterday },
        coverageStatus: 'active'
    });
}

// Approve manual payment
async function approveManualPayment(traderId, txHash) {
    return await User.updateOne(
        { traderId },
        {
            paymentStatus: 'confirmed',
            transactionHash: txHash,
            paymentVerifiedAt: new Date(),
            coverageStatus: 'active'
        }
    );
}

// Reject payment
async function rejectPayment(traderId) {
    return await User.updateOne(
        { traderId },
        {
            paymentStatus: 'failed'
        }
    );
}

/**
 * Verify trader with affiliate bot via Telegram
 * Checks if trader was registered through affiliate link
 * @param {string} traderId - Pocket Option trader ID
 * @returns {Promise<Object>} - User verification data
 */
async function verifyTraderWithAffiliateBot(traderId) {
    try {
        if (!affiliateBotService) {
            throw new Error('Affiliate bot service not initialized. Check Telegram API credentials in .env');
        }

        console.log(`[${new Date().toISOString()}] 🔍 Starting affiliate bot verification for trader: ${traderId}`);

        // Verify with affiliate bot
        const verificationData = await affiliateBotService.verifyTraderWithAffiliate(traderId);

        if (verificationData && verificationData.registered) {
            console.log(`[${new Date().toISOString()}] ✅ Trader verified through affiliate bot`);
            
            // Update user record with affiliate verification
            const updateResult = await User.updateOne(
                { traderId },
                {
                    affiliateVerified: true,
                    affiliateVerifiedAt: new Date(),
                    affiliateData: verificationData
                }
            );

            return {
                success: true,
                registered: true,
                traderId,
                data: verificationData,
                updated: updateResult.modifiedCount > 0
            };
        } else {
            console.log(`[${new Date().toISOString()}] ⚠️ Trader not found in affiliate system`);
            return {
                success: true,
                registered: false,
                traderId,
                message: 'Trader not found in affiliate system'
            };
        }

    } catch (error) {
        console.error(`[ERROR verifying trader] ${error.message}`);
        return {
            success: false,
            error: error.message,
            traderId
        };
    }
}

module.exports = {
    getAllUsers,
    getUnverifiedPayments,
    getActivePolicies,
    getExpiredPolicies,
    approveManualPayment,
    rejectPayment,
    verifyTraderWithAffiliateBot
};
