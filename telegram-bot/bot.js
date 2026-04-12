/**
 * Telegram Bot for Crypto Insurance Platform
 * Handles /start command and opens Mini App via WebApp URL
 */

require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const affiliateBotService = require("./services/affiliateBotService");

// Initialize bot with token
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Admin ID
const ADMIN_ID = parseInt(process.env.ADMIN_TELEGRAM_ID);

// Mini App URL - Update this with your deployed mini app URL
const MINI_APP_URL = process.env.MINI_APP_URL || "https://your-mini-app.vercel.app";

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

/**
 * Helper function to check if user is admin
 */
function isAdmin(userId) {
  return userId === ADMIN_ID;
}

/**
 * Helper function to save user to MongoDB via backend API
 */
async function saveUserToDatabase(userId, traderId, firstName, lastName) {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/create-user`, {
      fullName: `${firstName}${lastName ? ' ' + lastName : ''}`.trim(),
      traderId: traderId,
      telegramId: userId,
      initialAmount: 100, // Default minimum amount for now
      insuranceFee: 10 // 10% of 100
    });

    console.log(`[${new Date().toISOString()}] ✅ User ${userId} saved to MongoDB`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error saving user to database:`, error.message);
    return null;
  }
}

/**
 * Queue registration for manual admin verification
 */
async function queuePendingRegistration(ctx, traderId) {
  global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
  global.pendingRegistrations = global.pendingRegistrations || {};

  global.pendingRegistrations[ctx.from.id] = {
    traderId: traderId,
    telegramId: ctx.from.id,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name || '',
    username: ctx.from.username || 'N/A',
    submittedAt: new Date().toLocaleString(),
    status: 'pending'
  };

  delete global.usersAwaitingTraderId[ctx.from.id];

  const confirmMsg = `
✅ Trader ID Received!

Your Trader ID: ${traderId}
Status: ⏳ Waiting for admin verification...

You will receive a notification once admin approves your registration.
Thank you for your patience!`;

  await ctx.reply(confirmMsg);

  const adminNotification = `
🔔 NEW REGISTRATION REQUEST

👤 User Details:
• Name: ${ctx.from.first_name} ${ctx.from.last_name || ''}
• Telegram ID: ${ctx.from.id}
• Username: @${ctx.from.username || 'N/A'}

📊 Registration Info:
• Trader ID: ${traderId}
• Time: ${new Date().toLocaleString()}

Please review and approve or deny this registration.`;

  await ctx.telegram.sendMessage(
    ADMIN_ID,
    adminNotification,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("✅ APPROVE", `approve_user_${ctx.from.id}`),
        Markup.button.callback("❌ DENY", `deny_user_${ctx.from.id}`)
      ]
    ])
  );

  console.log(`[${new Date().toISOString()}] New registration pending: User ${ctx.from.id} with Trader ID: ${traderId}`);
}

/**
 * Store for user data (in production, use a database)
 */
global.registeredUsers = global.registeredUsers || {};
global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
global.pendingRegistrations = global.pendingRegistrations || {};
global.claimData = global.claimData || {};
global.usersAwaitingClaimPayment = global.usersAwaitingClaimPayment || {};
global.usersAwaitingClaimTrader = global.usersAwaitingClaimTrader || {};

/**
 * Middleware: Log all updates
 */
bot.use((ctx, next) => {
  console.log(`[${new Date().toISOString()}] Update received from ${ctx.from?.id} - ${ctx.from?.first_name}`);
  return next();
});

/**
 * Start Command Handler
 * Displays different interface for admin vs regular users
 */
bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    // Check if user is admin
    if (isAdmin(userId)) {
      // ADMIN INTERFACE
      const adminMessage = `
👑 Welcome Admin: ${userName}

Dashboard Available:

📊 Analytics:
• View registered users
• View pending traders
• View insurance status

⚙️ Management:
• Approve/Reject traders
• View all transactions
• Send announcements

What would you like to do?`;

      await ctx.reply(
        adminMessage,
        Markup.inlineKeyboard([
          [Markup.button.callback("📊 View Statistics", "admin_stats")],
          [Markup.button.callback("👥 View Users", "admin_users")],
          [Markup.button.callback("✅ Pending Traders", "admin_pending")],
          [Markup.button.callback("� Pending Claims", "admin_pending_claims")],
          [Markup.button.callback("�💬 Send Announcement", "admin_announce")]
        ])
      );

      console.log(`[${new Date().toISOString()}] ⭐ ADMIN LOGIN: ${userId} - ${userName}`);
    } else {
      // REGULAR USER INTERFACE
      const welcomeMessage = [
        "🛡️ Welcome to PocketShield Insurance",
        "",
        "Join Our Channel for updates and latest news: https://t.me/pocket_shield",
        "",
        "We provide secure coverage for your trading funds.",
        "",
        "✨ Why Choose Us?",
        "• Transparent & decentralized claims",
        "• 10% flat insurance fee",
        "• 24/7 customer support",
        "",
        "Get insured in minutes today!"
      ].join("\n");

      // Send welcome message
      await ctx.reply(welcomeMessage);

      // Ask if user is insured
      const questionMessage = `

❓ Are you already insured with us?`;

      await ctx.reply(
        questionMessage,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Yes, I'm Insured", "user_insured_yes"),
            Markup.button.callback("❌ No, I'm Not Insured", "user_insured_no")
          ]
        ])
      );

      // Log user start
      console.log(`[${new Date().toISOString()}] User started: ${userId} - ${userName}`);
    }
  } catch (error) {
    console.error(`[ERROR in /start] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again or contact support.");
  }
});

/**
 * Help Command Handler
 * Shows available commands
 */
bot.help((ctx) => {
  try {
    if (isAdmin(ctx.from.id)) {
      // Admin help
      ctx.reply(
        `📋 ADMIN COMMANDS:\n\n` +
        `/start - Open admin dashboard\n` +
        `/admin - Full admin panel\n` +
        `/status - Admin stats\n` +
        `/help - Show this message\n\n` +
        `Quick Actions:\n` +
        `• View all users → /status\n` +
        `• View analytics → /admin\n` +
        `• Send announcements → /admin\n\n` +
        `Admin ID: ${ctx.from.id}`
      );
    } else {
      // Regular user help
      ctx.reply(
        `📋 Available Commands:\n\n` +
        `/start - Start the insurance process\n` +
        `/help - Show this message\n` +
        `/status - Check your insurance status\n\n` +
        `Quick Links:\n` +
        `• Check if you're insured → /start\n` +
        `• Get new insurance → /start → Click "No"\n` +
        `• View policy → /status\n\n` +
        `For inquiries, contact @Pocketshieldsupport`
      );
    }
  } catch (error) {
    console.error(`[ERROR in /help] ${error.message}`, error);
    ctx.reply("❌ An unexpected error occurred. Please try again or contact support.");
  }
});

/**
 * Status Command Handler
 * Shows user's insurance status or admin dashboard
 */
