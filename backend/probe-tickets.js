const http = require('http');
const body = JSON.stringify({ email: 'admin@insurance.com', password: 'admin123' });
const req = http.request({ host: 'localhost', port: 5000, path: '/api/tickets', method: 'GET' }, res => { res.resume(); res.on('end', process.exit); });
req.end();
process.stdout.write('triggered');
