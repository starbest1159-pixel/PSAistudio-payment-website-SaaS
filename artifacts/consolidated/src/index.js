const { spawn } = require('child_process');

function run(command, args, options = {}) {
  const p = spawn(command, args, { stdio: 'inherit', shell: true, ...options });
  p.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`${command} ${args.join(' ')} exited with code ${code} ${signal ? `(signal ${signal})` : ''}`);
    }
  });
  return p;
}

console.log('Starting consolidated dev: launching api-server and dashboard...');

// Start api-server dev
run('pnpm', ['--filter', '@psaipay/api-server', 'dev']);

// Start dashboard dev
run('pnpm', ['--filter', '@psaipay/dashboard', 'dev']);

// Note: This script spawns the two dev commands and attaches stdio so you can see logs inline.
// To stop both, Ctrl+C in this terminal will propagate to child processes (shell:true helps on some platforms).