bot.command("status", (ctx) => {
  try {
    if (isAdmin(ctx.from.id)) {
      // Admin status
      ctx.reply(
        `👑 ADMIN DASHBOARD\n\n` +
        `📊 Quick Stats:\n` +
        `• Total Users: ${Object.keys(global.registeredUsers).length}\n` +
        `• Pending: ${Object.keys(global.usersAwaitingTraderId).length}\n\n` +
        `💡 Tip: Use /admin for full admin panel`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Refresh", "admin_stats")],
          [Markup.button.callback("👑 Admin Panel", "admin_panel")]
        ])
      );
    } else {
      // Regular user status
      ctx.reply(
        `📊 Your Insurance Status\n\n` +
        `User ID: ${ctx.from.id}\n` +
        `Status: Not Active\n\n` +
        `Start the process to get insured →`,
        Markup.inlineKeyboard([
          Markup.button.webApp(
            "🛡️ Get Insured Now",
            `${MINI_APP_URL}?startParam=${ctx.from.id}`
          ),
        ])
      );
    }
  } catch (error) {
    console.error(`[ERROR in /status] ${error.message}`, error);
    ctx.reply("❌ An unexpected error occurred. Please try again or contact support.");
  }
});

/**
 * Admin Command Handler
 */
bot.command("admin", async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.reply("❌ You do not have permission to access the admin panel.");
      console.log(`[${new Date().toISOString()}] ⚠️ Unauthorized admin access attempt from ${ctx.from.id}`);
      return;
    }

    const adminMessage = `
👑 ADMIN PANEL

Dashboard Available:

📊 Analytics:
• View registered users
• View pending traders  
• View insurance status

⚙️ Management:
• Approve/Reject traders
• View all transactions
• Send announcements

What would you like to do?`;

    await ctx.reply(
      adminMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 View Statistics", "admin_stats")],
        [Markup.button.callback("👥 View Users", "admin_users")],
        [Markup.button.callback("✅ Pending Traders", "admin_pending")],
        [Markup.button.callback("� Pending Claims", "admin_pending_claims")],
        [Markup.button.callback("�💬 Send Announcement", "admin_announce")]
      ])
    );

    console.log(`[${new Date().toISOString()}] ⭐ Admin ${ctx.from.id} accessed admin panel`);
  } catch (error) {
    console.error(`[ERROR in /admin] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle "Yes, I'm Insured" button
 */
bot.action('user_insured_yes', async (ctx) => {
  try {
    await ctx.answerCbQuery(); // Close the loading indicator on button
    
    // Edit the message to show user's selection
    await ctx.editMessageText('❓ Are you already insured with us?\n\n✅ Yes, I\'m Insured');
    
    // Send bot's response as a new message
    const insuredMessage = `
✅ Great! You're already insured with us.

📊 Your Insurance Status:
• Status: Active
• Coverage: 3 months
• Premium Rate: 10%

What would you like to do?`;

    await ctx.reply(
      insuredMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 Check Status", "insured_check_status")],
        [Markup.button.callback("💰 Claim Insurance", "insured_claim_insurance")],
        [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
      ])
    );

    console.log(`[${new Date().toISOString()}] User ${ctx.from.id} confirmed: Already insured`);
  } catch (error) {
    console.error(`[ERROR in user_insured_yes] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

/**
 * Handle "Check Status" button from insured users
 */
bot.action('insured_check_status', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    // Fetch user data from backend using telegram ID
    const response = await axios.get(`${BACKEND_URL}/api/user-by-telegram/${ctx.from.id}`);

    if (response.data && response.data.success) {
      const userData = response.data.data;
      const validUntilDate = new Date(userData.coverageEndDate).toLocaleDateString();
      const activationDate = userData.coverageStartDate ? new Date(userData.coverageStartDate).toLocaleDateString() : 'N/A';

      const statusMessage = `
📊 YOUR INSURANCE DETAILS

👤 Personal Information:
• Name: ${userData.fullName}
• Trader ID: ${userData.traderId}
• Telegram ID: ${userData.telegramId}

💼 Insurance Policy:
• Status: ✅ ${userData.coverageStatus.toUpperCase()}
• Payment Status: ${userData.paymentStatus.toUpperCase()}

💰 Insurance Amount:
• Initial Deposit: $${userData.initialAmount} USDT
• Premium Paid: $${userData.insuranceFee} USDT (10%)
• Coverage Amount: $${userData.initialAmount * 0.4} USDT (40% coverage)

📅 Coverage Period:
• Activated: ${activationDate}
• Valid Until: ${validUntilDate}
• Duration: 3 months

📋 Coverage Terms:
✓ Covers 40% of account loss only
✓ Before any withdrawals
✓ Account must be verified via Pocket Option
✓ Created using referral link

❌ NOT Covered:
✗ Partial losses
✗ After any withdrawal
✗ Unverified accounts
✗ Manual trading losses

Need help? Contact @Pocketshieldsupport`;

      await ctx.reply(statusMessage);
      console.log(`[${new Date().toISOString()}] User ${ctx.from.id} checked insurance status - Found data for Trader ID: ${userData.traderId}`);
    } else {
      // No insurance found
      const noInsuranceMessage = `
❌ Sorry, you don't have insurance!

Don't worry, buy one today! 🛡️

Getting insured is easy:
1️⃣ Click "No, I'm Not Insured" from the main menu
2️⃣ Create your Pocket Option account via our referral link
3️⃣ Deposit minimum $100 USDT
4️⃣ Fill in your details and make the insurance payment
5️⃣ Done! You're covered for 3 months

Benefits:
✓ 100% coverage on total account loss
✓ Fast claim processing
✓ 24/7 support
✓ Covers only total loss before withdrawals`;

      await ctx.reply(
        noInsuranceMessage,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
        ])
      );
      console.log(`[${new Date().toISOString()}] User ${ctx.from.id} checked status - No insurance found`);
    }
  } catch (error) {
    console.error(`[ERROR in insured_check_status] ${error.message}`);

    // If user doesn't have insurance
    const noInsuranceMessage = `
❌ Sorry, you don't have insurance!

Don't worry, buy one today! 🛡️

Getting insured is easy:
1️⃣ Click "No, I'm Not Insured" from the main menu
2️⃣ Create your Pocket Option account via our referral link
3️⃣ Deposit minimum $100 USDT
4️⃣ Fill in your details and make the insurance payment
5️⃣ Done! You're covered for 3 months

Benefits:
✓ 100% coverage on total account loss
✓ Fast claim processing
✓ 24/7 support
✓ Covers only total loss before withdrawals`;

    await ctx.reply(
      noInsuranceMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
      ])
    );
  }
});

/**
 * Handle "Claim Insurance" button from insured users
 */
