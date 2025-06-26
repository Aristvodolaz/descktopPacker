module.exports = {
  apps: [
    {
      name: 'packer-desktop-web',
      script: '/bin/bash',
      args: '-c "source ~/.nvm/nvm.sh && nvm use 18.20.5 && npm run dev"',
      cwd: '/home/admin-lc/descktopPacker',
      env: {
        NODE_ENV: 'development',
        PORT: 3009,
        NVM_DIR: '/home/admin-lc/.nvm',
        PATH: '/home/admin-lc/.nvm/versions/node/v18.20.5/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
} 