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
 * Store for user data (in production, use a database)
 */
global.registeredUsers = global.registeredUsers || {};
global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
global.pendingRegistrations = global.pendingRegistrations || {};

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
      const welcomeMessage = `
🛡️ Welcome to PocketShield Insurance

We provide secure coverage for your trading funds.

✨ Why Choose Us?
• Transparent & decentralized claims
• 10% flat insurance fee
• 24/7 customer support

Get insured in minutes today!
      `.trim();

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
        `For inquiries, contact @Pocketshield0`
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
• Coverage: 40% of initial deposit

📅 Coverage Period:
• Activated: ${activationDate}
• Valid Until: ${validUntilDate}
• Duration: 3 months

📋 Coverage Terms:
✓ Covers total account loss only
✓ Before any withdrawals
✓ Account must be verified via Pocket Option
✓ Created using referral link

❌ NOT Covered:
✗ Partial losses
✗ After any withdrawal
✗ Unverified accounts
✗ Manual trading losses

Need help? Contact support@pocketshield.com`;

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
✓ 40% coverage on total account loss
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
✓ 40% coverage on total account loss
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

    // Fetch user data to get trader ID
    try {
      const response = await axios.get(`${BACKEND_URL}/api/user-by-telegram/${ctx.from.id}`);
      
      if (response.data && response.data.success) {
        const userData = response.data.data;
        
        // Store claim request as pending
        global.pendingClaims = global.pendingClaims || {};
        global.pendingClaims[ctx.from.id] = {
          userId: ctx.from.id,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name || '',
          traderId: userData.traderId,
          fullName: userData.fullName,
          insuranceFee: userData.insuranceFee,
          submittedAt: new Date().toLocaleString(),
          status: 'pending_admin_approval'
        };

        // Send user confirmation
        const claimMessage = `
🔍 CLAIM VERIFICATION IN PROGRESS

Your insurance claim is being reviewed by our admin team.

📋 Your Details:
• Name: ${userData.fullName}
• Trader ID: ${userData.traderId}
• Insurance Premium: $${userData.insuranceFee}

⏳ Status: Pending Admin Review

You will receive a notification once the admin reviews your claim.
This typically takes 5-10 minutes.

Thank you for your patience!`;

        await ctx.reply(claimMessage);

        // === SEND ADMIN NOTIFICATION ===
        const adminClaimNotification = `
🔔 NEW INSURANCE CLAIM REQUEST

👤 User Information:
• Name: ${userData.fullName}
• Telegram ID: ${ctx.from.id}
• Username: @${ctx.from.username || 'N/A'}
• Trader ID: ${userData.traderId}

💰 Insurance Details:
• Premium Paid: $${userData.insuranceFee}
• Payment Status: ${userData.paymentStatus || 'Verified'}

📅 Claim Time: ${new Date().toLocaleString()}

⚠️ ACTION REQUIRED:
Please verify that this user's account meets ALL policy conditions before approving:

✓ Account MUST be verified on Pocket Option
✓ Account MUST be created through referral link
✓ Account must NOT have any withdrawals before loss
✓ NO suspicious trading activities
✓ Claim must be for TOTAL account loss only

👉 Click below to Approve or Deny this claim:`;

        await ctx.telegram.sendMessage(
          ADMIN_ID,
          adminClaimNotification,
          Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ APPROVE CLAIM", `approve_claim_${ctx.from.id}`),
              Markup.button.callback("❌ DENY CLAIM", `deny_claim_${ctx.from.id}`)
            ]
          ])
        );

        console.log(`[${new Date().toISOString()}] New claim pending approval: User ${ctx.from.id} (${userData.traderId})`);

      } else {
        // User not found
        await ctx.reply("❌ Your insurance details could not be found. Please contact support.");
        console.log(`[${new Date().toISOString()}] Claim initiated by uninsured user ${ctx.from.id}`);
      }
    } catch (error) {
      console.error(`[Error fetching user for claim] ${error.message}`);
      await ctx.reply("❌ An error occurred while processing your claim. Please try again.");
    }

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

    const welcomeMessage = `
🛡️ Welcome to PocketShield Insurance

We provide secure coverage for your trading funds.

✨ Why Choose Us?
• Transparent & decentralized claims
• 10% flat insurance fee
• 24/7 customer support

