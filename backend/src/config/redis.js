const redis = require('redis');
const config = require('./env');

const client = redis.createClient({ url: config.REDIS_URL });
client.on('error', (err) => console.error('Redis error:', err));
client.connect().catch(console.error);

module.exports = client;