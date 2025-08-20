import axios from "axios";
import { API_BASE } from "../config";
import { logApiError } from "../services/errorLogger";

console.log("API Client initialized with baseURL:", API_BASE);

// Create axios instance with default configuration
export const api = axios.create({ 
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to generate UUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Request interceptor for logging and common headers
api.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    // Add trace ID for request tracking
    config.headers["X-Trace-ID"] = generateUUID();
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    const traceId = error.config?.headers?.["X-Trace-ID"];
    
    // Log error to error logger
    logApiError(
      `API Error: ${error.message}`,
      error,
      traceId,
      'API Client'
    );
    
    console.error("API Response Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
      traceId
    });
    
    // Handle common error scenarios
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network Error:", error.request);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// Export default api instance
export default api;
