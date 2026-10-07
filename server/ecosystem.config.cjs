module.exports = {
  apps: [{
    name: 'tailor-fit-api',
    script: 'server.ts',
    interpreter: '/root/.local/share/pnpm/tsx',
    cwd: '/var/www/tailor-fit-prod/server',
    env: { NODE_ENV: 'production' },
    instances: 1,
    exec_mode: 'fork',
    max_restarts: 10,
    restart_delay: 2000,
    out_file: '/var/log/tailor-fit-api-out.log',
    error_file: '/var/log/tailor-fit-api-err.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
