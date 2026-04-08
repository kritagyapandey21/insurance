
const axios = require("axios");

async function testPaymentVerification() {
    console.log("🚀 Testing Real Payment Verification");
    console.log("====================================\n");
    
    const testData = {
        traderId: "kritagya-final-verified",
        amount: 11,
        fullName: "Kritagya Pandey",
        network: "bep20",
        txHash: "0xf696e1f154fa33598f26d95ceb3a019cb9a718bb156af27a67fabc9588735d79"
    };
    
    console.log("Sending request with:");
    console.log(JSON.stringify(testData, null, 2));
    console.log("\n");
    
    try {
        const response = await axios.post(
            "http://localhost:5000/api/check-payment",
            testData,
            {
                timeout: 60000,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
        
        console.log("✅ SUCCESS!");
        console.log("\nResponse Status:", response.status);
        console.log("\nResponse Data:");
        console.log(JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.log("❌ Error Response:");
            console.log("Status:", error.response.status);
            console.log("Data:", JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log("❌ No response from server");
            console.log("Request:", error.request);
        } else {
            console.log("❌ Error:", error.message);
        }
    }
}

testPaymentVerification();
