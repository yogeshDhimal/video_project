const env = require('./config/env');
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocket } = require('./socket');

const PORT = env.port;

async function main() {
  if (!env.mongoUri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  if (!env.jwtSecret) {
    console.error('Missing JWT_SECRET');
    process.exit(1);
  }
  await connectDB(env.mongoUri);
  const server = http.createServer(app);
  // Increase keep-alive timeouts to prevent ECONNRESET issues with Vite proxy
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  initSocket(server, app);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is already in use.`);
      console.error(`💡 Try running: npm run kill-port\n`);
      process.exit(1);
    } else {
      console.error('Server error:', e);
    }
  });

  server.listen(PORT, () => {
    console.log(`ClickWatch API listening on ${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
