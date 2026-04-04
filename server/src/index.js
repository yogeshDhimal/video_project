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
  initSocket(server, app);
  server.listen(PORT, () => {
    console.log(`StreamVault API listening on ${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
