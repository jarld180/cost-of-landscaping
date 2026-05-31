const { readFileSync } = require('fs');

function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
    }
    return env;
  } catch {
    return {};
  }
}

module.exports = {
  apps: [
    {
      name: 'costofconcrete',
      script: './server/index.mjs',
      cwd: '/home/ubuntu/app',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        ...loadEnv('/home/ubuntu/app/.env'),
      },
    },
  ],
};
