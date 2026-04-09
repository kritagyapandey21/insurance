/**
 * Payment Service
 * Handles blockchain payment verification
 */

const axios = require("axios");
const Web3 = require("web3");

class PaymentService {
    constructor() {
        // Initialize Web3 with Ethereum mainnet
        const rpcUrl = process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY;
        this.web3 = new Web3(rpcUrl);
        this.etherscanApiKey = process.env.ETHERSCAN_API_KEY;
        this.nowpaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
        this.insuranceWallet = process.env.INSURANCE_WALLET_ADDRESS;
        this.minConfirmations = parseInt(process.env.MIN_CONFIRMATIONS || "12");
        
        // Multi-chain payment wallets
        this.bep20UsdtWallet = process.env.BEP20_USDT_WALLET;
        this.trc20UsdtWallet = process.env.TRC20_USDT_WALLET;
    }

    /**
     * Verify BEP20 USDT transaction on BSC
     * Uses JSON-RPC calls via public BSC RPC endpoints
     */
    async verifyBEP20Payment(txHash, expectedAmount) {
        try {
            console.log(`[BEP20 Verification] Verifying transaction ${txHash} for amount ${expectedAmount} USDT`);
            
            // Demo mode for testing (check if tx hash starts with demo pattern)
            if (txHash.startsWith("demo-bep20") && process.env.NODE_ENV === "development") {
                console.log("[BEP20 Verification] Using demo mode verification");
                return {
                    success: true,
                    transactionHash: txHash,
                    amount: expectedAmount,
                    confirmations: 5,
                    status: "confirmed",
                    network: "BEP20 (BSC)",
                    demo: true
                };
            }

            const rpcUrl = "https://bsc-dataseed1.binance.org:443";
            
            console.log(`[BEP20 Verification] Querying BSC blockchain via RPC...`);
            console.log(`[BEP20 Verification] RPC URL: ${rpcUrl}`);
            
            // Get transaction receipt
            console.log(`[BEP20 Verification] Calling eth_getTransactionReceipt...`);
            const receiptResponse = await axios.post(rpcUrl, {
                jsonrpc: "2.0",
                method: "eth_getTransactionReceipt",
                params: [txHash],
                id: 1
            }, { timeout: 15000 });

            console.log(`[BEP20 Verification] Receipt response:`, JSON.stringify(receiptResponse.data, null, 2));

            if (receiptResponse.data.error) {
                console.log(`[BEP20 Verification] RPC Error:`, receiptResponse.data.error);
                return { success: false, error: `RPC Error: ${receiptResponse.data.error.message}` };
            }

            const receipt = receiptResponse.data.result;
            
            if (!receipt) {
                console.log(`[BEP20 Verification] Transaction not found on BSC`);
                return { success: false, error: "Transaction not found on BSC" };
            }

            console.log(`[BEP20 Verification] Receipt block number: ${receipt.blockNumber}`);
            
            // Check if transaction was successful
            const status = receipt.status === "0x1" || receipt.status === 1 || receipt.status === true;
            console.log(`[BEP20 Verification] Transaction status: ${status} (status field: ${receipt.status})`);
            
            if (!status) {
                console.log(`[BEP20 Verification] Transaction failed on-chain`);
                return { success: false, error: "Transaction failed" };
            }

            // For BEP20 USDT transfers, we need to check the logs for Transfer events
            // USDT contract address on BSC: 0x55d398326f99059fF775485246999027B3197955
            const usdtContractAddress = "0x55d398326f99059ff775485246999027b3197955";
            const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
            
            console.log(`[BEP20 Verification] Looking for USDT transfer events...`);
            
            let transferFound = false;
            let actualAmount = 0;
            let recipientAddress = null;
            
            // Check logs for Transfer events from USDT contract
            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === usdtContractAddress.toLowerCase() && 
                    log.topics[0] === transferEventSignature) {
                    
                    // Decode Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
                    const toAddress = "0x" + log.topics[2].slice(26); // Remove 0x000000000000000000000000 prefix
                    
                    // Get amount from data (uint256)
                    const amountHex = log.data;
                    const amount = parseInt(amountHex, 16) / 1e18; // Binance-Peg USDT on BSC (0x55d398...) uses 18 decimals
                    
                    console.log(`[BEP20 Verification] Found USDT transfer: to=${toAddress}, amount=${amount}`);
                    
                    // Check if this transfer is to our wallet
                    if (toAddress.toLowerCase() === this.bep20UsdtWallet.toLowerCase()) {
                        transferFound = true;
                        actualAmount = amount;
                        recipientAddress = toAddress;
                        break; // Found our transfer
                    }
                }
            }
            
