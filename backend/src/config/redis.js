import redis from 'redis';
import config from './env.js';

// 🔧 ROOT FIX: Production-ready Redis configuration
// 
// Redis is running on WSL. This configuration handles connection properly.
// If you see connection errors, make sure:
// 1. Redis is running in WSL: wsl -d Ubuntu redis-server
// 2. Port 6379 is accessible from Windows
// 3. WSL networking is properly configured

const client = redis.createClient({ 
  url: config.REDIS_URL,
  socket: {
    connectTimeout: 10000, // 10 second timeout for WSL
    reconnectStrategy: (retries) => {
      // Reconnect after 1 second, max 10 retries
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      console.log(`🔄 Redis: Reconnecting... (attempt ${retries})`);
      return 1000; // Retry after 1 second
    }
  }
});

// Event handlers
client.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('');
    console.error('💡 Redis connection refused. Make sure Redis is running in WSL:');
    console.error('   1. Open WSL: wsl -d Ubuntu');
    console.error('   2. Start Redis: sudo service redis-server start');
    console.error('   3. Check status: sudo service redis-server status');
    console.error('   4. Test connection: redis-cli ping');
    console.error('');
  }
});

client.on('connect', () => {
  console.log('🔄 Redis: Connecting...');
});

client.on('ready', () => {
  console.log('✅ Redis: Connected and ready!');
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
});

export default client;
