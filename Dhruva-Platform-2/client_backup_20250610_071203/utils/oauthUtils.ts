/**
 * OAuth utility functions for Dhruva Platform
 */

export interface OAuthUser {
  sub: string;
  name: string;
  email: string;
  role: string;
  auth_type: string;
  oauth_provider: string;
  exp: number;
  iat: number;
}

export interface OAuthError {
  error: string;
  error_description?: string;
  state?: string;
}

/**
 * Decode JWT token payload (basic decode, not verification)
 * Note: This is for client-side display only, server still validates the token
 */
export const decodeJWTPayload = (token: string): OAuthUser | null => {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
};

/**
 * Check if user is authenticated via OAuth
 */
export const isOAuthUser = (): boolean => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    const payload = decodeJWTPayload(token);
    return payload?.auth_type === 'oauth';
  } catch {
    return false;
  }
};

/**
 * Get OAuth provider for current user
 */
export const getOAuthProvider = (): string | null => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    
    const payload = decodeJWTPayload(token);
    return payload?.oauth_provider || null;
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeJWTPayload(token);
    if (!payload?.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

/**
 * Get user information from stored token
 */
export const getCurrentUser = (): OAuthUser | null => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    
    if (isTokenExpired(token)) {
      // Token is expired, clear storage
      clearAuthStorage();
      return null;
    }
    
    return decodeJWTPayload(token);
  } catch {
    return null;
  }
};

/**
 * Clear all authentication storage
 */
export const clearAuthStorage = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_role');
  localStorage.removeItem('email');
  localStorage.removeItem('current_page');
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRole: string): boolean => {
  try {
    const user = getCurrentUser();
    return user?.role === requiredRole;
  } catch {
    return false;
  }
};

/**
 * Check if user is admin
 */
export const isAdmin = (): boolean => {
  return hasRole('ADMIN');
};

/**
 * Check if user is consumer
 */
export const isConsumer = (): boolean => {
  return hasRole('CONSUMER');
};

/**
 * Format OAuth error for display
 */
export const formatOAuthError = (error: string): string => {
  const errorMessages: { [key: string]: string } = {
    'access_denied': 'Access was denied. Please grant the necessary permissions to continue.',
    'invalid_request': 'Invalid request. Please try again.',
    'invalid_client': 'Invalid client configuration. Please contact support.',
    'invalid_grant': 'Invalid authorization grant. Please try logging in again.',
    'unauthorized_client': 'Unauthorized client. Please contact support.',
    'unsupported_grant_type': 'Unsupported grant type. Please contact support.',
    'invalid_scope': 'Invalid scope requested. Please contact support.',
    'server_error': 'Server error occurred. Please try again later.',
    'temporarily_unavailable': 'Service temporarily unavailable. Please try again later.',
    'invalid_state': 'Security validation failed. Please try again.',
    'verification_required': 'Email verification required. Please check your email.',
  };
  
  return errorMessages[error] || `Authentication error: ${error}`;
};

/**
 * Generate secure random state for OAuth flows
 */
export const generateOAuthState = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validate OAuth state parameter
 */
export const validateOAuthState = (receivedState: string, expectedState: string): boolean => {
  return receivedState === expectedState;
};

/**
 * Store OAuth state for validation
 */
export const storeOAuthState = (state: string): void => {
  sessionStorage.setItem('oauth_state', state);
};

/**
 * Retrieve and clear OAuth state
 */
export const retrieveOAuthState = (): string | null => {
  const state = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return state;
};

/**
 * Check if current environment supports OAuth
 */
export const isOAuthSupported = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.crypto !== 'undefined' && 
         typeof window.crypto.getRandomValues === 'function';
};
