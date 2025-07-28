/**
 * Test script to verify streaming ASR connectivity
 * Run with: node test-streaming.js
 */

const { io } = require('socket.io-client');

// Test endpoints
const endpoints = [
  'http://localhost:8000/socket.io',
  'http://localhost:8000/socket_asr.io',
  'http://13.203.149.17:8000/socket.io',
  'http://13.203.149.17:8000/socket_asr.io'
];

function detectStreamerType(endpoint) {
  return endpoint.includes('/socket_asr.io') ? 'legacy' : 'modern';
}

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing endpoint: ${endpoint}`);
    const streamerType = detectStreamerType(endpoint);
    console.log(`   Streamer type: ${streamerType}`);
    
    const socketConfig = {
      timeout: 5000,
      transports: ['websocket', 'polling']
    };

    // Add auth for modern streamer
    if (streamerType === 'modern') {
      socketConfig.auth = {
        apiKey: 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09',
        serviceId: 'ai4bharat/indictasr',
        language: 'hi',
        samplingRate: '16000',
        audioFormat: 'wav',
        encoding: 'base64'
      };
    } else {
      socketConfig.query = {
        serviceId: 'ai4bharat/indictasr',
        language: 'hi',
        samplingRate: '16000',
        apiKey: 'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09',
        audioFormat: 'wav',
        encoding: 'base64'
      };
    }

    const socket = io(endpoint, socketConfig);
    
    const timeout = setTimeout(() => {
      console.log(`   ❌ Timeout after 5 seconds`);
      socket.disconnect();
      resolve({ endpoint, success: false, error: 'Timeout' });
    }, 5000);

    socket.on('connect', () => {
      console.log(`   ✅ Connected successfully!`);
      console.log(`   📡 Socket ID: ${socket.id}`);
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ endpoint, success: true, streamerType });
    });

    socket.on('connect_error', (error) => {
      console.log(`   ❌ Connection error: ${error.message || error}`);
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ endpoint, success: false, error: error.message || error.toString() });
    });

    socket.on('abort', (data) => {
      console.log(`   ❌ Authentication failed: ${data}`);
      clearTimeout(timeout);
      socket.disconnect();
      resolve({ endpoint, success: false, error: `Auth failed: ${data}` });
    });

    socket.on('ready', () => {
      console.log(`   🎯 Server ready for streaming (modern)`);
    });

    socket.on('connect-success', () => {
      console.log(`   🎯 Stream connection successful (legacy)`);
    });
  });
}

async function runTests() {
  console.log('🚀 Starting Streaming ASR Connectivity Tests\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Working endpoints: ${working.length}/${results.length}`);
  working.forEach(r => {
    console.log(`   • ${r.endpoint} (${r.streamerType})`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed endpoints: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   • ${r.endpoint} - ${r.error}`);
    });
  }
  
  if (working.length > 0) {
    console.log('\n🎉 Streaming ASR connectivity is working!');
    console.log('   You can now test the streaming functionality in the web app.');
  } else {
    console.log('\n⚠️  No working endpoints found.');
    console.log('   Please check if the Dhruva Platform server is running.');
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the tests
runTests().catch(console.error);
