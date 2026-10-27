const http = require('http');
const fs = require('fs');
let token = '';
const endpoints = ['dashboard/stats','dashboard/provider','dashboard/audit-logs','plans','policies','claims','tickets','payments','notifications','customers'];
let i = 0;
function login(done) {
  const body = JSON.stringify({ email: 'admin@insurance.com', password: 'admin123' });
  const req = http.request({ host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => { token = JSON.parse(b).data.accessToken; done(); });
  });
  req.on('error', e => { console.log('LOGIN ERR', e.message); process.exit(1); });
  req.write(body); req.end();
}
function next() {
  if (i >= endpoints.length) { console.log('DONE'); process.exit(0); }
  const ep = endpoints[i++];
  const req = http.request({ host: 'localhost', port: 5000, path: '/api/' + ep, method: 'GET', headers: { Authorization: 'Bearer ' + token } }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log(res.statusCode, '/api/' + ep, b.slice(0, 120));
      next();
    });
  });
  req.on('error', e => { console.log('ERR', ep, e.message); next(); });
  req.end();
}
login(next);