            if (!transferFound) {
                console.log(`[BEP20 Verification] No USDT transfer to our wallet found in transaction`);
                return { success: false, error: "No USDT transfer to insurance wallet found" };
            }
            
            // Verify amount (allow 5% tolerance for fees/rounding)
            const minAmount = expectedAmount * 0.95;
            const maxAmount = expectedAmount * 1.05;
            
            if (actualAmount < minAmount || actualAmount > maxAmount) {
                console.log(`[BEP20 Verification] Amount mismatch: received ${actualAmount}, expected ${expectedAmount} (±5%)`);
                return { success: false, error: `Amount mismatch: received ${actualAmount} USDT, expected ${expectedAmount} USDT` };
            }
            
            console.log(`[BEP20 Verification] Amount verified: ${actualAmount} USDT`);
            
            // Get confirmation count
            const blockResponse = await axios.post(rpcUrl, {
                jsonrpc: "2.0",
                method: "eth_blockNumber",
                params: [],
                id: 2
            }, { timeout: 10000 });

            const currentBlockHex = blockResponse.data.result;
            const currentBlock = parseInt(currentBlockHex, 16);
            const txBlockNumber = parseInt(receipt.blockNumber, 16);
            const confirmations = currentBlock - txBlockNumber;

            console.log(`[BEP20 Verification] Current block: ${currentBlock}, TX block: ${txBlockNumber}, Confirmations: ${confirmations}`);