Get insured in minutes today!
    `.trim();

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
              return `${idx + 1}. ${user.fullName}\n   💰 Premium: $${premiumText}\n   ID: ${user.traderId}`;
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

    global.claimData = global.claimData || {};
    const claimsArray = Object.entries(global.claimData);

    let claimsList = '';
    if (claimsArray.length > 0) {
      claimsList = claimsArray
        .map(([userId, data], idx) => 
          `#${idx + 1}
📌 User ID: ${userId}
🆔 Trader ID: ${data.traderId}
💰 Payment Address: ${data.paymentAddress}
⏰ Submitted: ${data.submittedAt}
📊 Status: ⏳ PENDING REVIEW`)
        .join('\n\n' + '─'.repeat(40) + '\n\n');
    } else {
      claimsList = '✅ No pending claims at the moment.';
    }

    const message = `
📋 PENDING INSURANCE CLAIMS

${claimsList}

Total Pending: ${claimsArray.length}`;

    await ctx.reply(message);
    console.log(`[${new Date().toISOString()}] Admin ${ctx.from.id} viewed pending claims - Total: ${claimsArray.length}`);
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
        [Markup.button.callback("�💬 Send Announcement", "admin_announce")]
      ])
    );
  } catch (error) {
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
✅ https://u3.shortink.io/register?utm_campaign=834817&utm_source=affiliate&utm_medium=sr&a=POY4xB1cswM8K7&al=1745844&ac=insurance&cid=949805&code=Tanishq

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
        // Store this as a pending registration
        global.pendingRegistrations[ctx.from.id] = {
          traderId: traderId,
          telegramId: ctx.from.id,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name || '',
          username: ctx.from.username || 'N/A',
          submittedAt: new Date().toLocaleString(),
          status: 'pending'
        };

        // Remove from awaiting list
        delete global.usersAwaitingTraderId[ctx.from.id];

        // Send confirmation message to user
        const confirmMsg = `
✅ Trader ID Received!

Your Trader ID: ${traderId}
Status: ⏳ Waiting for admin verification...

You will receive a notification once admin approves your registration.
Thank you for your patience!`;

        await ctx.reply(confirmMsg);

        // === SEND ADMIN NOTIFICATION ===
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
          // Verify user exists in MongoDB with this trader ID and telegram ID
          const verifyResponse = await axios.get(`${BACKEND_URL}/api/user-status/${traderIdClaim}`);
          
          if (verifyResponse.data && verifyResponse.data.success) {
            const userData = verifyResponse.data.data;
            
            // Check if telegram ID matches
            if (userData.telegramId === ctx.from.id) {
              // User verified! Proceed with claim
              global.claimData = global.claimData || {};
              global.claimData[ctx.from.id] = {
                traderId: traderIdClaim,
                submittedAt: new Date().toLocaleString(),
                verifiedUser: userData
              };

              delete global.usersAwaitingClaimTrader[ctx.from.id];
              global.usersAwaitingClaimPayment[ctx.from.id] = true;

              const paymentAddressMessage = `
✅ Trader ID Verified: ${traderIdClaim}

📋 Account Details:
• Full Name: ${userData.fullName}
• Insurance Fee Paid: $${userData.insuranceFee}
• Payment Status: ${userData.paymentStatus}

