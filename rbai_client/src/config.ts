/**
 * Application configuration
 * Centralizes environment-specific settings
 */

// API configuration - supports both development and production
// Use Heroku backend URL in production
export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://rbai-server-029f36b07bc7.herokuapp.com/' 
    : 'http://localhost:8000');

export const API_CONFIG = {
  // Use the API_URL configured above
  baseURL: API_URL,
  
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
