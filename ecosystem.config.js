module.exports = {
  apps: [
    {
      name: "aurify-dashboard-backend",
      cwd: "/var/www/html/Aurify_Dashboard/backend",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
    },
  ],
};