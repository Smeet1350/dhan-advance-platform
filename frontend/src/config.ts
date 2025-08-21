// Frontend Configuration
export const config = {
  // API Configuration
  API_BASE: 'http://localhost:8001',
  WS_URL: 'ws://localhost:8001/ws',
  api: {
    baseURL: 'http://localhost:8001'
  },
  
  // WebSocket Configuration
  WS_RECONNECT_INTERVAL: 1000,
  WS_MAX_RECONNECT_ATTEMPTS: 10,
  WS_HEARTBEAT_INTERVAL: 30000,
  
  // UI Configuration
  REFRESH_INTERVAL: 5000,
  ANIMATION_DURATION: 300,
  
  // Trading Configuration
  DEFAULT_ORDER_TYPE: 'MARKET',
  MIN_ORDER_QUANTITY: 1,
  MAX_ORDER_QUANTITY: 1000000,
  
  // Risk Configuration
  MAX_POSITION_SIZE: 1000000,
  MAX_DAILY_LOSS: 100000,
  POSITION_LIMIT_WARNING: 0.8, // 80% of max
};

// Export individual values for backward compatibility
export const API_BASE = config.API_BASE;
export const WS_URL = config.WS_URL;