Step 2️⃣: Now send your USDT Payment Address (where we'll send the refund) 👇`;

              await ctx.reply(paymentAddressMessage);
              console.log(`[${new Date().toISOString()}] User ${ctx.from.id} verified for claim with Trader ID: ${traderIdClaim}`);
            } else {
              // Telegram ID doesn't match
              delete global.usersAwaitingClaimTrader[ctx.from.id];
              
              const notInsuredMessage = `
❌ You are not insured!

The Trader ID you provided doesn't match your records. Please make sure you use the correct Trader ID that was used during insurance signup.

Thank you!`;

              await ctx.reply(
                notInsuredMessage,
                Markup.inlineKeyboard([
                  [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
                ])
              );
              console.log(`[${new Date().toISOString()}] User ${ctx.from.id} claim verification failed - Telegram ID mismatch`);
            }
          } else {
            // Trader ID not found in database
            delete global.usersAwaitingClaimTrader[ctx.from.id];
            
            const notFoundMessage = `
❌ You are not insured!

No insurance record found with Trader ID: ${traderIdClaim}

This could mean:
• You haven't set up insurance yet
• The Trader ID is incorrect
• Your insurance has expired

Thank you!`;

            await ctx.reply(
              notFoundMessage,
              Markup.inlineKeyboard([
                [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
              ])
            );
            console.log(`[${new Date().toISOString()}] User ${ctx.from.id} claim failed - Trader ID not found: ${traderIdClaim}`);
          }
        } catch (error) {
          console.error(`[Error verifying trader ID] ${error.message}`);
          delete global.usersAwaitingClaimTrader[ctx.from.id];
          
          const errorMessage = `
❌ An error occurred during verification.

Please try again or contact support.`;

          await ctx.reply(
            errorMessage,
            Markup.inlineKeyboard([
              [Markup.button.callback("🔙 Go Back to Main Menu", "insured_go_back")]
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
        }

        delete global.usersAwaitingClaimPayment[ctx.from.id];

        const claimData = global.claimData[ctx.from.id];
        const verifiedUser = claimData.verifiedUser;

        // Send notification to user
        const verificationMessage = `
✅ Claim Details Received

📋 Summary:
• Name: ${verifiedUser?.fullName}
• Trader ID: ${claimData.traderId}
• Payment Address: ${paymentAddress}
• Submitted: ${claimData.submittedAt}

⏳ VERIFICATION IN PROGRESS

Your claim is now under review. You will receive insurance cover after verification that you haven't violated any of the policy rules:

✓ Coverage applies only to total account loss
✓ Account must be verified via Pocket Option
✓ Account created through referral link
✓ No withdrawals before loss
✓ No suspicious/prohibited activities

📌 Expected Timeline: 24-48 hours

We'll notify you as soon as your claim is verified!

Status: 🔄 PENDING REVIEW`;

        await ctx.reply(verificationMessage);

        // Send claim details to admin for processing
        const adminNotification = `
📬 NEW CLAIM SUBMITTED

Claim #${claimData.submittedAt.replace(/[\/\s:]/g, '')}

👤 User Information:
• Name: ${verifiedUser?.fullName}
• Telegram ID: ${ctx.from.id}
• Trader ID: ${claimData.traderId}

💰 Insurance Details:
• Premium Paid: $${verifiedUser?.insuranceFee || 'N/A'}
• Payment Status: ${verifiedUser?.paymentStatus || 'N/A'}

🔄 Claim Information:
• Refund Address: ${paymentAddress}
• Submitted At: ${claimData.submittedAt}
• Status: ⏳ PENDING REVIEW

👉 ACTION REQUIRED: Review claim and verify compliance with policy rules before approving.

Available in Admin Panel: 📋 Pending Claims`;

        // Send to admin (assuming admin ID)
        try {
          await ctx.telegram.sendMessage(ADMIN_ID, adminNotification);
          console.log(`[${new Date().toISOString()}] ✅ Claim notification sent to admin`);
        } catch (error) {
          console.error(`[Error sending to admin] ${error.message}`);
        }

        console.log(`[${new Date().toISOString()}] User ${ctx.from.id} submitted verified claim with payment address: ${paymentAddress}`);
      }
      return;
    }

    // Check if user is awaiting trader ID for new insurance
    global.usersAwaitingTraderId = global.usersAwaitingTraderId || {};
    
    if (global.usersAwaitingTraderId[ctx.from.id]) {
      const traderId = ctx.message.text?.trim();
      
      if (traderId && traderId.length > 0 && !traderId.startsWith('/')) {
        // User sent their trader ID - verify with affiliate bot first
        delete global.usersAwaitingTraderId[ctx.from.id];

        console.log(`[${new Date().toISOString()}] 🔍 Verifying Trader ID ${traderId} with @AffiliatePocketBot`);
        await ctx.reply("🔍 Verifying your trader ID with @AffiliatePocketBot...");

        try {
          // Verify with affiliate bot
          const affiliateVerification = await affiliateBotService.verifyTraderWithAffiliate(traderId);

          if (affiliateVerification && affiliateVerification.registered) {
            console.log(`[${new Date().toISOString()}] ✅ Trader ${traderId} verified through affiliate bot`);

            // Store user data in memory
            global.registeredUsers = global.registeredUsers || {};
            global.registeredUsers[ctx.from.id] = {
              traderId: traderId,
              firstName: ctx.from.first_name,
              lastName: ctx.from.last_name || '',
              registeredAt: new Date().toLocaleString(),
              affiliateData: affiliateVerification
            };

            // Save to MongoDB via backend API
            await saveUserToDatabase(ctx.from.id, traderId, ctx.from.first_name, ctx.from.last_name);

            // Show terms & conditions
            const termsMessage = `
✅ Great! You are registered through our affiliate link!

📋 Your Account Details:
🆔 Trader ID: ${traderId}
📅 Registration: ${affiliateVerification.regDate || 'N/A'}
🌍 Country: ${affiliateVerification.country || 'N/A'}
✔️ Verified: ${affiliateVerification.verified ? 'Yes ✅' : 'No ❌'}
💰 Balance: ${affiliateVerification.balance || 'N/A'}
💸 FTD: ${affiliateVerification.ftdAmount || 'N/A'}

📋 TERMS & CONDITIONS

Insurance Coverage Terms:
✓ Coverage applies to total account loss only
✓ Account must be verified via Pocket Option
✓ Account created through our referral link
✓ No withdrawals before loss event
✓ No suspicious or prohibited trading activities
✓ Premium: 10% of deposit amount
✓ Coverage period: 3 months from activation

⚠️ NOT Covered:
✗ Partial account losses
✗ After any withdrawal is made
✗ Unverified accounts
✗ Manual trading losses
✗ Accounts not created through our link

By proceeding, you agree to these terms.`;

            // Check if MINI_APP_URL is properly set with HTTPS
            const isValidHttpsUrl = MINI_APP_URL && MINI_APP_URL.startsWith('https://');

            if (isValidHttpsUrl) {
              await ctx.reply(
                termsMessage,
                Markup.inlineKeyboard([
                  [Markup.button.webApp(
                    "🛡️ Open Insurance App",
                    `${MINI_APP_URL}?telegram_user_id=${ctx.from.id}&trader_id=${encodeURIComponent(traderId)}`
                  )],
                  [Markup.button.callback("🔙 Main Menu", "insured_go_back")]
                ])
              );
            } else {
              const fallbackMessage = `${termsMessage}

⚠️ Setup Required:
The mini app is currently being configured. Please contact support to proceed with your insurance.`;
              
              await ctx.reply(fallbackMessage);
              console.warn(`[WARNING] MINI_APP_URL not configured. User ${ctx.from.id} cannot access mini app.`);
            }

            console.log(`[${new Date().toISOString()}] ✅ User ${ctx.from.id} verified with Trader ID ${traderId}`);
          } else {
            // User NOT found in affiliate system
            const notFoundMessage = `
❌ Sorry! You haven't created your account through our affiliate link!

Trader ID: ${traderId}

This Trader ID was not registered using our special affiliate link.

To get insured, please:
1️⃣ Create a new account via: learnwithtanishq.com/pocketoption
2️⃣ Verify your account on Pocket Option
3️⃣ Deposit minimum \$100
4️⃣ Send back your new Trader ID

⚠️ Important Points:
• VPN must be OFF
• Use web version (better experience)
• Use a new email address
• Use same documents for verification
• Apply promo code: TANISHQ

🍾 You can use bonus funds for deposits, but we count only your real deposit for insurance.

After creating account through our link, send your new Trader ID here!`;

            await ctx.reply(
              notFoundMessage,
              Markup.inlineKeyboard([
                [Markup.button.callback("🔙 Main Menu", "insured_go_back")]
              ])
            );

            console.log(`[${new Date().toISOString()}] ❌ User ${ctx.from.id} Trader ID ${traderId} NOT found in affiliate system`);
          }
        } catch (error) {
          console.error(`[ERROR verifying trader with affiliate bot] ${error.message}`);

          const errorMessage = `
❌ Error during verification!

We encountered an issue while verifying your Trader ID with @AffiliatePocketBot.

This could be because:
• Temporary bot connectivity issue
• Invalid Trader ID format
• Bot service temporarily unavailable

Please try again in a moment.`;

          await ctx.reply(
            errorMessage,
            Markup.inlineKeyboard([
              [Markup.button.callback("🔙 Main Menu", "insured_go_back")]
            ])
          );
        }
      }
    } else {
      // Check if message is a trader ID number (for quick registration check)
      const messageText = ctx.message.text?.trim();
      if (messageText && /^\d+$/.test(messageText) && !messageText.startsWith('/')) {
        const traderId = messageText;

        console.log(`[${new Date().toISOString()}] 🔍 Quick check - Verifying Trader ID ${traderId} with @AffiliatePocketBot`);
        await ctx.reply("🔍 Verifying your trader ID with @AffiliatePocketBot...");
        
        try {
          // Verify with affiliate bot
          const affiliateVerification = await affiliateBotService.verifyTraderWithAffiliate(traderId);

          if (affiliateVerification && affiliateVerification.registered) {
            console.log(`[${new Date().toISOString()}] ✅ Trader ${traderId} verified through affiliate bot`);

            // Show terms & conditions with mini app button
            const termsMessage = `
✅ Great! You are registered through our affiliate link!

📋 Your Account Details:
🆔 Trader ID: ${traderId}
📅 Registration: ${affiliateVerification.regDate || 'N/A'}
🌍 Country: ${affiliateVerification.country || 'N/A'}
✔️ Verified: ${affiliateVerification.verified ? 'Yes ✅' : 'No ❌'}
💰 Balance: ${affiliateVerification.balance || 'N/A'}
💸 FTD: ${affiliateVerification.ftdAmount || 'N/A'}

📋 TERMS & CONDITIONS

Insurance Coverage Terms:
✓ Coverage applies to total account loss only
✓ Account must be verified via Pocket Option
✓ Account created through our referral link
✓ No withdrawals before loss event
✓ No suspicious or prohibited trading activities
✓ Premium: 10% of deposit amount
✓ Coverage period: 3 months from activation

⚠️ NOT Covered:
✗ Partial account losses
✗ After any withdrawal is made
✗ Unverified accounts
✗ Manual trading losses
✗ Accounts not created through our link

By proceeding, you agree to these terms.`;

            // Check if MINI_APP_URL is properly set with HTTPS
            const isValidHttpsUrl = MINI_APP_URL && MINI_APP_URL.startsWith('https://');

            if (isValidHttpsUrl) {
              await ctx.reply(
                termsMessage,
                Markup.inlineKeyboard([
                  [Markup.button.webApp(
                    "🛡️ Open Insurance App",
                    `${MINI_APP_URL}?telegram_user_id=${ctx.from.id}&trader_id=${encodeURIComponent(traderId)}`
                  )],
                  [Markup.button.callback("🔙 Main Menu", "insured_go_back")]
                ])
              );
            } else {
              const fallbackMessage = `${termsMessage}

⚠️ Setup Required:
The mini app is currently being configured. Please contact support to proceed with your insurance.`;
              
              await ctx.reply(fallbackMessage);
              console.warn(`[WARNING] MINI_APP_URL not configured. User ${ctx.from.id} cannot access mini app.`);
            }

            console.log(`[${new Date().toISOString()}] ✅ User ${ctx.from.id} verified - Trader ID ${traderId}`);
          } else {
            // User NOT found in affiliate system
            const notFoundMessage = `
❌ Sorry! You haven't created your account through our affiliate link!

Trader ID: ${traderId}

This Trader ID was not registered using our special affiliate link.

To get insured, please:
1️⃣ Create a new account via: learnwithtanishq.com/pocketoption
2️⃣ Verify your account on Pocket Option
3️⃣ Deposit minimum \$100
4️⃣ Send back your new Trader ID

⚠️ Important Points:
• VPN must be OFF
• Use web version (better experience)
• Use a new email address
• Use same documents for verification
• Apply promo code: TANISHQ

🍾 You can use bonus funds for deposits, but we count only your real deposit for insurance.

After creating account through our link, send your new Trader ID here!`;

            await ctx.reply(
              notFoundMessage,
              Markup.inlineKeyboard([
                [Markup.button.callback("🏠 Main Menu", "insured_go_back")]
              ])
            );

            console.log(`[${new Date().toISOString()}] ❌ User ${ctx.from.id} checked Trader ID ${traderId} - NOT registered through affiliate link`);
          }
        } catch (error) {
          console.error(`[Error checking trader ID with affiliate bot] ${error.message}`);
          
          const errorMessage = `
❌ Error during verification!

We encountered an issue while verifying your Trader ID with @AffiliatePocketBot.

This could be because:
• Temporary bot connectivity issue
• Invalid Trader ID format
• Bot service temporarily unavailable

Please try again in a moment.`;

          await ctx.reply(
            errorMessage,
            Markup.inlineKeyboard([
              [Markup.button.callback("🏠 Main Menu", "insured_go_back")]
            ])
          );
        }
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
❌ REGISTRATION NOT APPROVED

Sorry, your account registration could not be verified at this time.

📋 Your Information:
• Trader ID: ${userData.traderId}
• Status: ❌ NOT VERIFIED

⚠️ Possible Reasons:
• Account not created through our affiliate link
• Missing required documentation
• Account verification incomplete
• Policy violation detected

📝 Please Note:
Your account must meet ALL requirements:
✓ Created via our link: learnwithtanishq.com/pocketoption
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

💬 Need help? Contact our support team!`;

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
