const { spawnSync } = require('node:child_process');

for (const args of [['run', 'migrate'], ['run', 'seed']]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
