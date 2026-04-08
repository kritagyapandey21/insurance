/**
 * Validation Middleware
 * Input validation and sanitization
 */

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validateTraderId = (traderId) => {
    return /^[A-Za-z0-9_\-]{3,50}$/.test(traderId);
};

const validateAmount = (amount) => {
    return !isNaN(amount) && amount >= 10 && amount <= 1000000;
};

const validateEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateTxHash = (txHash) => {
    return /^0x[a-fA-F0-9]{64}$/.test(txHash);
};

/**
 * Payment request validation
 */
const validatePaymentRequest = (req, res, next) => {
    try {
        const { traderId, amount, fullName, telegramId, uniquePaymentId } = req.body;

        // Check required fields
        if (!traderId || !amount || !fullName) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: traderId, amount, fullName"
            });
        }

        // Validate trader ID
        if (!validateTraderId(traderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Trader ID format (3-50 alphanumeric characters)"
            });
        }

        // Validate amount
        if (!validateAmount(amount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount. Minimum: 10 USDT, Maximum: 1,000,000 USDT"
            });
        }

        // Validate name
        if (fullName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Full name must be at least 2 characters"
            });
        }

        // Validate Telegram ID if provided
        if (telegramId && typeof telegramId !== "number") {
            return res.status(400).json({
                success: false,
                message: "Invalid Telegram ID"
            });
        }

        // Attach validated data to request
        req.validatedData = {
            traderId: traderId.trim(),
            amount: parseFloat(amount),
            fullName: fullName.trim(),
            telegramId: telegramId || null,
            uniquePaymentId: uniquePaymentId || null
        };

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Validation error",
            error: error.message
        });
    }
};

/**
 * Payment verification validation
 */
const validatePaymentVerification = (req, res, next) => {
    try {
        const { txHash, amount, invoiceId } = req.body;

        // Either txHash or invoiceId must be provided
        if (!txHash && !invoiceId) {
            return res.status(400).json({
                success: false,
                message: "Either txHash or invoiceId is required"
            });
        }

        if (!amount || !validateAmount(amount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        // Validate txHash format if provided
        if (txHash && !validateTxHash(txHash)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction hash format"
            });
        }

        req.validatedData = {
            txHash: txHash?.toLowerCase(),
            invoiceId,
            amount: parseFloat(amount)
        };

        next();
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Validation error",
            error: error.message
        });
    }
};

module.exports = {
    validatePaymentRequest,
    validatePaymentVerification,
    validateEmail,
    validateTraderId,
    validateAmount,
    validateEthereumAddress,
    validateTxHash
};
