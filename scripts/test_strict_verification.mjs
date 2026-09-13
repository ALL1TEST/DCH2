import http from 'http';
import crypto from 'crypto';
import { verifyConnection } from '../src/lib/connection/verifier.ts';

const EXPECTED_SECRET = 'cms_live_e9b32c66847aa00192df482b834419ad20eef9278918231c6a72b83910293847';

async function run() {
  console.log('=== STARTING STRICT VERIFICATION SUITE ===\n');

  // 1. Setup a Mock External Site (mimicking Verdant / Standard CMS)
  const port = 3899;
  let receivedRequests = [];

  const server = http.createServer((req, res) => {
    const authHeader = req.headers['authorization'] || '';
    receivedRequests.push({
      url: req.url,
      method: req.method,
      auth: authHeader,
    });

    if (req.url === '/api/cms/health' || req.url === '/cms/health') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      const token = match ? match[1].trim() : '';

      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected: false, error: 'Missing Bearer token' }));
        return;
      }

      // Exact constant-time check
      const expectedBuf = Buffer.from(EXPECTED_SECRET, 'utf-8');
      const tokenBuf = Buffer.from(token, 'utf-8');
      const matches = expectedBuf.length === tokenBuf.length && crypto.timingSafeEqual(expectedBuf, tokenBuf);

      if (!matches) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ connected: false, error: 'Invalid connection token' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: true,
        site: 'Verdant Live Site',
        platform: 'standard-cms',
        version: '1.0.0',
      }));
      return;
    }

    // A generic /api endpoint that returns 200 {"message": "Hello, world!"} like vertest-ten.vercel.app/api did
    if (req.url === '/api') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Hello, world!' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Mock external site listening on http://localhost:${port}\n`);

  try {
    // TEST 1: Missing Token
    console.log('TEST 1: Missing token');
    const resMissing = await verifyConnection({
      platform: 'standard',
      siteUrl: `http://localhost:${port}`,
      apiBaseUrl: `http://localhost:${port}/api`,
      apiKey: '',
    });
    console.log('Result:', resMissing.status, resMissing.message);
    if (resMissing.ok !== false || resMissing.status !== 'INVALID_CREDENTIALS') {
      throw new Error(`TEST 1 FAILED: Expected INVALID_CREDENTIALS, got ${resMissing.status}`);
    }
    console.log('✓ TEST 1 PASSED: Missing token rejected as INVALID_CREDENTIALS\n');

    // TEST 2: Completely random token
    console.log('TEST 2: Completely random token');
    const resRandom = await verifyConnection({
      platform: 'standard',
      siteUrl: `http://localhost:${port}`,
      apiBaseUrl: `http://localhost:${port}/api`,
      apiKey: 'cms_live_completely_random_fake_token_1234567890',
    });
    console.log('Result:', resRandom.status, resRandom.message);
    if (resRandom.ok !== false || resRandom.status !== 'INVALID_CREDENTIALS') {
      throw new Error(`TEST 2 FAILED: Expected INVALID_CREDENTIALS, got ${resRandom.status}`);
    }
    console.log('✓ TEST 2 PASSED: Random token rejected as INVALID_CREDENTIALS\n');

    // TEST 3: One-character-modified token
    console.log('TEST 3: One-character-modified token');
    // Change last char of EXPECTED_SECRET from '7' to '8'
    const modifiedToken = EXPECTED_SECRET.slice(0, -1) + (EXPECTED_SECRET.slice(-1) === '7' ? '8' : '7');
    const resModified = await verifyConnection({
      platform: 'standard',
      siteUrl: `http://localhost:${port}`,
      apiBaseUrl: `http://localhost:${port}/api`,
      apiKey: modifiedToken,
    });
    console.log('Result:', resModified.status, resModified.message);
    if (resModified.ok !== false || resModified.status !== 'INVALID_CREDENTIALS') {
      throw new Error(`TEST 3 FAILED: Expected INVALID_CREDENTIALS, got ${resModified.status}`);
    }
    console.log('✓ TEST 3 PASSED: One-character-modified token rejected as INVALID_CREDENTIALS\n');

    // TEST 4: Exact Correct Token
    console.log('TEST 4: Exact correct token');
    const resCorrect = await verifyConnection({
      platform: 'standard',
      siteUrl: `http://localhost:${port}`,
      apiBaseUrl: `http://localhost:${port}/api`,
      apiKey: EXPECTED_SECRET,
    });
    console.log('Result:', resCorrect.status, resCorrect.message);
    if (resCorrect.ok !== true || resCorrect.status !== 'CONNECTED') {
      throw new Error(`TEST 4 FAILED: Expected CONNECTED, got ${resCorrect.status}`);
    }
    console.log('✓ TEST 4 PASSED: Exact correct token successfully verified as CONNECTED\n');

    // TEST 5: Fallback Trap Test (Endpoint with 200 {"message": "Hello, world!"} but missing handshake)
    console.log('TEST 5: Generic 200 JSON endpoint without handshake confirmation');
    const genericServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Hello, world!' }));
    });
    await new Promise((resolve) => genericServer.listen(3898, resolve));

    try {
      const resGeneric = await verifyConnection({
        platform: 'standard',
        siteUrl: 'http://localhost:3898',
        apiBaseUrl: 'http://localhost:3898/api',
        apiKey: 'any_token',
      });
      console.log('Result:', resGeneric.status, resGeneric.message);
      if (resGeneric.ok === true || resGeneric.status === 'CONNECTED') {
        throw new Error('TEST 5 FAILED: Generic 200 response was falsely accepted as CONNECTED!');
      }
      console.log('✓ TEST 5 PASSED: Generic 200 response without handshake correctly REJECTED!\n');
    } finally {
      genericServer.close();
    }

    // TEST 6: Standard CMS protocol format: { ok: true, service: 'standard-cms', version: '1.0' }
    console.log('TEST 6: Standard CMS protocol format verification');
    const standardProtocolServer = http.createServer((req, res) => {
      const authHeader = req.headers['authorization'] || '';
      if (authHeader !== `Bearer ${EXPECTED_SECRET}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: 'standard-cms',
        version: '1.0',
      }));
    });
    await new Promise((resolve) => standardProtocolServer.listen(3897, resolve));

    try {
      const resProtocol = await verifyConnection({
        platform: 'standard',
        siteUrl: 'http://localhost:3897',
        apiBaseUrl: 'http://localhost:3897/api',
        apiKey: EXPECTED_SECRET,
      });
      console.log('Result:', resProtocol.status, resProtocol.message);
      if (resProtocol.ok !== true || resProtocol.status !== 'CONNECTED') {
        throw new Error('TEST 6 FAILED: Protocol format { ok: true, service: "standard-cms" } failed to verify!');
      }
      console.log('✓ TEST 6 PASSED: Protocol format { ok: true, service: "standard-cms" } verified as CONNECTED!\n');
    } finally {
      standardProtocolServer.close();
    }

    // TEST 7: Missing endpoint (HTTP 404) on mock server
    console.log('TEST 7: Missing endpoint 404 test');
    const res404 = await verifyConnection({
      platform: 'standard',
      siteUrl: `http://localhost:${port}`,
      apiBaseUrl: `http://localhost:${port}/nonexistent-api`,
      apiKey: EXPECTED_SECRET,
    });
    console.log('Result:', res404.status, res404.message);
    if (res404.status !== 'INVALID_API' || !res404.message.includes('External site does not implement the Standard CMS health endpoint')) {
      throw new Error(`TEST 7 FAILED: Expected 404 message, got ${res404.message}`);
    }
    console.log('✓ TEST 7 PASSED: Missing endpoint returns correct 404 message\n');

    // TEST 8: Unreachable host / Connection Refused
    console.log('TEST 8: Unreachable host (connection refused)');
    const resUnreachable = await verifyConnection({
      platform: 'standard',
      siteUrl: 'http://127.0.0.1:19283', // Closed port
      apiBaseUrl: 'http://127.0.0.1:19283/api',
      apiKey: EXPECTED_SECRET,
    });
    console.log('Result:', resUnreachable.status, resUnreachable.message);
    if (resUnreachable.status !== 'UNREACHABLE' || !resUnreachable.message.includes('Unable to reach external site')) {
      throw new Error(`TEST 8 FAILED: Expected UNREACHABLE with 'Unable to reach external site', got ${resUnreachable.message}`);
    }
    console.log('✓ TEST 8 PASSED: Unreachable host returns UNREACHABLE with clear message\n');

    // TEST 9: Real request to vertest-ten.vercel.app with current status
    console.log('TEST 9: Probing live vertest-ten.vercel.app with strict verifier...');
    const resLive = await verifyConnection({
      platform: 'standard',
      siteUrl: 'https://vertest-ten.vercel.app',
      apiBaseUrl: 'https://vertest-ten.vercel.app/api',
      apiKey: 'cms_live_test_any_key',
    });
    console.log('Live Result:', resLive.status, resLive.message);
    if (resLive.status === 'CONNECTED') {
      throw new Error('TEST 9 FAILED: Live site was incorrectly marked CONNECTED when /api/cms/health is 404!');
    }
    if (!resLive.message.includes('External site does not implement the Standard CMS health endpoint')) {
      throw new Error(`TEST 9 FAILED: Expected 404 message, got: ${resLive.message}`);
    }
    console.log('✓ TEST 9 PASSED: Live site without /api/cms/health correctly returns INVALID_API with 404 message.\n');

    console.log('=== ALL 9 TESTS PASSED FLAWLESSLY! ===');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
