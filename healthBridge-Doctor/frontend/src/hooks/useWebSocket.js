/**
 * WebSocket Hook - Real-time Connection Management
 * 
 * Purpose:
 * - Manage WebSocket connection lifecycle
 * - Subscribe to specific events
 * - Handle automatic reconnection
 * - Provide connection status tracking
 * - Integrate with React components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom hook for WebSocket connection
 * @param {Object} options - Configuration options
 * @returns {Object} WebSocket connection utilities
 */
export const useWebSocket = (options = {}) => {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 2000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);

  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    // Get auth token from localStorage
    const token = localStorage.getItem('token');

    if (!token) {
      setConnectionError('No authentication token found');
      return;
    }

    try {
      // Initialize socket connection
      socketRef.current = io(SOCKET_URL, {
        auth: {
          token
        },
        transports: ['websocket'],
        reconnection: reconnect,
        reconnectionAttempts,
        reconnectionDelay
      });

      // Connection established
      socketRef.current.on('connect', () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectCount(0);
      });

      // Connection error
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        setIsConnected(false);
        setConnectionError(error.message);

        // Handle token expiration
        if (error.message.includes('token') || error.message.includes('auth')) {
          console.log('Token expired or invalid, redirecting to login...');
          // Could trigger logout here
        }
      });

      // Disconnection
      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setIsConnected(false);

        // Attempt reconnection if not a manual disconnect
        if (reason === 'io server disconnect' && reconnect) {
          // Server initiated disconnect, try to reconnect
          socketRef.current.connect();
        }
      });

      // Reconnection attempt
      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}/${reconnectAttempts}`);
        setReconnectCount(attempt);
      });

      // Reconnection success
      socketRef.current.on('reconnect', (attempt) => {
        console.log(`✅ Reconnected after ${attempt} attempts`);
        setIsConnected(true);
        setConnectionError(null);
        setReconnectCount(0);
      });

      // Reconnection failed
      socketRef.current.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after maximum attempts');
        setConnectionError('Failed to reconnect to server');
      });

      // Welcome message from server
      socketRef.current.on('connected', (data) => {
        console.log('📡 Server message:', data);
      });

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      setConnectionError(error.message);
    }
  }, [reconnect, reconnectAttempts, reconnectDelay]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  /**
   * Subscribe to an event
   */
  const subscribe = useCallback((event, callback) => {
    if (!socketRef.current) {
      console.warn('Socket not initialized, cannot subscribe');
      return () => {};
    }

    // Add event listener
    socketRef.current.on(event, callback);

    // Store listener for cleanup
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event).push(callback);

    console.log(`📡 Subscribed to event: ${event}`);

    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      console.log(`🔕 Unsubscribed from event: ${event}`);
    };
  }, []);

  /**
   * Emit an event to server
   */
  const emit = useCallback((event, data) => {
    if (!socketRef.current || !isConnected) {
      console.warn('Socket not connected, cannot emit');
      return false;
    }

    socketRef.current.emit(event, data);
    console.log(`📤 Emitted event: ${event}`, data);
    return true;
  }, [isConnected]);

  /**
   * Subscribe to room
   */
  const joinRoom = useCallback((room) => {
    return emit('subscribe', { room });
  }, [emit]);

  /**
   * Unsubscribe from room
   */
  const leaveRoom = useCallback((room) => {
    return emit('unsubscribe', { room });
  }, [emit]);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      // Clear all listeners
      listenersRef.current.forEach((listeners, event) => {
        listeners.forEach(callback => {
          if (socketRef.current) {
            socketRef.current.off(event, callback);
          }
        });
      });
      listenersRef.current.clear();

      // Disconnect socket
      disconnect();

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    reconnectCount,
    lastMessage,
    connect,
    disconnect,
    subscribe,
    emit,
    joinRoom,
    leaveRoom,
    socket: socketRef.current
  };
};

/**
 * Hook for specific event subscription
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @param {Array} dependencies - Dependency array
 */
export const useWebSocketEvent = (event, callback, dependencies = []) => {
  const { subscribe } = useWebSocket({ autoConnect: false });

  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, ...dependencies]);
};

/**
 * Hook for appointment updates
 */
export const useAppointmentUpdates = (callback) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('appointment:updated', (data) => {
      console.log('📅 Appointment updated:', data);
      callback(data);
    });

    return unsubscribe;
  }, [callback, subscribe]);
};

/**
 * Hook for notifications
 */
export const useNotifications = (callback) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('notification:new', (data) => {
      console.log('🔔 New notification:', data);
      callback(data);
    });

    return unsubscribe;
  }, [callback, subscribe]);
};

/**
 * Hook for queue updates
 */
export const useQueueUpdates = (callback) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('queue:updated', (data) => {
      console.log('👥 Queue updated:', data);
      callback(data);
    });

    return unsubscribe;
  }, [callback, subscribe]);
};

/**
 * Hook for emergency notifications
 */
export const useEmergencyNotifications = (callback) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('emergency:notification', (data) => {
      console.log('🚨 Emergency notification:', data);
      callback(data);
    });

    return unsubscribe;
  }, [callback, subscribe]);
};

export default useWebSocket;

