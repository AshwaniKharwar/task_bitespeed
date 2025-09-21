const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function example() {
  console.log('🚀 Bitespeed Identity Reconciliation Examples\n');

  try {
    // Example from the requirements
    console.log('📧 Example: Creating the exact scenario from requirements');
    
    // First request - creates primary contact
    console.log('\n1. First purchase: lorraine@hillvalley.edu + 123456');
    const response1 = await axios.post(`${BASE_URL}/identify`, {
      email: 'lorraine@hillvalley.edu',
      phoneNumber: '123456'
    });
    console.log('Response:', JSON.stringify(response1.data, null, 2));

    // Second request - creates secondary contact
    console.log('\n2. Second purchase: mcfly@hillvalley.edu + 123456');
    const response2 = await axios.post(`${BASE_URL}/identify`, {
      email: 'mcfly@hillvalley.edu',
      phoneNumber: '123456'
    });
    console.log('Response:', JSON.stringify(response2.data, null, 2));

    // Test all the variations mentioned in requirements
    console.log('\n3. Test: Only phone number');
    const response3 = await axios.post(`${BASE_URL}/identify`, {
      phoneNumber: '123456'
    });
    console.log('Response:', JSON.stringify(response3.data, null, 2));

    console.log('\n4. Test: Only original email');
    const response4 = await axios.post(`${BASE_URL}/identify`, {
      email: 'lorraine@hillvalley.edu'
    });
    console.log('Response:', JSON.stringify(response4.data, null, 2));

    console.log('\n5. Test: Only secondary email');
    const response5 = await axios.post(`${BASE_URL}/identify`, {
      email: 'mcfly@hillvalley.edu'
    });
    console.log('Response:', JSON.stringify(response5.data, null, 2));

    console.log('\n✅ All examples completed! Notice how all requests return the same consolidated contact.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Check server health first
async function checkHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server health:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Server not running. Please start with: npm run dev');
    return false;
  }
}

async function main() {
  const healthy = await checkHealth();
  if (healthy) {
    await example();
  }
}

main();
