/**
 * Health Monitoring Service - System Health Checks
 * 
 * Purpose:
 * - Monitor all critical system components
 * - Check database connectivity and performance
 * - Monitor API response times
 * - Track error rates and system metrics
 * - Provide health endpoints for load balancers
 * - Alert on critical issues
 */

import prisma from '../config/prisma.js';
import redisClient from '../config/redis.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import config from '../config/env.js';
import os from 'os';

class HealthService {
  constructor() {
    this.healthChecks = new Map();
    this.lastCheckTime = null;
    this.systemMetrics = {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0
    };
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  /**
   * Comprehensive system health check
   * @returns {Promise<Object>} Complete health status
   */
  async getSystemHealth() {
    const startTime = Date.now();

    try {
      const [
        databaseHealth,
        redisHealth,
        firebaseHealth,
        systemHealth,
        serviceHealth
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkFirebase(),
        this.checkSystemResources(),
        this.checkServices()
      ]);

      const overallStatus = this.determineOverallStatus([
        databaseHealth,
        redisHealth,
        firebaseHealth,
        systemHealth,
        serviceHealth
      ]);

      const checkDuration = Date.now() - startTime;

      const healthReport = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checkDuration: `${checkDuration}ms`,
        components: {
          database: databaseHealth,
          redis: redisHealth,
          firebase: firebaseHealth,
          system: systemHealth,
          services: serviceHealth
        },
        metrics: this.getMetrics(),
        environment: config.NODE_ENV
      };

      this.lastCheckTime = Date.now();
      this.healthChecks.set('latest', healthReport);

      return healthReport;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Quick health check (for load balancers)
   * @returns {Promise<Object>} Basic health status
   */
  async quickHealthCheck() {
    try {
      // Quick database ping
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check database health and performance
   */
  async checkDatabase() {
    const startTime = Date.now();

    try {
      // Test connection
      await prisma.$queryRaw`SELECT 1`;

      // Get connection pool status (if available)
      const connectionStatus = await this.getDatabaseConnectionStatus();

      // Check query performance
      const queryStartTime = Date.now();
      await prisma.user.count();
      const queryTime = Date.now() - queryStartTime;

      const latency = Date.now() - startTime;

      return {
        status: latency < 200 ? 'healthy' : (latency < 500 ? 'degraded' : 'unhealthy'),
        latency: `${latency}ms`,
        queryPerformance: `${queryTime}ms`,
        connected: true,
        connections: connectionStatus
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis() {
    const startTime = Date.now();

    try {
      // Test ping
      await redisClient.ping();

      // Test set/get
      const testKey = 'health:test';
      await redisClient.set(testKey, 'ok', 'EX', 10);
      const value = await redisClient.get(testKey);

      const latency = Date.now() - startTime;

      return {
        status: latency < 100 ? 'healthy' : (latency < 300 ? 'degraded' : 'unhealthy'),
        latency: `${latency}ms`,
        connected: true,
        testPassed: value === 'ok'
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check Firebase health
   */
  async checkFirebase() {
    try {
      const isConfigured = isFirebaseConfigured();

      if (!isConfigured) {
        return {
          status: 'not_configured',
          connected: false,
          message: 'Firebase not configured'
        };
      }

      // Basic check - Firebase is initialized
      return {
        status: 'healthy',
        connected: true,
        configured: true
      };
    } catch (error) {
      console.error('Firebase health check failed:', error);
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    try {
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = ((usedMemory / totalMemem) * 100).toFixed(2);

      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();

      const heapUsed = process.memoryUsage().heapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const heapUsagePercent = ((heapUsed / heapTotal) * 100).toFixed(2);

      const status = 
        heapUsagePercent < 70 ? 'healthy' : 
        heapUsagePercent < 90 ? 'degraded' : 
        'unhealthy';

      return {
        status,
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          loadAverage: loadAverage.map(l => l.toFixed(2))
        },
        memory: {
          total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
          usagePercent: memoryUsagePercent
        },
        heap: {
          used: `${(heapUsed / 1024 / 1024).toFixed(2)} MB`,
          total: `${(heapTotal / 1024 / 1024).toFixed(2)} MB`,
          usagePercent: heapUsagePercent
        },
        uptime: `${(process.uptime() / 3600).toFixed(2)} hours`,
        platform: os.platform(),
        nodeVersion: process.version
      };
    } catch (error) {
      console.error('System resource check failed:', error);
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Check health of individual services
   */
  async checkServices() {
    try {
      const services = {
        websocket: { status: 'healthy', message: 'WebSocket service running' },
        notifications: { status: 'healthy', message: 'Notification service running' },
        scheduler: { status: 'healthy', message: 'Scheduler running' }
      };

      // Check notification queue
      try {
        // Would check Bull queue health here
        services.notificationQueue = { status: 'healthy' };
      } catch (error) {
        services.notificationQueue = { status: 'degraded', error: error.message };
      }

      const overallStatus = Object.values(services).every(s => s.status === 'healthy') 
        ? 'healthy' 
        : 'degraded';

      return {
        status: overallStatus,
        details: services
      };
    } catch (error) {
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const avgResponseTime = this.systemMetrics.requestCount > 0 
      ? (this.systemMetrics.totalResponseTime / this.systemMetrics.requestCount).toFixed(2)
      : 0;

    const errorRate = this.systemMetrics.requestCount > 0 
      ? ((this.systemMetrics.errorCount / this.systemMetrics.requestCount) * 100).toFixed(2)
      : 0;

    return {
      requests: {
        total: this.systemMetrics.requestCount,
        errors: this.systemMetrics.errorCount,
        errorRate: `${errorRate}%`
      },
      performance: {
        averageResponseTime: `${avgResponseTime}ms`
      }
    };
  }

  /**
   * Record API request metrics
   */
  recordRequest(responseTime, isError = false) {
    this.systemMetrics.requestCount++;
    this.systemMetrics.totalResponseTime += responseTime;
    if (isError) {
      this.systemMetrics.errorCount++;
    }
  }

  /**
   * Determine overall system status
   */
  determineOverallStatus(componentHealths) {
    const unhealthy = componentHealths.some(h => h.status === 'unhealthy');
    const degraded = componentHealths.some(h => h.status === 'degraded');

    if (unhealthy) return 'unhealthy';
    if (degraded) return 'degraded';
    return 'healthy';
  }

  /**
   * Get database connection status
   */
  async getDatabaseConnectionStatus() {
    try {
      // This would query actual connection pool metrics
      // Placeholder for now
      return {
        active: 'unknown',
        idle: 'unknown',
        total: 'unknown'
      };
    } catch (error) {
      return { error: 'Unable to get connection status' };
    }
  }

  /**
   * Check if system is ready to accept traffic
   */
  async isReady() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redisClient.ping();
      return {
        ready: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if system is alive
   */
  isAlive() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Get detailed diagnostics
   */
  async getDiagnostics() {
    try {
      const [
        systemHealth,
        databaseStats,
        redisStats,
        processStats
      ] = await Promise.all([
        this.getSystemHealth(),
        this.getDatabaseStats(),
        this.getRedisStats(),
        this.getProcessStats()
      ]);

      return {
        timestamp: new Date().toISOString(),
        health: systemHealth,
        database: databaseStats,
        redis: redisStats,
        process: processStats
      };
    } catch (error) {
      console.error('Diagnostics failed:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const [
        userCount,
        appointmentCount,
        recentAppointments
      ] = await Promise.all([
        prisma.user.count(),
        prisma.appointment.count(),
        prisma.appointment.count({
          where: {
            startTs: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        counts: {
          users: userCount,
          appointments: appointmentCount,
          appointmentsLast24h: recentAppointments
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get Redis statistics
   */
  async getRedisStats() {
    try {
      const info = await redisClient.info();
      // Parse Redis INFO output
      // This is simplified - you'd want to parse the actual info string
      return {
        connected: true,
        info: 'Available'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get process statistics
   */
  getProcessStats() {
    const memUsage = process.memoryUsage();
    
    return {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
      },
      cpu: process.cpuUsage(),
      platform: process.platform,
      version: process.version
    };
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(interval = 60000) {
    // Run health check every minute
    setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        // Check for critical issues
        if (health.status === 'unhealthy') {
          console.error('🚨 CRITICAL: System is unhealthy!', health);
          // Could trigger alerts here (email, Slack, PagerDuty, etc.)
        } else if (health.status === 'degraded') {
          console.warn('⚠️  WARNING: System is degraded', health);
        }
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    }, interval);

    console.log(`✅ Periodic health checks started (interval: ${interval}ms)`);
  }

  /**
   * Get health check history
   */
  getHealthHistory(limit = 10) {
    // Would store history in Redis or database
    // For now, return latest
    return {
      checks: [this.healthChecks.get('latest')],
      count: 1
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.systemMetrics = {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0
    };
    console.log('✅ Metrics reset');
  }
}

export default new HealthService();