            return {
                success: confirmations >= 1,
                transactionHash: txHash,
                amount: actualAmount,
                confirmations: confirmations,
                status: "confirmed",
                network: "BEP20 (BSC)",
                blockNumber: txBlockNumber,
                from: receipt.from,
                to: recipientAddress
            };
        } catch (error) {
            console.error("[BEP20 Verification] Error:", {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            return { 
                success: false, 
                error: `BEP20 verification failed: ${error.message}`,
                debug: process.env.NODE_ENV === "development" ? error.message : undefined
            };
        }
    }

    /**
     * Verify TRC20 USDT transaction on Tron
     * Uses Tronscan API
     */
    async verifyTRC20Payment(txHash, expectedAmount) {
        try {
            console.log(`[TRC20 Verification] Verifying transaction ${txHash} for amount ${expectedAmount} USDT`);
            
            // Demo mode for testing (check if tx hash starts with demo pattern)
            if (txHash.startsWith("demo-trc20") && process.env.NODE_ENV === "development") {
                console.log("[TRC20 Verification] Using demo mode verification");
                return {
                    success: true,
                    transactionHash: txHash,
                    amount: expectedAmount,
                    confirmations: 5,
                    status: "confirmed",
                    network: "TRC20 (Tron)",
                    demo: true
                };
            }

            console.log(`[TRC20 Verification] Calling Tronscan API...`);
            
            const response = await axios.get("https://apilist.tronscan.org/api/transaction-info", {
                params: {
                    hash: txHash
                },
                timeout: 10000 // 10 second timeout
            });

            console.log(`[TRC20 Verification] Tronscan response received`);

            if (!response.data || !response.data.hash) {
                console.log(`[TRC20 Verification] Transaction not found on Tron`);
                return { success: false, error: "Transaction not found on Tron" };
            }

            const tx = response.data;
            
            // Check if transaction is confirmed
            if (!tx.confirmed) {
                console.log(`[TRC20 Verification] Transaction not confirmed yet`);
                return { success: false, error: "Transaction not confirmed yet" };
            }

            // Verify recipient for TRC20 USDT contract transfer
            if (tx.tokenTransferInfo && tx.tokenTransferInfo.tokenPriceInTrx) {
                const recipientAddress = tx.tokenTransferInfo.toAddress;
                const expectedRecipient = this.trc20UsdtWallet;
                
                console.log(`[TRC20 Verification] Checking recipient: ${recipientAddress} vs ${expectedRecipient}`);
                
                if (recipientAddress !== expectedRecipient) {
                    console.log(`[TRC20 Verification] Recipient mismatch`);
                    return { success: false, error: "Incorrect recipient address (TRC20)" };
                }

                // USDT on Tron has 6 decimals
                const amount = parseFloat(tx.tokenTransferInfo.tokenAmount) / 1e6;
                
                if (amount < expectedAmount * 0.95 || amount > expectedAmount * 1.05) {
                    console.log(`[TRC20 Verification] Amount mismatch: ${amount} vs ${expectedAmount}`);
                    return { success: false, error: "Amount mismatch" };
                }

                // Tron uses block confirmations
                const blockHeight = tx.blockNumber;
                const latestBlockResponse = await axios.get("https://apilist.tronscan.org/api/chainParameters", {
                    timeout: 10000
                });
                const latestBlock = latestBlockResponse.data.solidifiedBlockHeight;
                const confirmations = latestBlock - blockHeight + 1;

                console.log(`[TRC20 Verification] Transaction confirmed with ${confirmations} confirmations`);

                return {
                    success: confirmations >= 1, // Require at least 1 confirmation
                    transactionHash: txHash,
                    amount: amount,
                    confirmations: confirmations,
                    status: "confirmed",
                    network: "TRC20 (Tron)"
                };
            } else {
                console.log(`[TRC20 Verification] No token transfer info found in transaction`);
                return { success: false, error: "No token transfer found in transaction" };
            }
        } catch (error) {
            console.error("[TRC20 Verification] Error:", {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data
            });
            return { 
                success: false, 
                error: `TRC20 verification failed: ${error.message}`,
                debug: process.env.NODE_ENV === "development" ? error.message : undefined
            };
        }
    }

    /**
     * Verify transaction on blockchain using Etherscan API
     * Alternative to direct Web3 calls
     */
    async verifyTransactionEtherscan(txHash, expectedAmount) {
        try {
            const response = await axios.get("https://api.etherscan.io/api", {
                params: {
                    module: "proxy",
                    action: "eth_getTransactionReceipt",
                    txhash: txHash,
                    apikey: this.etherscanApiKey
                }
            });

            if (!response.data.result) {
                return { success: false, error: "Transaction not found" };
            }

            const tx = response.data.result;
            const status = parseInt(tx.status, 16) === 1;
            
            if (!status) {
                return { success: false, error: "Transaction failed" };
            }

            // Verify recipient
            if (tx.to.toLowerCase() !== this.insuranceWallet.toLowerCase()) {
                return { success: false, error: "Incorrect recipient address" };
            }

            // Convert Wei to USDT (USDT has 6 decimals)
            const amount = parseFloat(tx.value) / 1e18;
            
            if (amount < expectedAmount * 0.99 || amount > expectedAmount * 1.01) {
                return { success: false, error: "Amount mismatch" };
            }

            // Get confirmation count
            const latestBlockResponse = await axios.get("https://api.etherscan.io/api", {
                params: {
                    module: "proxy",
                    action: "eth_blockNumber",
                    apikey: this.etherscanApiKey
                }
            });

            const latestBlock = parseInt(latestBlockResponse.data.result, 16);
            const txBlock = parseInt(tx.blockNumber, 16);
            const confirmations = latestBlock - txBlock;

            return {
                success: confirmations >= this.minConfirmations,
                transactionHash: txHash,
                amount: amount,
                confirmations: confirmations,
                status: "confirmed"
            };
        } catch (error) {
            console.error("Etherscan verification error:", error.message);
            return { success: false, error: "Verification failed" };
        }
    }

    /**
     * Verify transaction using Web3 direct call
     * More reliable but requires full node
     */
    async verifyTransactionWeb3(txHash, expectedAmount) {
        try {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);

            if (!receipt) {
                return { success: false, error: "Transaction not found" };
            }

            if (!receipt.status) {
                return { success: false, error: "Transaction failed" };
            }

            // Verify recipient
            if (receipt.to.toLowerCase() !== this.insuranceWallet.toLowerCase()) {
                return { success: false, error: "Incorrect recipient address" };
            }

            const tx = await this.web3.eth.getTransaction(txHash);
            const amount = this.web3.utils.fromWei(tx.value, "ether");

            if (amount < expectedAmount * 0.99 || amount > expectedAmount * 1.01) {
                return { success: false, error: "Amount mismatch" };
            }

            const currentBlock = await this.web3.eth.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;

            return {
                success: confirmations >= this.minConfirmations,
                transactionHash: txHash,
                amount: parseFloat(amount),
                confirmations: confirmations,
                status: "confirmed"
            };
        } catch (error) {
            console.error("Web3 verification error:", error.message);
            return { success: false, error: "Verification failed" };
        }
    }

    /**
     * Verify using NOWPayments API
     * Recommended for multi-chain support
     */
    async verifyPaymentNOWPayments(invoiceId) {
        try {
            const response = await axios.get(
                `https://api.nowpayments.io/v1/invoice/${invoiceId}`,
                {
                    headers: {
                        "x-api-key": this.nowpaymentsApiKey
                    }
                }
            );

            const invoice = response.data;

            return {
                success: invoice.status === "finished" || invoice.status === "confirmed",
                transactionHash: invoice.pay_address,
                amount: parseFloat(invoice.price_amount),
                status: invoice.status,
                confirmations: invoice.confirmations || 0
            };
        } catch (error) {
            console.error("NOWPayments verification error:", error.message);
            return { success: false, error: "Verification failed" };
        }
    }

    /**
     * Main payment verification method
     * Chooses verification method based on configuration or detected network
     */
    async verifyPayment(txHashOrInvoiceId, expectedAmount, network = null) {
        const method = network || process.env.PAYMENT_VERIFICATION_METHOD || "etherscan";

        let result;

        switch (method) {
            case "bep20":
                result = await this.verifyBEP20Payment(txHashOrInvoiceId, expectedAmount);
                break;
            case "trc20":
                result = await this.verifyTRC20Payment(txHashOrInvoiceId, expectedAmount);
                break;
            case "web3":
                result = await this.verifyTransactionWeb3(txHashOrInvoiceId, expectedAmount);
                break;
            case "nowpayments":
                result = await this.verifyPaymentNOWPayments(txHashOrInvoiceId);
                break;
            case "etherscan":
            default:
                result = await this.verifyTransactionEtherscan(txHashOrInvoiceId, expectedAmount);
        }

        return result;
    }

    /**
     * Get payment wallet address for specified network
     */
    getPaymentWallet(network) {
        switch(network.toLowerCase()) {
            case "bep20":
            case "bsc":
            case "binance":
                return this.bep20UsdtWallet;
            case "trc20":
            case "tron":
                return this.trc20UsdtWallet;
            case "ethereum":
            case "eth":
            default:
                return this.insuranceWallet;
        }
    }

    /**
     * Get all payment options
     */
    getPaymentOptions() {
        return {
            "BEP20 (BSC)" : {
                network: "BEP20",
                token: "USDT",
                walletAddress: this.bep20UsdtWallet,
                chainId: 56,
                blockExplorer: "https://bscscan.com"
            },
            "TRC20 (Tron)": {
                network: "TRC20",
                token: "USDT",
                walletAddress: this.trc20UsdtWallet,
                chainId: "Tron Mainnet",
                blockExplorer: "https://tronscan.org"
            }
        };
    }

    /**
     * Check for duplicate payments (prevent fraud)
     */
    async isDuplicatePayment(traderId, amount, User) {
        try {
            const existingPayment = await User.findOne({
                traderId: traderId,
                initialAmount: amount,
                paymentStatus: "confirmed",
                createdAt: {
                    $gte: new Date(Date.now() - 86400000) // Last 24 hours
                }
            });

            return !!existingPayment;
        } catch (error) {
            console.error("Duplicate check error:", error.message);
            return false;
        }
    }

    /**
     * Validate transaction hash format
     */
    isValidTransactionHash(txHash, network) {
        if (!txHash || typeof txHash !== 'string') {
            return false;
        }

        // Remove 0x prefix if present
        const cleanHash = txHash.startsWith('0x') ? txHash.slice(2) : txHash;

        // Check length and format
        switch(network.toLowerCase()) {
            case 'bep20':
            case 'bsc':
            case 'ethereum':
            case 'eth':
                // Ethereum/BSC style: 64 hex characters
                return /^[a-fA-F0-9]{64}$/.test(cleanHash);
            case 'trc20':
            case 'tron':
                // Tron style: can be various formats, but typically hex
                return /^[a-fA-F0-9]{64}$/.test(cleanHash);
            default:
                return /^[a-fA-F0-9]{64}$/.test(cleanHash);
        }
    }

    /**
     * Check for duplicate transaction hash across all users (prevent hash reuse)
     */
    async isDuplicateTransactionHash(txHash, User) {
        try {
            const existingTransaction = await User.findOne({
                transactionHash: txHash,
                paymentStatus: "confirmed"
            });

            return !!existingTransaction;
        } catch (error) {
            console.error("Transaction hash duplicate check error:", error.message);
            return false;
        }
    }

    /**
     * Generate unique payment amount
     * Adds small variance to ensure uniqueness
     */
    generateUniquePaymentAmount(baseAmount) {
        // Add small variance (0.01% to 1%)
        const variance = (Math.random() * 0.01 + 0.0001);
        return parseFloat((baseAmount + variance).toFixed(8));
    }
}

module.exports = PaymentService;
