const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const config = process.env.REDIS_URI || {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
};

let redis = null;

try {
  if (process.env.REDIS_URI || process.env.REDIS_HOST) {
    redis = new Redis(config);

    redis.on('error', (err) => {
      if (err.message.includes('NOAUTH')) {
        console.error('Redis Auth Failed: Check REDIS_PASSWORD in .env');
      } else {
        console.error('Redis error:', err.message);
      }
    });
  }
} catch (e) {
  console.error('Failed to initialize Redis client:', e.message);
}

module.exports = redis;
