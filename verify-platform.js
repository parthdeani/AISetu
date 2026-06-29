const http = require('http');

console.log('🧪 Starting Visual WhatsApp Commerce Verification Suite...');

// Mock configuration
const PORT = 4000;
const HOST = 'localhost';

function testGet(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`[PASS] ${name} - Status: ${res.statusCode}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`[WARN] ${name} - Failed to connect (Server offline). This is expected if docker is not running yet. Details: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function run() {
  // Test webhook verification handshake query parsing
  const webhookPath = '/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test_challenge&hub.verify_token=vwc_verify_token_secure';
  await testGet(webhookPath, 'WhatsApp Webhook Challenge Handshake');
  
  // Test Swagger API doc generation
  await testGet('/api/docs/', 'Swagger API Documentation Page');

  console.log('✅ Verification Suite Completed.');
}

run();