bot.action('insured_claim_insurance', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    global.usersAwaitingClaimTrader = global.usersAwaitingClaimTrader || {};
    global.claimData = global.claimData || {};

    global.usersAwaitingClaimTrader[ctx.from.id] = true;
    global.claimData[ctx.from.id] = {
      userId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || 'N/A',
      submittedAt: new Date().toLocaleString(),
      status: 'awaiting_trader_id'
    };

    await ctx.reply(
      `📝 CLAIM REQUEST\n\nPlease enter your Trader ID to continue your insurance claim verification.`
    );

    console.log(`[${new Date().toISOString()}] Claim flow started, awaiting trader ID for user ${ctx.from.id}`);

  } catch (error) {
    console.error(`[ERROR in insured_claim_insurance] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

/**
 * Handle "Go Back to Main Menu" button from insured users
 */
bot.action('insured_go_back', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const welcomeMessage = [
      "🛡️ Welcome to PocketShield Insurance",
      "",
      "Join Our Channel for updates and latest news: https://t.me/pocket_shield",
      "",
      "We provide secure coverage for your trading funds.",
      "",
      "✨ Why Choose Us?",
      "• Transparent & decentralized claims",
      "• 10% flat insurance fee",
      "• 24/7 customer support",
      "",
      "Get insured in minutes today!"
    ].join("\n");

    // Send welcome message
    await ctx.reply(welcomeMessage);

    // Ask if user is insured
    const questionMessage = `

❓ Are you already insured with us?`;

    await ctx.reply(
      questionMessage,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Yes, I'm Insured", "user_insured_yes"),
          Markup.button.callback("❌ No, I'm Not Insured", "user_insured_no")
        ]
      ])
    );

    console.log(`[${new Date().toISOString()}] User ${ctx.from.id} went back to main menu`);
  } catch (error) {
    console.error(`[ERROR in insured_go_back] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

/**
 * ADMIN CALLBACKS
 */

/**
 * Handle Admin - View Statistics
 */
bot.action('admin_stats', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    // Fetch user data from backend
    let totalPremium = 0;
    let userPremiumDetails = '';

    try {
      const response = await axios.get(`${BACKEND_URL}/api/users-list`);
      if (response.data && response.data.data) {
        const users = response.data.data;

        // Normalize legacy rows created by an older premium-scaling bug.
        // Old rows may have initialAmount=10 and insuranceFee=1 for a $10 premium.
        const getNormalizedPremium = (user) => {
          const premium = Number(user.insuranceFee || 0);
          const initialAmount = Number(user.initialAmount || 0);
          if (premium === 1 && initialAmount === 10) {
            return 10;
          }
          return premium;
        };

        totalPremium = users.reduce((sum, user) => sum + getNormalizedPremium(user), 0);
        
        if (users.length > 0) {
          userPremiumDetails = users
            .map((user, idx) => {
              const normalizedPremium = getNormalizedPremium(user);
              const premiumText = Number.isInteger(normalizedPremium)
                ? normalizedPremium
                : normalizedPremium.toFixed(2);
              const insuranceDate = user.coverageStartDate || user.paymentVerifiedAt || user.createdAt;
              const insuranceDateText = insuranceDate
                ? new Date(insuranceDate).toLocaleDateString()
                : "N/A";
              return `${idx + 1}. ${user.fullName}\n   💰 Premium: $${premiumText}\n   ID: ${user.traderId}\n   📅 Insurance Date: ${insuranceDateText}`;
            })
            .join('\n\n');
        } else {
          userPremiumDetails = 'No users registered yet.';
        }
      }
    } catch (error) {
      console.error(`[Error fetching users list] ${error.message}`);
      userPremiumDetails = 'Unable to fetch user data from database.';
    }

    const stats = `
📊 SYSTEM STATISTICS

👥 Total Registered Users: ${Object.keys(global.registeredUsers).length}
⏳ Awaiting Trader ID: ${Object.keys(global.usersAwaitingTraderId).length}

💰 PREMIUM COLLECTION:
• Total Premium Collected: $${totalPremium.toFixed(2)}
• Average Premium per User: $${Object.keys(global.registeredUsers).length > 0 ? (totalPremium / Object.keys(global.registeredUsers).length).toFixed(2) : '0'}

📋 USER PREMIUM BREAKDOWN:
${userPremiumDetails}

📈 Summary:
• Active Policies: N/A (Pending payment verification)
• Pending Policies: ${Object.keys(global.registeredUsers).length}

🔔 Last Updated: ${new Date().toLocaleString()}`;

    await ctx.reply(stats);
    console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed statistics with premium data`);
  } catch (error) {
    console.error(`[ERROR in admin_stats] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle Admin - View Users
 */
bot.action('admin_users', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    const userList = Object.keys(global.registeredUsers).length > 0 
      ? Object.entries(global.registeredUsers)
          .map(([id, data]) => `• ID: ${id}\n  Email: ${data.email || 'N/A'}\n  Registered: ${data.registeredAt || 'N/A'}`)
          .join('\n\n')
      : 'No users registered yet.';

    const message = `
👥 REGISTERED USERS

${userList}

Total: ${Object.keys(global.registeredUsers).length} users`;

    await ctx.reply(message);
    console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed users list`);
  } catch (error) {
    console.error(`[ERROR in admin_users] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle Admin - View Pending Traders
 */
bot.action('admin_pending', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    const pendingList = Object.keys(global.usersAwaitingTraderId).length > 0
      ? Object.keys(global.usersAwaitingTraderId)
          .map((id, idx) => `${idx + 1}. User ID: ${id}`)
          .join('\n')
      : 'No pending traders.';

    const message = `
✅ PENDING TRADERS (Awaiting Verification)

${pendingList}

Total Pending: ${Object.keys(global.usersAwaitingTraderId).length}`;

    await ctx.reply(message);
    console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed pending traders`);
  } catch (error) {
    console.error(`[ERROR in admin_pending] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle Admin - View Pending Claims
 */
bot.action('admin_pending_claims', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    // Fetch claims from backend API instead of global memory
    try {
      const response = await axios.get(`${BACKEND_URL}/api/claims?status=pending_review&limit=20`);
      
      if (response.data && response.data.success) {
        const claims = response.data.data;
        
        let claimsList = '';
        if (claims.length > 0) {
          claimsList = claims
            .map((claim, idx) => 
              `#${idx + 1}
📌 Claim ID: ${claim.claimId}
🆔 Trader ID: ${claim.traderId}
💰 Amount: ${claim.amount} USDT
📝 Description: ${claim.description.substring(0, 50)}${claim.description.length > 50 ? '...' : ''}
⏰ Submitted: ${new Date(claim.createdAt).toLocaleDateString()}
📊 Status: ${claim.status}`)
            .join('\n\n' + '─'.repeat(40) + '\n\n');
        } else {
          claimsList = '✅ No pending claims at the moment.';
        }

        const message = `
📋 PENDING INSURANCE CLAIMS

${claimsList}

Total Pending: ${claims.length}

Use /admin to manage claims`;

        await ctx.reply(message);
        console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed pending claims - Total: ${claims.length}`);
      }
    } catch (apiError) {
      console.error(`[${new Date().toISOString()}] Error fetching claims from API:`, apiError.message);
      await ctx.reply("❌ Error fetching claims from database. Please try again.");
    }
  } catch (error) {
    console.error(`[ERROR in admin_pending_claims] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle Admin Panel button
 */
bot.action('admin_panel', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    const adminMessage = `
👑 ADMIN PANEL

Dashboard Available:

📊 Analytics:
• View registered users
• View pending traders
• View insurance status

⚙️ Management:
• Approve/Reject traders
• View all transactions
• Send announcements

What would you like to do?`;

    await ctx.editMessageText(
      adminMessage,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 View Statistics", "admin_stats")],
        [Markup.button.callback("👥 View Users", "admin_users")],
        [Markup.button.callback("✅ Pending Traders", "admin_pending")],
        [Markup.button.callback("� Pending Claims", "admin_pending_claims")],
        [Markup.button.callback("💸 Pending Payouts", "admin_pending_payouts")],
        [Markup.button.callback("�💬 Send Announcement", "admin_announce")]
      ])
    );
  } catch (error) {
    /**
     * Handle Admin - View Pending Payouts (claims waiting for payment completion)
     */
    bot.action('admin_pending_payouts', async (ctx) => {
      try {
        if (!isAdmin(ctx.from.id)) {
          await ctx.answerCbQuery("❌ Unauthorized", true);
          return;
        }

        await ctx.answerCbQuery();

        global.claimData = global.claimData || {};
        const claimsArray = Object.entries(global.claimData)
          .filter(([_, data]) => data.status === 'approved_network' || data.status === 'wallet_submitted');

        let claimsList = '';
        if (claimsArray.length > 0) {
          claimsList = claimsArray
            .map(([userId, data], idx) =>
              `#${idx + 1}
    📌 User ID: ${userId}
    🆔 Trader ID: ${data.traderId}
    💰 Payment Address: ${data.paymentAddress || 'Not submitted yet'}
    ⏰ Submitted: ${data.submittedAt}
    📊 Status: ${data.status}`)
            .join('\n\n' + '─'.repeat(40) + '\n\n');
        } else {
          claimsList = '✅ No pending payouts at the moment.';
        }

        const message = `
    💸 PENDING PAYOUTS (Waiting for Payment Completion)

    ${claimsList}

    Total Pending: ${claimsArray.length}`;

        await ctx.reply(message);
        console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed pending payouts - Total: ${claimsArray.length}`);
      } catch (error) {
        console.error(`[ERROR in admin_pending_payouts] ${error.message}`, error);
        await ctx.reply("❌ An error occurred.");
      }
    });
    console.error(`[ERROR in admin_panel] ${error.message}`, error);
  }
});
bot.action('admin_announce', async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ Unauthorized", true);
      return;
    }

    await ctx.answerCbQuery();

    global.adminAnouncementMode = true;
    global.adminAnouncementMode_UserId = ctx.from.id;

    const message = `📢 ANNOUNCEMENT MODE

Send me the message you want to announce to all users.
This message will be sent to all registered users.

⚠️ Make it clear and professional!`;

    await ctx.reply(message);
    console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} entered announcement mode`);
  } catch (error) {
    console.error(`[ERROR in admin_announce] ${error.message}`, error);
    await ctx.reply("❌ An error occurred.");
  }
});

/**
 * Handle "No, I'm Not Insured" button
 */
bot.action('user_insured_no', async (ctx) => {
  try {
    await ctx.answerCbQuery(); // Close the loading indicator on button

    // Edit the message to show user's selection
    await ctx.editMessageText('❓ Are you already insured with us?\n\n❌ No, I\'m Not Insured');

    const accountCreationMessage = `YOUR ACCOUNT MUST BE UNDER THIS LINK 👇
✅ https://u3.shortink.io/register?utm_campaign=834817&utm_source=affiliate&utm_medium=sr&a=POY4xB1cswM8K7&al=1750773&ac=pocketshield&cid=951300&code=WELCOME50

Important Points:
✔ VPN must be OFF
✔ Use Web version for better understanding
✔ Use New Email
✔ Verify with documents of your National ID

🍃 DEPOSIT 100$ (You can use bonus if you want but we will not count it as in our insurance)

Send your Trader Id Number only.
(Ex. - 132547687)`;

    await ctx.reply(accountCreationMessage);

    // Send second message asking for trader ID
    const traderIdMessage = `After creating account, send me your Trader ID number for insurance processing 👇`;

    await ctx.reply(traderIdMessage);

    // Store this user as "awaiting_trader_id" in a simple in-memory map
    // In production, use a database instead
    global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
    global.usersAwaitingTraderId[ctx.from.id] = true;

    console.log(`[${new Date().toISOString()}] User ${ctx.from.id} confirmed: Not insured, waiting for trader ID`);
  } catch (error) {
    console.error(`[ERROR in user_insured_no] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

/**
 * Error Handler
 */
bot.catch((err, ctx) => {
  console.error(`[ERROR] ${new Date().toISOString()} - Message: ${err.message}`, err);
  
  if (ctx && ctx.reply) {
    try {
      ctx.reply(
        "❌ An unexpected error occurred. Please try again or contact support."
      );
    } catch (replyErr) {
      console.error(`[ERROR] Failed to send error reply:`, replyErr);
    }
  }
});

/**
 * Generic message handler - captures trader IDs, handles announcements, admin modes, and claim details
 */
bot.on('message', async (ctx) => {
  try {
    // Check if admin is in announcement mode
    if (global.adminAnouncementMode && global.adminAnouncementMode_UserId === ctx.from.id) {
      const message = ctx.message.text;
      
      global.adminAnouncementMode = false;
      delete global.adminAnouncementMode_UserId;

      const confirmMessage = `✅ Announcement queued!

Message:
"${message}"

This will be sent to all users.

Status: Ready to send (not implemented yet - add database integration)`;

      await ctx.reply(confirmMessage);
      console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} created announcement`);
      return;
    }

    // ===== NEW REGISTRATION TRADER ID VERIFICATION =====
    // Check if user is awaiting trader ID for NEW insurance registration
    global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
    global.pendingRegistrations = global.pendingRegistrations || {};

    if (global.usersAwaitingTraderId[ctx.from.id]) {
      const traderId = ctx.message.text?.trim();
      
      if (traderId && traderId.length > 0 && !traderId.startsWith('/')) {
        await queuePendingRegistration(ctx, traderId);
        return;
      }
    }

    // Check if user is filing a claim and awaiting trader ID
    global.usersAwaitingClaimTrader = global.usersAwaitingClaimTrader || {};
    global.usersAwaitingClaimPayment = global.usersAwaitingClaimPayment || {};

    if (global.usersAwaitingClaimTrader[ctx.from.id]) {
      const traderIdClaim = ctx.message.text?.trim();
      
      if (traderIdClaim && traderIdClaim.length > 0 && !traderIdClaim.startsWith('/')) {
        try {
          // Get user info
          const verifyResponse = await axios.get(`${BACKEND_URL}/api/user-by-telegram/${ctx.from.id}`);
          
          if (verifyResponse.data && verifyResponse.data.success) {
            const userData = verifyResponse.data.data;
            
            // Store claim data and send to admin immediately (no validation)
            global.claimData = global.claimData || {};
            global.claimData[ctx.from.id] = {
              userId: ctx.from.id,
              firstName: ctx.from.first_name,
              lastName: ctx.from.last_name || '',
              username: ctx.from.username || 'N/A',
              traderId: traderIdClaim,
              fullName: userData.fullName,
              telegramId: ctx.from.id,
              initialAmount: userData.initialAmount,
              insuranceFee: userData.insuranceFee,
              coverageEndDate: userData.coverageEndDate,
              status: 'pending_admin_review',
              submittedAt: new Date().toLocaleString()
            };

            delete global.usersAwaitingClaimTrader[ctx.from.id];

            // Tell user claim is being sent to admin
            await ctx.reply(
              `✅ Claim Submitted!\n\n` +
              `🆔 Trader ID: ${traderIdClaim}\n` +
              `💰 Coverage Amount: $${userData.initialAmount * 0.4} USDT (40%)\n` +
              `📋 Premium Paid: $${userData.insuranceFee}\n\n` +
              `⏳ Sending to admin for review...\n` +
              `You will be notified once admin decides.`
            );

            // Send to admin for APPROVAL/REJECTION
            const adminClaimNotification = `
🔔 NEW INSURANCE CLAIM

👤 User: ${userData.fullName}
📱 Telegram ID: ${ctx.from.id}
🆔 Trader ID: ${traderIdClaim}

💼 Insurance Info:
• Amount: $${userData.initialAmount}
• Premium: $${userData.insuranceFee}

⏰ Submitted: ${global.claimData[ctx.from.id].submittedAt}

Approve or Reject?`;

              await ctx.telegram.sendMessage(
                ADMIN_ID,
                adminClaimNotification,
                Markup.inlineKeyboard([
                  [
                    Markup.button.callback("✅ APPROVE", `admin_approve_claim_${ctx.from.id}`),
                    Markup.button.callback("❌ REJECT", `admin_reject_claim_${ctx.from.id}`)
                  ]
                ])
              );

              console.log(`[${new Date().toISOString()}] 📋 Claim sent to admin: User ${ctx.from.id}, Trader ${traderIdClaim}`);
              
          } else {
            delete global.usersAwaitingClaimTrader[ctx.from.id];
            await ctx.reply(
              `❌ Error: User not found.\n\nPlease try again or contact support.`,
              Markup.inlineKeyboard([
                [Markup.button.callback("🔙 Go Back", "insured_go_back")]
              ])
            );
          }
        } catch (error) {
          console.error(`[Error in claim submission] ${error.message}`);
          delete global.usersAwaitingClaimTrader[ctx.from.id];
          
          await ctx.reply(
            `❌ An error occurred.\n\nPlease try again or contact support.`,
            Markup.inlineKeyboard([
              [Markup.button.callback("🔙 Go Back", "insured_go_back")]
            ])
          );
        }
      }
      return;
    }

    // Check if user is awaiting payment address for claim
    if (global.usersAwaitingClaimPayment[ctx.from.id]) {
      const paymentAddress = ctx.message.text?.trim();
      
      if (paymentAddress && paymentAddress.length > 0 && !paymentAddress.startsWith('/')) {
        // Store payment address
        if (global.claimData[ctx.from.id]) {
          global.claimData[ctx.from.id].paymentAddress = paymentAddress;
          global.claimData[ctx.from.id].userId = ctx.from.id;
          global.claimData[ctx.from.id].status = 'payment_in_progress';
        }

        delete global.usersAwaitingClaimPayment[ctx.from.id];

        const claimData = global.claimData[ctx.from.id];
        const network = claimData.paymentNetwork || 'Not selected';

        await ctx.reply("✅ Your payment is in progress. Please wait.");

        const adminNotification = `
💸 PAYMENT DETAILS SUBMITTED

👤 User Information:
• Name: ${claimData.verifiedUser?.fullName || `${claimData.firstName} ${claimData.lastName}`.trim()}
• Telegram ID: ${ctx.from.id}
• Trader ID: ${claimData.traderId}

🏦 Payout Details:
• Network: ${network.toUpperCase()}
• Wallet Address: ${paymentAddress}

📊 Claim Status: PAYMENT IN PROGRESS

When payment is completed, click Done below.`;

        try {
          await ctx.telegram.sendMessage(
            ADMIN_ID,
            adminNotification,
            Markup.inlineKeyboard([
              [Markup.button.callback("✅ DONE", `payment_done_${ctx.from.id}`)]
            ])
          );
          console.log(`[${new Date().toISOString()}] ✅ Payment details sent to admin for user ${ctx.from.id}`);
        } catch (error) {
          console.error(`[Error sending to admin] ${error.message}`);
        }

        console.log(`[${new Date().toISOString()}] User ${ctx.from.id} submitted payout wallet: ${paymentAddress}`);
      }
      return;
    }

    // Check if user is awaiting trader ID for new insurance
    global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
    
    if (global.usersAwaitingTraderId[ctx.from.id]) {
      const traderId = ctx.message.text?.trim();
      
      if (traderId && traderId.length > 0 && !traderId.startsWith('/')) {
        await queuePendingRegistration(ctx, traderId);
      }
      return;
    } else {
      // Check if message is a trader ID number (for quick registration check)
      const messageText = ctx.message.text?.trim();
      if (messageText && /^\d+$/.test(messageText) && !messageText.startsWith('/')) {
        const traderId = messageText;
        await queuePendingRegistration(ctx, traderId);
        return;
      } else {
        // Regular message handling
        if (!ctx.message.text?.startsWith('/')) {
          await ctx.reply(
            `👋 Hello! Send /start to begin your insurance journey with PocketShield.\n\nAvailable commands:\n/start - Begin insurance\n/help - Show help\n/status - Check status\n\n💡 Or send your Trader ID to check if you're registered through our link!`
          );
        }
      }
    }
  } catch (error) {
    console.error(`[ERROR in generic handler] ${error.message}`, error);
  }
});

/**
 * ===== ADMIN APPROVAL SYSTEM =====
 */

/**
 * Handle Admin - Approve User Registration
 */
bot.action(/^approve_user_(.+)$/, async (ctx) => {
  try {
    // Only admin can approve
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("✅ User approved!");

    // Get pending registration data
    global.pendingRegistrations = global.pendingRegistrations || {};
    const userData = global.pendingRegistrations[userId];

    if (!userData) {
      await ctx.reply("⚠️ User registration data not found!");
      return;
    }

    // Update the button/message
    await ctx.editMessageText(`
🔔 NEW REGISTRATION REQUEST

👤 User Details:
• Name: ${userData.firstName} ${userData.lastName}
• Telegram ID: ${userId}
• Username: @${userData.username}

📊 Registration Info:
• Trader ID: ${userData.traderId}
• Time: ${userData.submittedAt}

✅ STATUS: APPROVED BY ADMIN`);

    // Send success message to the user
    const approvalMessage = `
✅ REGISTRATION APPROVED!

Congratulations! Your account has been verified by our admin.

📋 Your Details:
• Trader ID: ${userData.traderId}
• Status: ✅ VERIFIED

➡️You can Join this Channel for Sureshot Signals: https://t.me/+mTusjfwTKY02NWRl

🎉 Next Steps:
Now you can access the insurance mini app to complete your payment and get insured!

Click the button below to proceed with insurance:`;

    // Check if MINI_APP_URL is properly set
    const isValidHttpsUrl = MINI_APP_URL && MINI_APP_URL.startsWith('https://');

    if (isValidHttpsUrl) {
      await ctx.telegram.sendMessage(
        userId,
        approvalMessage,
        Markup.inlineKeyboard([
          [Markup.button.webApp(
            "🛡️ Open Insurance App",
            `${MINI_APP_URL}?telegram_user_id=${userId}&trader_id=${encodeURIComponent(userData.traderId)}`
          )],
        ])
      );
    } else {
      await ctx.telegram.sendMessage(userId, approvalMessage);
    }

    // Mark as approved and remove from pending
    userData.status = 'approved';
    global.pendingRegistrations[userId] = userData;

    // Send admin confirmation
    await ctx.reply(`✅ Approval notification sent to user ${userId}!`);
    console.log(`[${new Date().toISOString()}] ✅ Admin ${ctx.from.id} APPROVED user ${userId} with Trader ID ${userData.traderId}`);

  } catch (error) {
    console.error(`[ERROR in approve_user] ${error.message}`, error);
    await ctx.reply("❌ An error occurred during approval!");
  }
});

/**
 * Handle Admin - Deny User Registration
 */
bot.action(/^deny_user_(.+)$/, async (ctx) => {
  try {
    // Only admin can deny
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("❌ User denied!");

    // Get pending registration data
    global.pendingRegistrations = global.pendingRegistrations || {};
    const userData = global.pendingRegistrations[userId];

    if (!userData) {
      await ctx.reply("⚠️ User registration data not found!");
      return;
    }

    // Update the button/message
    await ctx.editMessageText(`
🔔 NEW REGISTRATION REQUEST

👤 User Details:
• Name: ${userData.firstName} ${userData.lastName}
• Telegram ID: ${userId}
• Username: @${userData.username}

📊 Registration Info:
• Trader ID: ${userData.traderId}
• Time: ${userData.submittedAt}

❌ STATUS: DENIED BY ADMIN`);

    // Send rejection message to the user
    const denialMessage = `
  REGISTRATION NOT APPROVED

  Sorry, your account registration could not be verified at this time.

  📋 Your Information:
  ✓ Trader ID: ${userData.traderId}
  ✓ Status: ❌ NOT VERIFIED

  ⚠️ Possible Reasons:
  ✓ Account not created through our link
  ✓ You have not deposited the minimum amount on your trading account (100$)

  📝 Please Note:
  Your account must meet ALL requirements:
  ✓ Created via our link: https://u3.shortink.io/register?utm_campaign=834817&utm_source=affiliate&utm_medium=sr&a=POY4xB1cswM8K7&al=1750773&ac=pocketshield&cid=951300&code=WELCOME50
  ✓ Account verified on Pocket Option
  ✓ Minimum $100 USDT deposit
  ✓ All documents properly verified

  🔄 Next Steps:
  If you believe this is an error, please try again with:
  1. A new account created through our link
  2. Verified documents
  3. Minimum $100 deposit

  OR

  Type /start and select "No, I'm Not Insured" to restart the process.

  💬 Need help? Contact @Pocketshieldsupport`;

    await ctx.telegram.sendMessage(userId, denialMessage);

    // Mark as denied and ask for trader ID again
    const retryMessage = `

After creating/verifying your account properly, send your Trader ID again:`;

    await ctx.telegram.sendMessage(userId, retryMessage);

    // Mark user to await trader ID again
    global.usersAwaitingTraderId[userId] = true;

    // Mark as denied in pending
    userData.status = 'denied';
    global.pendingRegistrations[userId] = userData;

    // Send admin confirmation
    await ctx.reply(`❌ Denial notification sent to user ${userId}! They can retry with a new Trader ID.`);
    console.log(`[${new Date().toISOString()}] ❌ Admin ${ctx.from.id} DENIED user ${userId} with Trader ID ${userData.traderId}`);

  } catch (error) {
    console.error(`[ERROR in deny_user] ${error.message}`, error);
    await ctx.reply("❌ An error occurred during denial!");
  }
});

/**
 * Handle Admin - Approve Insurance Claim
 */
bot.action(/^approve_claim_(.+)$/, async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("✅ Claim allowed");

    global.claimData = global.claimData || {};
    const claim = global.claimData[userId];

    if (!claim) {
      await ctx.reply("⚠️ Claim data not found for this user.");
      return;
    }

    claim.status = 'approved_waiting_network';
    claim.reviewedAt = new Date().toLocaleString();
    claim.reviewedBy = ctx.from.id;
    global.claimData[userId] = claim;

    await ctx.editMessageText(`
📬 CLAIM REVIEW RESULT

👤 User ID: ${userId}
🆔 Trader ID: ${claim.traderId}
💰 Refund Address: ${claim.paymentAddress || 'Not provided yet'}

✅ STATUS: ALLOWED
🕒 Reviewed: ${claim.reviewedAt}
👑 Reviewed By Admin: ${ctx.from.id}`);

    await ctx.telegram.sendMessage(
      userId,
      `
✅ Your claim has been verified.

Please select the payment network:
• Trader ID: ${claim.traderId}
`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback("BEP20", "claim_network_bep20"),
          Markup.button.callback("TRC20", "claim_network_trc20")
        ]
      ])
    );

    await ctx.reply(`✅ Claim for user ${userId} has been allowed. Network selection sent to user.`);
    console.log(`[${new Date().toISOString()}] ✅ Admin ${ctx.from.id} allowed claim for user ${userId}`);
  } catch (error) {
    console.error(`[ERROR in approve_claim] ${error.message}`, error);
    await ctx.reply("❌ An error occurred while allowing the claim.");
  }
});

