import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctor.routes.js';

// Import config
import config from './config/env.js';

// Import WebSocket service
import websocketService from './services/websocket.service.js';

// Initialize app
const app = express();
const server = createServer(app);

// CORS must be first
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

// Rate limiting (disabled for debugging)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Stricter rate limit for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 5 OTP requests per hour
  message: 'Too many OTP requests, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      maxSize: '10MB'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Duplicate entry',
      field: err.meta?.target
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: config.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(config.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize WebSocket
websocketService.initialize(server);

// Start server
const PORT = config.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════╗
║       HealBridge Backend Server       ║
╠═══════════════════════════════════════╣
║  Environment: ${config.NODE_ENV.padEnd(23)} ║
║  Port:        ${PORT.toString().padEnd(23)} ║
║  Status:      Running ✓               ║
║  WebSocket:   Enabled ✓               ║
╚═══════════════════════════════════════╝
  `);
  console.log(`🏥 Server is running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Patient API: http://localhost:${PORT}/api/patient`);
  console.log(`👨‍⚕️  Doctor API: http://localhost:${PORT}/api/doctor`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  
  // Log WebSocket stats every 5 minutes
  setInterval(() => {
    const stats = websocketService.getStats();
    console.log(`\n📊 WebSocket Stats:`, stats);
  }, 5 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
  process.exit(0);
  });
});

export default app;

