import redis from 'redis';
import config from './env.js';

// ✅ Cloud-Ready Redis Configuration
// Supports both local Redis and Upstash (cloud Redis)
// 
// For Upstash:
// - URL format: rediss://default:password@host:port
// - Uses TLS by default (rediss://)
// - No local Redis installation needed
//
// For Local Redis:
// - URL format: redis://localhost:6379
// - Requires local Redis server running

const isUpstash = config.REDIS_URL?.includes('upstash.io') || config.REDIS_URL?.startsWith('rediss://');

const clientOptions = {
  url: config.REDIS_URL,
  socket: {
    connectTimeout: isUpstash ? 30000 : 10000, // 30s for cloud, 10s for local
    reconnectStrategy: (retries) => {
      // More aggressive reconnection for cloud services
      const maxRetries = isUpstash ? 20 : 10;
      const retryDelay = isUpstash ? 2000 : 1000;
      
      if (retries > maxRetries) {
        console.error(`❌ Redis: Max reconnection attempts reached (${maxRetries})`);
        return new Error('Max reconnection attempts reached');
      }
      
      console.log(`🔄 Redis: Reconnecting... (attempt ${retries}/${maxRetries})`);
      return retryDelay;
    }
  }
};

// Add TLS configuration for Upstash
if (isUpstash) {
  clientOptions.socket.tls = true;
  clientOptions.socket.rejectUnauthorized = false; // For self-signed certificates
  console.log('🌐 Upstash Redis detected - using TLS connection');
}

const client = redis.createClient(clientOptions);

// Event handlers
client.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
  
  if (isUpstash) {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.error('');
      console.error('💡 Upstash Redis connection failed. Please check:');
      console.error('   1. REDIS_URL is correct in .env');
      console.error('   2. Upstash database is active (check dashboard)');
      console.error('   3. Network/firewall allows connections');
      console.error('   4. URL format: rediss://default:password@host:port');
      console.error('');
    }
  } else {
    if (err.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('💡 Local Redis connection refused. Options:');
      console.error('   Option 1 - Use Upstash (Recommended):');
      console.error('      1. Sign up at https://upstash.com');
      console.error('      2. Create Redis database');
      console.error('      3. Copy Redis URL to .env');
      console.error('');
      console.error('   Option 2 - Start Local Redis:');
      console.error('      1. Install Redis: https://redis.io/download');
      console.error('      2. Start: redis-server');
      console.error('      3. Test: redis-cli ping');
      console.error('');
    }
  }
});

client.on('connect', () => {
  const connectionType = isUpstash ? 'Upstash Cloud' : 'Local';
  console.log(`🔄 Redis: Connecting to ${connectionType}...`);
});

client.on('ready', () => {
  const connectionType = isUpstash ? 'Upstash Cloud' : 'Local';
  console.log(`✅ Redis: Connected to ${connectionType} and ready!`);
  if (isUpstash) {
    console.log('   Using cloud Redis - no local installation needed ☁️');
  }
});

client.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

client.on('end', () => {
  console.log('⚠️  Redis: Connection closed');
});

// Connect to Redis
client.connect().catch((err) => {
  console.error('❌ Failed to connect to Redis:', err.message);
  console.error('⚠️  Server will start but Redis-dependent features will not work.');
  console.error('   Features affected: OTP login, slot holds, queues, caching');
  console.error('');
  if (isUpstash) {
    console.error('💡 Upstash setup: https://upstash.com → Create Database → Copy URL');
  } else {
    console.error('💡 Consider using Upstash for cloud Redis: https://upstash.com');
  }
});

export default client;
