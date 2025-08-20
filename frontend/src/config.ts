// API Configuration
export const API_BASE = "http://localhost:8001";
export const WS_URL = "ws://localhost:8001/ws";

// Environment-based configuration
export const config = {
  api: {
    baseURL: API_BASE,
    timeout: 10000, // 10 seconds
  },
  ws: {
    url: WS_URL,
  },
  app: {
    name: "Dhan Automation",
    version: "1.0.0",
  },
};