/**
 * Handle Admin - Deny Insurance Claim
 */
bot.action(/^deny_claim_(.+)$/, async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("❌ Claim denied");

    global.claimData = global.claimData || {};
    const claim = global.claimData[userId];

    if (!claim) {
      await ctx.reply("⚠️ Claim data not found for this user.");
      return;
    }

    claim.status = 'denied';
    claim.reviewedAt = new Date().toLocaleString();
    claim.reviewedBy = ctx.from.id;
    global.claimData[userId] = claim;

    await ctx.editMessageText(`
📬 CLAIM REVIEW RESULT

👤 User ID: ${userId}
🆔 Trader ID: ${claim.traderId}
💰 Refund Address: ${claim.paymentAddress || 'N/A'}

❌ STATUS: DENIED
🕒 Reviewed: ${claim.reviewedAt}
👑 Reviewed By Admin: ${ctx.from.id}`);

    await ctx.telegram.sendMessage(
      userId,
      `
❌ Your claim has been rejected.

Possible reasons for rejection:
1. Your ID was not created through our referral link.
2. You have violated the insurance terms and conditions.
3. There is still balance left in your Pocket Option account.

If you believe this decision is incorrect, contact support with your Trader ID and claim details.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
      ])
    );

    await ctx.reply(`❌ Claim for user ${userId} denied and user notified.`);
    console.log(`[${new Date().toISOString()}] ❌ Admin ${ctx.from.id} denied claim for user ${userId}`);
  } catch (error) {
    console.error(`[ERROR in deny_claim] ${error.message}`, error);
    await ctx.reply("❌ An error occurred while denying claim.");
  }
});

/**
 * Handle User - Select Claim Payment Network
 */
bot.action(/^claim_network_(bep20|trc20)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const selectedNetwork = ctx.match[1];
    global.claimData = global.claimData || {};
    global.usersAwaitingClaimPayment = global.usersAwaitingClaimPayment || {};

    const claim = global.claimData[ctx.from.id];
    if (!claim || claim.status !== 'approved_waiting_network') {
      await ctx.reply("❌ No approved claim session found. Please start again from the main menu.");
      return;
    }

    claim.paymentNetwork = selectedNetwork;
    claim.status = 'awaiting_wallet_address';
    global.claimData[ctx.from.id] = claim;
    global.usersAwaitingClaimPayment[ctx.from.id] = true;

    await ctx.reply(
      `✅ Payment network selected: ${selectedNetwork.toUpperCase()}\n\nPlease enter your wallet address.`
    );

    console.log(`[${new Date().toISOString()}] User ${ctx.from.id} selected payout network ${selectedNetwork}`);
  } catch (error) {
    console.error(`[ERROR in claim_network_select] ${error.message}`, error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

/**
 * Handle Admin - Mark Claim Payment Done
 */
bot.action(/^payment_done_(.+)$/, async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("✅ Payment marked as completed");

    global.claimData = global.claimData || {};
    const claim = global.claimData[userId];

    if (!claim) {
      await ctx.reply("⚠️ Claim data not found for this user.");
      return;
    }

    claim.status = 'payment_completed';
    claim.paymentCompletedAt = new Date().toLocaleString();
    claim.paymentCompletedBy = ctx.from.id;
    global.claimData[userId] = claim;

    await ctx.editMessageText(`
💸 CLAIM PAYMENT STATUS

👤 User ID: ${userId}
🆔 Trader ID: ${claim.traderId}
🌐 Network: ${(claim.paymentNetwork || 'N/A').toUpperCase()}
🏦 Wallet: ${claim.paymentAddress || 'N/A'}

✅ STATUS: PAYMENT COMPLETED
🕒 Completed At: ${claim.paymentCompletedAt}
👑 Completed By Admin: ${ctx.from.id}`);

    await ctx.telegram.sendMessage(
      userId,
      "✅ Payment has been completed."
    );

    // DELETE USER DATA FROM DATABASE AFTER PAYMENT COMPLETION
    try {
      const traderId = claim.traderId;
      
      // Delete from claims table
      await pool.query('DELETE FROM claims WHERE "traderId" = $1', [traderId]);
      
      // Delete from users table
      await pool.query('DELETE FROM users WHERE "traderId" = $1', [traderId]);
      
      // Clear from memory
      delete global.claimData[userId];
      
      console.log(`[${new Date().toISOString()}] 🗑️ User data deleted for Trader ID: ${traderId} after payment completion`);
    } catch (dbError) {
      console.error(`[ERROR deleting user data] ${dbError.message}`);
      await ctx.reply(`⚠️ Payment marked complete but error deleting user data: ${dbError.message}`);
    }

    await ctx.reply(`✅ Payment completion notification sent to user ${userId}. User data deleted from database.`);
    console.log(`[${new Date().toISOString()}] ✅ Admin ${ctx.from.id} marked payment done for user ${userId}`);
  } catch (error) {
    console.error(`[ERROR in payment_done] ${error.message}`, error);
    await ctx.reply("❌ An error occurred while marking payment as done.");
  }
});

/**
 * Handle Admin - APPROVE Insurance Claim (NEW FLOW)
 * This is part of the new admin-gated claim process
 */
bot.action(/^admin_approve_claim_(.+)$/, async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("✅ Claim approved!");

    global.claimData = global.claimData || {};
    const claimData = global.claimData[userId];

    if (!claimData) {
      await ctx.reply("⚠️ Claim data not found for this user.");
      return;
    }

    try {
      // STEP 1: Save claim to backend database with 'approved' status
      const claimPayload = {
        traderId: claimData.traderId,
        amount: claimData.initialAmount,
        description: `Insurance claim for trader ${claimData.traderId}`,
        telegramId: userId
      };

      console.log(`[${new Date().toISOString()}] 📤 Attempting to save claim to backend: ${BACKEND_URL}/api/claim`);
      console.log(`[${new Date().toISOString()}] Payload:`, claimPayload);

      const saveResponse = await axios.post(`${BACKEND_URL}/api/claim`, claimPayload, {
        timeout: 10000
      });

      console.log(`[${new Date().toISOString()}] ✅ Backend response:`, saveResponse.data);

      if (saveResponse.data && saveResponse.data.success) {
        const savedClaim = saveResponse.data.data;
        
        // Update local claim data with backend response
        claimData.status = 'approved_waiting_network';
        claimData.claimId = savedClaim.claimId;
        claimData.approvedAt = new Date().toLocaleString();
        claimData.approvedBy = ctx.from.id;
        global.claimData[userId] = claimData;

        // STEP 2: Update admin message
        await ctx.editMessageText(`
✅ CLAIM APPROVED

👤 User: ${claimData.fullName}
🆔 Trader ID: ${claimData.traderId}
💰 Coverage Amount: $${claimData.initialAmount * 0.4} USDT (40%)
📋 Claim ID: ${savedClaim.claimId}

✅ STATUS: APPROVED
🕒 Approved: ${claimData.approvedAt}
👑 Approved By: Admin ${ctx.from.id}

💾 Claim saved to database. Ready for payment.`);

        // STEP 3: Send approval message to user and ask for payment
        await ctx.telegram.sendMessage(
          userId,
          `
✅ YOUR CLAIM HAS BEEN APPROVED!

🎉 Great news! Your insurance claim has been verified and approved by our admin.

📊 Claim Details:
• Trader ID: ${claimData.traderId}
• Coverage Amount: $${claimData.initialAmount * 0.4} (40%)
• Claim ID: ${savedClaim.claimId}

💳 NEXT STEP: PAYMENT

Please select your preferred USDT payment network for the payout:`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback("🔶 BEP20 (BSC)", "claim_network_bep20"),
              Markup.button.callback("🔴 TRC20 (Tron)", "claim_network_trc20")
            ]
          ])
        );

        await ctx.reply(`✅ Claim approved and saved to database! Payment network selection sent to user ${userId}.`);
        console.log(`[${new Date().toISOString()}] ✅ Admin ${ctx.from.id} APPROVED claim for user ${userId} - Claim ID: ${savedClaim.claimId}`);

      } else {
        throw new Error('Failed to save claim to backend');
      }
    } catch (apiError) {
      console.error(`[ERROR saving claim to backend] ${apiError.message}`);
      console.error(`[Backend Error Details]`, {
        url: `${BACKEND_URL}/api/claim`,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        code: apiError.code,
        message: apiError.message
      });
      
      // Still mark as approved locally even if backend fails
      claimData.status = 'approved_waiting_network';
      claimData.approvedAt = new Date().toLocaleString();
      claimData.approvedBy = ctx.from.id;
      global.claimData[userId] = claimData;

      await ctx.editMessageText(`
✅ CLAIM APPROVED (LOCAL SAVE ONLY)

👤 User: ${claimData.fullName}
🆔 Trader ID: ${claimData.traderId}
💰 Coverage Amount: $${claimData.initialAmount * 0.4} (40%)

✅ STATUS: APPROVED (Local Memory)
🕒 Approved: ${claimData.approvedAt}
👑 Approved By: Admin ${ctx.from.id}

⚠️ BACKEND ISSUE: Database save failed
🔧 Error: ${apiError.response?.status} ${apiError.response?.statusText || apiError.code}
📝 Details: ${apiError.response?.data?.message || apiError.message}

🚨 ACTION NEEDED: Check backend server is running at ${BACKEND_URL}`);

      // Still send payment request to user
      await ctx.telegram.sendMessage(
        userId,
        `
✅ YOUR CLAIM HAS BEEN APPROVED!

🎉 Great news! Your insurance claim has been verified and approved by our admin.

📊 Claim Details:
• Trader ID: ${claimData.traderId}
• Coverage Amount: $${claimData.initialAmount * 0.4} (40%)

💳 NEXT STEP: PAYMENT

Please select your preferred USDT payment network for the payout:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🔶 BEP20 (BSC)", "claim_network_bep20"),
            Markup.button.callback("🔴 TRC20 (Tron)", "claim_network_trc20")
          ]
        ])
      );

      await ctx.reply(`⚠️ Claim approved but backend save failed. User sent payment network selection. Check server logs.`);
    }

  } catch (error) {
    console.error(`[ERROR in admin_approve_claim] ${error.message}`, error);
    await ctx.reply("❌ An error occurred while approving the claim.");
  }
});

