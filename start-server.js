const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', [path.join(__dirname, 'backend', 'src', 'index.js')], {
  cwd: path.join(__dirname, 'backend'),
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true
});

server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

server.unref();
console.log('Server started with PID:', server.pid);
