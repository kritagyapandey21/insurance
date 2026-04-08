#!/usr/bin/env node

/**
 * Affiliate Bot Trader Verification Test
 * Tests trader ID verification via @AffiliatePocketBot
 * 
 * Run: node test-affiliate-bot.js <trader_id>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'telegram-bot/.env') });

const affiliateBotService = require('./telegram-bot/services/affiliateBotService');

async function testAffiliateBot() {
    const traderId = process.argv[2];

    if (!traderId) {
        console.error('❌ Error: Trader ID required');
        console.log('Usage: node test-affiliate-bot.js <trader_id>');
        console.log('Example: node test-affiliate-bot.js 12345678');
        process.exit(1);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🤖 Affiliate Bot Trader Verification Test');
    console.log(`${'='.repeat(60)}\n`);

    // Check environment variables
    console.log('📋 Environment Check:');
    const requiredVars = ['TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_PHONE_NUMBER'];
    let allVarsSet = true;

    requiredVars.forEach(varName => {
        const isSet = process.env[varName] ? '✅' : '❌';
        console.log(`  ${isSet} ${varName}: ${process.env[varName] ? '***' : 'NOT SET'}`);
        if (!process.env[varName]) allVarsSet = false;
    });

    if (!allVarsSet) {
        console.error('\n❌ Missing Telegram API credentials in .env');
        console.log('\nTo fix:');
        console.log('1. Get credentials from https://my.telegram.org/apps');
        console.log('2. Create/update telegram-bot/.env with:');
        console.log('   TELEGRAM_API_ID=<your_id>');
        console.log('   TELEGRAM_API_HASH=<your_hash>');
        console.log('   TELEGRAM_PHONE_NUMBER=<your_phone>');
        process.exit(1);
    }

    console.log('\n✅ All credentials set\n');

    try {
        console.log(`🔐 Initializing Telegram client...`);
        await affiliateBotService.initialize();

        console.log(`\n🔍 Verifying trader ID: ${traderId}\n`);
        const result = await affiliateBotService.verifyTraderWithAffiliate(traderId);

        if (result) {
            console.log('✅ Verification Result:');
            console.log(JSON.stringify(result, null, 2));

            if (result.registered) {
                console.log('\n📊 Summary:');
                console.log(`  • Registration Date: ${result.regDate || 'N/A'}`);
                console.log(`  • Last Activity: ${result.activityDate || 'N/A'}`);
                console.log(`  • Country: ${result.country || 'N/A'}`);
                console.log(`  • Verified: ${result.verified ? 'Yes ✅' : 'No ❌'}`);
                console.log(`  • Balance: ${result.balance || 'N/A'}`);
                console.log(`  • FTD Amount: ${result.ftdAmount || 'N/A'}`);
            }
        } else {
            console.log('⚠️ No response from affiliate bot (timeout or error)');
        }

        console.log(`\n${'='.repeat(60)}\n`);

    } catch (error) {
        console.error('❌ Error during verification:');
        console.error(error.message);
        
        if (error.message.includes('Must be logged in')) {
            console.log('\n🔑 Session Issue: Telegram session may have expired');
            console.log('Fix: Delete the session file and authenticate again');
        }
        
        process.exit(1);
    } finally {
        try {
            await affiliateBotService.disconnect();
            console.log('🔌 Disconnected from Telegram');
        } catch (err) {
            // Ignore disconnect errors
        }
        process.exit(0);
    }
}

// Run test
testAffiliateBot().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
