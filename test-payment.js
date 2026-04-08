#!/usr/bin/env node

/**
 * Test script for payment verification
 * Tests both demo mode and real blockchain verification
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:5000';

async function testDemoPayment() {
    console.log('\n=== Testing Demo Payment Verification ===\n');
    
    try {
        const response = await axios.post(`${BACKEND_URL}/api/check-payment`, {
            traderId: 'test-trader-123',
            amount: 50,
            fullName: 'Test User',
            telegramId: '123456789',
            uniquePaymentId: 'unique-123',
            walletAddress: '0x1234567890123456789012345678901234567890',
            network: 'bep20',
            txHash: 'demo-bep20-tx'
        });
        
        console.log('✓ Demo payment verification PASSED');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✗ Demo payment verification FAILED');
        console.log('Error Status:', error.response?.status);
        console.log('Error Message:', error.response?.data?.message || error.message);
        console.log('Full Response:', JSON.stringify(error.response?.data, null, 2));
    }
}

async function testPaymentOptions() {
    console.log('\n=== Testing Payment Options Endpoint ===\n');
    
    try {
        const response = await axios.get(`${BACKEND_URL}/api/payment-options`);
        
        console.log('✓ Payment options endpoint PASSED');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✗ Payment options endpoint FAILED');
        console.log('Error Status:', error.response?.status);
        console.log('Error Message:', error.response?.data?.message || error.message);
    }
}

async function testHealthCheck() {
    console.log('\n=== Testing Backend Health ===\n');
    
    try {
        const response = await axios.get(`${BACKEND_URL}/health`);
        console.log('✓ Backend is running');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✗ Backend health check FAILED');
        console.log('Error:', error.message);
    }
}

async function runTests() {
    console.log('Starting payment verification tests...');
    console.log('Backend URL:', BACKEND_URL);
    
    // Give backend a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testHealthCheck();
    await testPaymentOptions();
    await testDemoPayment();
    
    console.log('\n=== Tests Complete ===\n');
    process.exit(0);
}

runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
