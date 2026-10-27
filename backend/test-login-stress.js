const http = require('http');
const token = process.argv[2] || '';
const path = '/api/auth/login';
const body = JSON.stringify({ email: 'admin@insurance.com', password: 'admin123' });
let successes = 0, failures = 0;
let i = 0;
function attempt() {
  if (i >= 8) { console.log('LOGIN RESULTS: ok=' + successes + ' fail=' + failures); process.exit(0); }
  i++;
  const req = http.request({ host: 'localhost', port: 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      const ok = res.statusCode === 200;
      if (ok) successes++; else failures++;
      console.log(i, res.statusCode, ok ? 'OK' : b);
      if (ok && !token) {
        try { const d = JSON.parse(b); fs.writeFileSync('test-token.txt', d.data.accessToken); } catch (e) {}
      }
      setTimeout(attempt, 300);
    });
  });
  req.on('error', e => { failures++; console.log(i, 'ERR', e.message); setTimeout(attempt, 300); });
  req.write(body);
  req.end();
}
const fs = require('fs');
function waitReady() {
  const req = http.request({ host: 'localhost', port: 5000, path: '/api/health', method: 'GET' }, res => {
    res.resume();
    console.log('server ready');
    attempt();
  });
  req.on('error', () => setTimeout(waitReady, 1000));
  req.end();
}
waitReady();