/**
 * Handle Admin - REJECT Insurance Claim (NEW FLOW)
 * This is part of the new admin-gated claim process
 */
bot.action(/^admin_reject_claim_(.+)$/, async (ctx) => {
  try {
    if (!isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("❌ You don't have permission", true);
      return;
    }

    const userId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery("❌ Claim rejected!");

    global.claimData = global.claimData || {};
    const claimData = global.claimData[userId];

    if (!claimData) {
      await ctx.reply("⚠️ Claim data not found for this user.");
      return;
    }

    try {
      // STEP 1: Save REJECTED claim to backend database
      const claimPayload = {
        traderId: claimData.traderId,
        amount: claimData.initialAmount,
        description: `Insurance claim for trader ${claimData.traderId}`,
        telegramId: userId
      };

      console.log(`[${new Date().toISOString()}] 📤 Attempting to save REJECTED claim to backend: ${BACKEND_URL}/api/claim`);
      console.log(`[${new Date().toISOString()}] Payload:`, claimPayload);

      const saveResponse = await axios.post(`${BACKEND_URL}/api/claim`, claimPayload, {
        timeout: 10000
      });

      console.log(`[${new Date().toISOString()}] ✅ Backend response:`, saveResponse.data);

      if (saveResponse.data && saveResponse.data.success) {
        const savedClaim = saveResponse.data.data;
        
        claimData.status = 'rejected';
        claimData.claimId = savedClaim.claimId;
        claimData.rejectedAt = new Date().toLocaleString();
        claimData.rejectedBy = ctx.from.id;
        global.claimData[userId] = claimData;

        // STEP 2: Update admin message
        await ctx.editMessageText(`
❌ CLAIM REJECTED

👤 User: ${claimData.fullName}
🆔 Trader ID: ${claimData.traderId}
💰 Coverage Amount: $${claimData.initialAmount * 0.4} (40%)
📋 Claim ID: ${savedClaim.claimId}

❌ STATUS: REJECTED
🕒 Rejected: ${claimData.rejectedAt}
👑 Rejected By: Admin ${ctx.from.id}

📝 Reason: Claim verification failed during admin review`);

        // STEP 3: Send rejection message to user
        await ctx.telegram.sendMessage(
          userId,
          `
❌ YOUR CLAIM HAS BEEN REJECTED

Unfortunately, your insurance claim could not be approved at this time.

📊 Claim Details:
• Trader ID: ${claimData.traderId}
• Coverage Amount: $${claimData.initialAmount * 0.4} (40%)
• Claim ID: ${savedClaim.claimId}

📝 Reason for Rejection:
Claim verification failed during admin review. This may be due to:
1. Account not created through our referral link
2. Account still has balance remaining
3. Violation of insurance terms and conditions
4. Unverified account documentation

🆘 WHAT TO DO NEXT:

If you believe this is an error, please:
1. Contact support @Pocketshieldsupport
2. Provide your Trader ID and Claim ID
3. Include any relevant documentation or proof

We'll review your appeal and get back to you shortly.

Thank you for using PocketShield Insurance!`,
          Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
          ])
        );

        await ctx.reply(`❌ Claim rejected and notification sent to user ${userId}.`);
        console.log(`[${new Date().toISOString()}] ❌ Admin ${ctx.from.id} REJECTED claim for user ${userId} - Claim ID: ${savedClaim.claimId}`);

      } else {
        throw new Error('Failed to save rejected claim to backend');
      }
    } catch (apiError) {
      console.error(`[ERROR saving rejected claim to backend] ${apiError.message}`);
      console.error(`[Backend Error Details]`, {
        url: `${BACKEND_URL}/api/claim`,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        code: apiError.code,
        message: apiError.message
      });
      
      // Still mark as rejected locally even if backend fails
      claimData.status = 'rejected';
      claimData.rejectedAt = new Date().toLocaleString();
      claimData.rejectedBy = ctx.from.id;
      global.claimData[userId] = claimData;

      await ctx.editMessageText(`
❌ CLAIM REJECTED (LOCAL SAVE ONLY)

👤 User: ${claimData.fullName}
🆔 Trader ID: ${claimData.traderId}
💰 Coverage Amount: $${claimData.initialAmount * 0.4} (40%)

❌ STATUS: REJECTED (Local Memory)
🕒 Rejected: ${claimData.rejectedAt}
👑 Rejected By: Admin ${ctx.from.id}

⚠️ BACKEND ISSUE: Database save failed
🔧 Error: ${apiError.response?.status} ${apiError.response?.statusText || apiError.code}
📝 Details: ${apiError.response?.data?.message || apiError.message}

🚨 ACTION NEEDED: Check backend server is running at ${BACKEND_URL}`);

      // Still send rejection to user
      await ctx.telegram.sendMessage(
        userId,
        `
❌ YOUR CLAIM HAS BEEN REJECTED

Unfortunately, your insurance claim could not be approved at this time.

📊 Claim Details:
• Trader ID: ${claimData.traderId}
• Coverage Amount: $${claimData.initialAmount * 0.4} (40%)

📝 Reason for Rejection:
Claim verification failed during admin review.

🆘 WHAT TO DO NEXT:
Contact support @Pocketshieldsupport with your Trader ID for assistance.

Thank you for using PocketShield Insurance!`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
        ])
      );

      await ctx.reply(`⚠️ Claim rejected but backend save failed. User sent rejection message. Check server logs.`);
    }

  } catch (error) {
    console.error(`[ERROR in admin_reject_claim] ${error.message}`, error);
    await ctx.reply("❌ An error occurred while rejecting the claim.");
  }
});

// Launch bot with error handling
bot.launch().then(() => {
  console.log(`[${new Date().toISOString()}] ✅ Telegram Bot is now running and listening for updates`);
}).catch((err) => {
  console.error(`[CRITICAL ERROR] Failed to start bot:`, err);
  process.exit(1);
});

// Enable graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log(`[${new Date().toISOString()}] 🤖 Telegram Bot started successfully`);
