/**
 * Auth State Clear Utility
 * 
 * This script provides a way to completely reset the auth state
 * Can be called from browser console using: window.clearAuthState()
 */

import config from '../config';
import store from './index';
import { resetAuthState } from './slices/authSlice';

/**
 * Completely clears all authentication state
 * - Clears localStorage tokens
 * - Resets Redux state
 * - Provides detailed logging
 */
export function clearAuthState() {
  console.log('===== AUTH STATE RESET =====');
  
  // 1. Clear localStorage
  console.log('1. Clearing localStorage auth items:');
  const keysToRemove = [config.tokenKey, config.refreshTokenKey, 'lastLoginTime'];
  keysToRemove.forEach(key => {
    const exists = !!localStorage.getItem(key);
    console.log(`- ${key}: ${exists ? 'removed' : 'not present'}`);
    localStorage.removeItem(key);
  });
  
  // 2. Reset Redux auth state
  console.log('2. Resetting Redux auth state');
  store.dispatch(resetAuthState());
  
  // 3. Output current state
  console.log('3. Current auth state after reset:');
  const state = store.getState().auth;
  console.log({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    loading: state.loading,
    error: state.error
  });
  
  console.log('===== AUTH STATE RESET COMPLETE =====');
  console.log('You can now refresh the page or navigate to /sign-in');
  
  return true;
}

// Make it available in the browser console
if (typeof window !== 'undefined') {
  window.clearAuthState = clearAuthState;
}

export default clearAuthState; 