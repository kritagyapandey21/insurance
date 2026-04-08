/**
 * Affiliate Bot Service
 * Queries @AffiliatePocketBot to verify if trader registered through affiliate link
 * Uses Telegram Bot API for simple and reliable integration
 */

const axios = require("axios");

// Cache for recent queries to avoid rate limits
const queryCache = {};
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

class AffiliateBotService {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.affiliateBotUsername = "@AffiliatePocketBot";
    }

    /**
     * Query @AffiliatePocketBot for trader verification using Telegram Bot API
     * @param {string} traderId - The Pocket Option trader ID
     * @returns {Promise<Object>} - User data if found, or null if not registered
     */
    async verifyTraderWithAffiliate(traderId) {
        try {
            // Check cache first
            const cacheKey = `trader_${traderId}`;
            if (queryCache[cacheKey]) {
                const cachedTime = Date.now() - queryCache[cacheKey].timestamp;
                if (cachedTime < CACHE_DURATION) {
                    console.log(`[${new Date().toISOString()}] 💾 Cache hit for trader ID: ${traderId}`);
                    return queryCache[cacheKey].data;
                }
            }

            if (!this.botToken) {
                console.error(`[${new Date().toISOString()}] ❌ TELEGRAM_BOT_TOKEN not configured in .env`);
                return {
                    registered: false,
                    message: "Bot configuration error: missing token"
                };
            }

            console.log(`[${new Date().toISOString()}] 🔍 Querying @AffiliatePocketBot for trader ID: ${traderId}`);

            // Get the affiliate bot info using Telegram Bot API
            console.log(`[${new Date().toISOString()}] 🤖 Looking up @AffiliatePocketBot...`);
            const botInfo = await axios.get(`https://api.telegram.org/bot${this.botToken}/getChat`, {
                params: {
                    chat_id: this.affiliateBotUsername
                },
                timeout: 10000
            });

            if (!botInfo.data.ok) {
                throw new Error(`Telegram API error: ${botInfo.data.description}`);
            }

            const affiliateBotId = botInfo.data.result.id;
            console.log(`[${new Date().toISOString()}] ✅ Found @AffiliatePocketBot (ID: ${affiliateBotId})`);

            // Send trader ID to affiliate bot
            console.log(`[${new Date().toISOString()}] 📨 Sending trader ID to @AffiliatePocketBot...`);
            const sendResult = await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                chat_id: affiliateBotId,
                text: traderId
            }, {
                timeout: 10000
            });

            if (!sendResult.data.ok) {
                throw new Error(`Failed to send message: ${sendResult.data.description}`);
            }

            console.log(`[${new Date().toISOString()}] ✅ Message sent, waiting for response (8 seconds)...`);

            // Wait for bot response
            const response = await this.waitForBotResponse(affiliateBotId, 8000);

            if (response) {
                // Parse the response
                const userData = this.parseBotResponse(response);

                // Cache the result
                queryCache[cacheKey] = {
                    data: userData,
                    timestamp: Date.now()
                };

                console.log(`[${new Date().toISOString()}] ✅ Bot response received: Registered=${userData.registered}, Affiliate=${userData.affiliateRegistered || false}`);
                return userData;
            } else {
                console.log(`[${new Date().toISOString()}] ⏱️ No response from bot (timeout after 8 seconds)`);
                return {
                    registered: false,
                    message: "No response from affiliate bot (timeout)"
                };
            }

        } catch (error) {
            console.error(`[ERROR verifying with affiliate bot] ${error.message}`);
            if (error.response?.data) {
                console.error(`[ERROR details]`, error.response.data);
            }
            return {
                registered: false,
                message: `Error during verification: ${error.message}`
            };
        }
    }

    /**
     * Wait for bot response by polling updates
     */
    async waitForBotResponse(botChatId, timeoutMs = 8000) {
        const startTime = Date.now();
        let offset = 0;

        while (Date.now() - startTime < timeoutMs) {
            try {
                // Get updates from bot
                const updates = await axios.get(`https://api.telegram.org/bot${this.botToken}/getUpdates`, {
                    params: {
                        offset: offset,
                        timeout: 5,
                        allowed_updates: ["message"]
                    },
                    timeout: 15000
                });

                if (updates.data.ok && updates.data.result && updates.data.result.length > 0) {
                    for (const update of updates.data.result) {
                        offset = Math.max(offset, update.update_id + 1);

                        // Look for message from affiliate bot
                        if (update.message && update.message.chat.id === botChatId && update.message.text) {
                            console.log(`[${new Date().toISOString()}] 📩 Response received from @AffiliatePocketBot`);
                            return update.message.text;
                        }
                    }
                }
            } catch (err) {
                console.warn(`[WARNING] Error polling updates: ${err.message}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return null;
    }

    /**
     * Parse bot response to extract user data and check for affiliate registration
     */
    parseBotResponse(text) {
        if (!text) {
            return {
                registered: false,
                message: "Empty response from bot"
            };
        }

        console.log(`[${new Date().toISOString()}] 🔍 Parsing bot response...`);

        // Check if user not found
        if (text.includes("User not found") || text.includes("not found")) {
            console.log(`[${new Date().toISOString()}] ❌ Trader ID not found in Pocket Option`);
            return {
                registered: false,
                message: "Trader ID not found in Pocket Option system"
            };
        }

        // Check if account was registered through affiliate link
        const hasAffiliateLink = text.includes("Link type:") || text.includes("Link:");
        
        if (!hasAffiliateLink) {
            // Account exists but not registered through affiliate link
            console.log(`[${new Date().toISOString()}] ❌ Account exists but NOT through affiliate link`);
            return {
                registered: false,
                affiliateRegistered: false,
                message: "Account was not registered through our affiliate link"
            };
        }

        console.log(`[${new Date().toISOString()}] ✅ Account registered through affiliate link!`);

        // Parse user details from response
        const userData = {
            registered: true,
            affiliateRegistered: true,
            raw: text
        };

        // Extract UID
        const uidMatch = text.match(/UID:\s*(\d+)/i);
        if (uidMatch) userData.uid = uidMatch[1];

        // Extract registration date
        const regDateMatch = text.match(/Reg date:\s*([^\n]+)/i);
        if (regDateMatch) userData.regDate = regDateMatch[1];

        // Extract activity date
        const activityDateMatch = text.match(/Activity date:\s*([^\n]+)/i);
        if (activityDateMatch) userData.activityDate = activityDateMatch[1];

        // Extract country
        const countryMatch = text.match(/Country:\s*([^\n]+)/i);
        if (countryMatch) userData.country = countryMatch[1];

        // Extract verification status
        const verifiedMatch = text.match(/Verified:\s*([^\n]+)/i);
        if (verifiedMatch) userData.verified = verifiedMatch[1].toLowerCase() === "yes";

        // Extract balance
        const balanceMatch = text.match(/Balance:\s*\$([^\n]+)/i);
        if (balanceMatch) userData.balance = balanceMatch[1];

        // Extract FTD amount
        const ftdMatch = text.match(/FTD amount:\s*\$([^\n]+)/i);
        if (ftdMatch) userData.ftdAmount = ftdMatch[1];

        // Extract FTD date
        const ftdDateMatch = text.match(/FTD date:\s*([^\n]+)/i);
        if (ftdDateMatch) userData.ftdDate = ftdDateMatch[1];

        // Extract link type
        const linkTypeMatch = text.match(/Link type:\s*([^\n]+)/i);
        if (linkTypeMatch) userData.linkType = linkTypeMatch[1];

        // Extract affiliate link
        const linkMatch = text.match(/Link:\s*(https?:\/\/[^\n]+)/i);
        if (linkMatch) userData.affiliateLink = linkMatch[1];

        return userData;
    }

    /**
     * Disconnect (no-op for Bot API approach)
     */
    async disconnect() {
        console.log(`[${new Date().toISOString()}] ✅ Affiliate Bot Service disconnected`);
    }
}

// Create singleton instance
const affiliateBotService = new AffiliateBotService();

module.exports = affiliateBotService;
