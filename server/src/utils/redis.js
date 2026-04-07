const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

// We support both a single URI or separate host/port/password (more reliable)
const config = process.env.REDIS_URI || {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000), // Better reconnection
};

let redis = null;

try {
  // Only initialize if we have at least a host or a URI
  if (process.env.REDIS_URI || process.env.REDIS_HOST) {
    redis = new Redis(config);
    
    redis.on('connect', () => {
      console.log('✅ Connected to Redis successfully');
    });

    redis.on('error', (err) => {
      // Don't flood logs if it's an auth error, we'll see it once
      if (err.message.includes('NOAUTH')) {
        console.error('❌ Redis Auth Failed: Check REDIS_PASSWORD in .env');
      } else {
        console.error('❌ Redis error:', err.message);
      }
    });
  } else {
    console.warn('⚠️ Redis config missing (REDIS_HOST or REDIS_URI). Performance caching disabled.');
  }
} catch (e) {
  console.error('❌ Failed to initialize Redis client:', e.message);
}

module.exports = redis;
