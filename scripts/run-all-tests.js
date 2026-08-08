const { spawnSync } = require('child_process');
for (const command of [['test'], ['run', 'test:integration']]) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', command, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
