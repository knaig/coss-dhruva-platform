/**
 * Test script to verify the @project-sunbird/open-speech-streaming-client package
 * Run with: node test-streaming-client.js
 */

const { StreamingClient, SocketStatus } = require('@project-sunbird/open-speech-streaming-client');

console.log('🧪 Testing @project-sunbird/open-speech-streaming-client package');
console.log('=' .repeat(60));

// Test package import
try {
  console.log('✅ Package imported successfully');
  console.log('   StreamingClient:', typeof StreamingClient);
  console.log('   SocketStatus:', typeof SocketStatus);
  
  if (SocketStatus) {
    console.log('   SocketStatus values:', SocketStatus);
  }
} catch (error) {
  console.log('❌ Package import failed:', error.message);
  process.exit(1);
}

// Test StreamingClient instantiation
try {
  const client = new StreamingClient();
  console.log('✅ StreamingClient instantiated successfully');
  console.log('   Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
} catch (error) {
  console.log('❌ StreamingClient instantiation failed:', error.message);
  process.exit(1);
}

// Test connection (with timeout)
console.log('\n🔗 Testing connection to streaming endpoints...');

const testEndpoints = [
  'wss://api.dhruva.ai4bharat.org',
  'wss://13.203.149.17',
  'ws://localhost:8000',
  'ws://13.203.149.17:8000'
];

async function testConnection(endpoint) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing: ${endpoint}`);
    
    const client = new StreamingClient();
    const timeout = setTimeout(() => {
      console.log('   ⏰ Timeout after 10 seconds');
      resolve({ endpoint, success: false, error: 'Timeout' });
    }, 10000);
    
    try {
      client.connect(
        endpoint,
        'ai4bharat/indictasr',
        'Xhf5jWXfkam42bKqEk5PgIusSDsgamh4y0gRL7zs1xUINKQbyI7LX0L02mpMtv09',
        'hi',
        16000,
        [],
        (action, id) => {
          clearTimeout(timeout);
          console.log(`   📡 Action: ${action.toString()}, ID: ${id}`);

          if (action === SocketStatus.CONNECTED || action === 'connected') {
            console.log('   ✅ Connection successful!');
            client.disconnect();
            resolve({ endpoint, success: true });
          } else if (action === SocketStatus.ERROR || action === 'error') {
            console.log(`   ❌ Connection error: ${id}`);
            resolve({ endpoint, success: false, error: id });
          } else if (action === SocketStatus.TERMINATED || action === 'terminated') {
            console.log('   ⚠️  Connection terminated');
            resolve({ endpoint, success: false, error: 'Terminated' });
          } else {
            console.log(`   ℹ️  Other action: ${action.toString()}`);
            // Continue waiting for connection or error
          }
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      console.log(`   ❌ Connection attempt failed: ${error.message}`);
      resolve({ endpoint, success: false, error: error.message });
    }
  });
}

async function runConnectionTests() {
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testConnection(endpoint);
    results.push(result);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 CONNECTION TEST RESULTS');
  console.log('=' .repeat(60));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Working endpoints: ${working.length}/${results.length}`);
  working.forEach(r => {
    console.log(`   • ${r.endpoint}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed endpoints: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   • ${r.endpoint} - ${r.error}`);
    });
  }
  
  if (working.length > 0) {
    console.log('\n🎉 StreamingClient package is working!');
    console.log('   The streaming ASR functionality should now work in the web app.');
  } else {
    console.log('\n⚠️  No working endpoints found.');
    console.log('   This could be due to network issues or server availability.');
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the tests
runConnectionTests().catch(console.error);
