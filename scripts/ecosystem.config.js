module.exports = {
  apps: [{
    name: 'maptamin-worker',
    script: 'npx',
    args: 'tsx scripts/vm-worker.ts',
    cwd: '/home/ubuntu/maptamin',
    env: {
      NODE_ENV: 'production',
    },
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/ubuntu/logs/worker-error.log',
    out_file: '/home/ubuntu/logs/worker-out.log',
    merge_logs: true,

    // Restart policy
    max_restarts: 10,
    restart_delay: 5000,
    autorestart: true,

    // Watch (disabled in production)
    watch: false,
  }]
};
