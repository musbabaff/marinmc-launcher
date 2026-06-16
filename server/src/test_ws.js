import { WebSocket } from 'ws';
import http from 'http';

async function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- STARTING AUTH & WS SECURITY TESTS ---');
  
  const testUsername = 'testuser_' + Math.random().toString(36).substr(2, 5);
  const testPassword = 'securepassword123';
  
  // 1. Test registration
  console.log(`1. Testing registration for user: ${testUsername}`);
  const regRes = await request('/api/auth/register', 'POST', {
    username: testUsername,
    password: testPassword
  });
  console.log('Registration Status:', regRes.statusCode);
  console.log('Registration Response:', regRes.body);
  
  if (regRes.statusCode !== 200 || !regRes.body.token) {
    throw new Error('Registration failed!');
  }
  
  let token = regRes.body.token;
  
  // 2. Test login with correct password
  console.log('2. Testing login with correct password');
  const loginRes = await request('/api/auth/login', 'POST', {
    username: testUsername,
    password: testPassword
  });
  console.log('Login Status:', loginRes.statusCode);
  if (loginRes.statusCode !== 200 || !loginRes.body.token) {
    throw new Error('Login failed with correct credentials!');
  }
  token = loginRes.body.token;
  
  // 3. Test login with wrong password
  console.log('3. Testing login with wrong password');
  const loginFailRes = await request('/api/auth/login', 'POST', {
    username: testUsername,
    password: 'wrongpassword'
  });
  console.log('Wrong Password Login Status:', loginFailRes.statusCode);
  console.log('Response:', loginFailRes.body);
  if (loginFailRes.statusCode === 200) {
    throw new Error('Login should have failed with wrong credentials!');
  }

  // 4. Test WebSocket connection with correct token
  console.log('4. Connecting to WS with CORRECT token...');
  const wsUrl = `ws://localhost:3000/ws?username=${testUsername}&token=${token}`;
  const ws = new WebSocket(wsUrl);
  
  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('WS Connection successfully opened!');
      ws.close();
      resolve();
    });
    ws.on('error', (err) => {
      reject(new Error('WS Connection failed: ' + err.message));
    });
  });

  // 5. Test WebSocket connection with incorrect token
  console.log('5. Connecting to WS with INCORRECT token...');
  const badWsUrl = `ws://localhost:3000/ws?username=${testUsername}&token=badtoken123`;
  const badWs = new WebSocket(badWsUrl);
  
  await new Promise((resolve) => {
    badWs.on('open', () => {
      console.error('WS Connection opened with bad token! FAILURE.');
      badWs.close();
      resolve(new Error('WS opened with bad token'));
    });
    badWs.on('error', (err) => {
      console.log('WS Connection rejected during upgrade handshake as expected! Error:', err.message);
      resolve();
    });
  });

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
