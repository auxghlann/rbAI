/**
 * Application configuration
 * Centralizes environment-specific settings
 */

// API configuration - supports both development and production
export const API_CONFIG = {
  // Use environment variable if available, fallback to localhost for development
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Timeout settings
  timeout: 30000, // 30 seconds
  
  // Request headers
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
} as const;

// Environment helpers
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Export the base API URL for convenience
export const API_URL = API_CONFIG.baseURL;
