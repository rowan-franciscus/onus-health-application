import { sessionTimeout } from '../slices/authSlice';
import config from '../../config';

// Default session timeout (30 minutes)
const SESSION_TIMEOUT = config.sessionTimeout || 30 * 60 * 1000;

// Global flag to indicate if AuthContext is handling sessions
// This helps prevent duplicate session management
window.authContextActive = false;

// Track user activity and session state
let sessionTimer = null;
let lastActivity = Date.now();

// User activity events to listen for
const activityEvents = [
  'mousedown',
  'mousemove',
  'keypress',
  'scroll',
  'click',
  'touchstart',
];

// Set up activity listeners
const setupActivityListeners = (dispatch) => {
  // Don't set up activity listeners if AuthContext is handling sessions
  if (window.authContextActive) {
    console.log('Session activity tracking deferred to AuthContext');
    return () => {}; // Return empty cleanup function
  }

  // Handler for user activity
  const handleUserActivity = () => {
    lastActivity = Date.now();
  };

  // Add event listeners for user activity
  activityEvents.forEach((event) => {
    window.addEventListener(event, handleUserActivity, { passive: true });
  });

  // Set up timer to check for session timeout
  sessionTimer = setInterval(() => {
    // Skip timeout check if AuthContext is now active
    if (window.authContextActive) {
      if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
      }
      return;
    }
    
    const now = Date.now();
    const inactiveTime = now - lastActivity;

    // If user has been inactive for longer than the timeout, trigger session timeout
    if (inactiveTime >= SESSION_TIMEOUT) {
      dispatch(sessionTimeout());
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  }, 60000); // Check every minute

  // Return a cleanup function
  return () => {
    // Remove event listeners
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleUserActivity);
    });

    // Clear timer
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  };
};

// Session middleware
export const sessionMiddleware = (store) => {
  let cleanup = null;

  return (next) => (action) => {
    const result = next(action);
    const state = store.getState();

    // If user is authenticated and we don't have activity listeners set up, set them up
    if (state.auth.isAuthenticated && !cleanup && !window.authContextActive) {
      cleanup = setupActivityListeners(store.dispatch);
    }

    // If user is not authenticated and we have activity listeners set up, clean them up
    if ((!state.auth.isAuthenticated || window.authContextActive) && cleanup) {
      cleanup();
      cleanup = null;
    }

    return result;
  };
}; 