/**
 * Backend Diagnostic Script
 * Tests connection from bot to backend server
 */

require('dotenv').config();
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_DB = process.env.POSTGRES_DB || 'insurance_db';

console.log('\n========================================');
console.log('🔧 BACKEND CONNECTION DIAGNOSTIC');
console.log('========================================\n');

console.log('📋 Configuration:');
console.log(`  Backend URL: ${BACKEND_URL}`);
console.log(`  PostgreSQL Host: ${POSTGRES_HOST}`);
console.log(`  Database: ${POSTGRES_DB}\n`);

async function testHealthCheck() {
  console.log('🏥 Testing Health Check...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
    console.log('✅ Health check passed');
    console.log(`   Response:`, response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    return false;
  }
}

async function testClaimEndpoint() {
  console.log('\n📝 Testing Claim Endpoint...');
  try {
    const payload = {
      traderId: '123456789',
      amount: 100,
      description: 'Test claim',
      telegramId: 1234567890
    };
    
    console.log(`   Sending POST to ${BACKEND_URL}/api/claim`);
    console.log(`   Payload:`, payload);
    
    const response = await axios.post(`${BACKEND_URL}/api/claim`, payload, { 
      timeout: 10000,
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Claim endpoint working');
      return true;
    } else if (response.status === 404) {
      console.error('❌ Claim endpoint not found (404)');
      console.error('   The backend may not have the /api/claim route registered');
      return false;
    } else if (response.status === 500) {
      console.error('❌ Backend server error (500)');
      console.error(`   Message: ${response.data?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Claim endpoint test failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    return false;
  }
}

async function testClaimsList() {
  console.log('\n📊 Testing Claims List Endpoint...');
  try {
    console.log(`   Sending GET to ${BACKEND_URL}/api/claims`);
    
    const response = await axios.get(`${BACKEND_URL}/api/claims?limit=5`, { 
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Claims list working');
      return true;
    } else {
      console.error(`❌ Claims endpoint returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Claims list test failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    return false;
  }
}

async function testUsersList() {
  console.log('\n👥 Testing Users List Endpoint...');
  try {
    console.log(`   Sending GET to ${BACKEND_URL}/api/users-list`);
    
    const response = await axios.get(`${BACKEND_URL}/api/users-list`, { 
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    if (response.status === 200) {
      console.log('✅ Users list working');
      return true;
    } else {
      console.error(`❌ Users endpoint returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Users list test failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    return false;
  }
}

async function testCreateUser() {
  console.log('\n➕ Testing Create User Endpoint...');
  try {
    const payload = {
      fullName: 'Test User',
      traderId: 'TEST123' + Date.now(),
      telegramId: 1234567890,
      initialAmount: 100,
      insuranceFee: 10
    };
    
    console.log(`   Sending POST to ${BACKEND_URL}/api/create-user`);
    console.log(`   Payload:`, payload);
    
    const response = await axios.post(`${BACKEND_URL}/api/create-user`, payload, { 
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response:`, response.data);
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Create user endpoint working');
      return true;
    } else {
      console.error(`❌ Create user endpoint returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Create user test failed');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('\n🚀 Starting diagnostics...\n');
  
  const results = {};
  
  results.health = await testHealthCheck();
  results.claim = await testClaimEndpoint();
  results.claimsList = await testClaimsList();
  results.usersList = await testUsersList();
  results.createUser = await testCreateUser();
  
  console.log('\n========================================');
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('========================================\n');
  
  console.log('Results:');
  console.log(`  ✅ Health Check: ${results.health ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Create User: ${results.createUser ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Claim Submission: ${results.claim ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Claims List: ${results.claimsList ? 'PASS' : 'FAIL'}`);
  console.log(`  ✅ Users List: ${results.usersList ? 'PASS' : 'FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.values(results).length;
  
  console.log(`\n📈 Overall: ${passCount}/${totalCount} tests passed\n`);
  
  if (passCount === totalCount) {
    console.log('🎉 All systems operational!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
    console.log('TROUBLESHOOTING:');
    console.log('  1. Ensure backend server is running: npm start');
    console.log('  2. Verify BACKEND_URL in .env matches your server');
    console.log('  3. Check if PostgreSQL database is accessible');
    console.log('  4. Review backend server logs for errors\n');
    process.exit(1);
  }
}

runDiagnostics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
