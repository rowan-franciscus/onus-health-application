import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  selectIsAuthenticated, 
  selectUser, 
  selectSessionTimedOut,
  clearSessionTimeout, 
  sessionTimeout,
  logout as logoutAction,
  authSuccess
} from '../store/slices/authSlice';
import AuthService from '../services/auth.service';

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Warning before timeout (3 minutes before)
const WARNING_TIME = 3 * 60 * 1000;

// Create context
const AuthContext = createContext();

/**
 * Authentication context provider
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Context provider
 */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get auth state from Redux
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const sessionTimedOut = useSelector(selectSessionTimedOut);

  // Local state for redirect paths and session management
  const [authRedirectPath, setAuthRedirectPath] = useState('/');
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  
  // Use refs for timers to avoid re-renders
  const sessionTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  
  // Function to reset session timers
  const resetSessionTimers = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Clear existing timers
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    // Set new warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowSessionWarning(true);
    }, SESSION_TIMEOUT - WARNING_TIME);
    
    // Set new session timeout timer
    sessionTimerRef.current = setTimeout(() => {
      dispatch(sessionTimeout());
      setShowSessionWarning(false);
    }, SESSION_TIMEOUT);
    
  }, [dispatch, isAuthenticated]);
  
  // Set up activity listener to reset timers
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Signal that AuthContext is handling session management
    window.authContextActive = true;
    
    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 
      'scroll', 'touchstart', 'click'
    ];
    
    const handleUserActivity = () => {
      if (showSessionWarning) {
        // If warning is showing, continue session
        setShowSessionWarning(false);
        resetSessionTimers();
        
        // Ping the server to keep the session alive
        AuthService.pingSession().catch(error => {
          console.error('Error pinging session:', error);
        });
      } else {
        // Otherwise just reset timers
        resetSessionTimers();
      }
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    // Initialize timers
    resetSessionTimers();
    
    // Clean up
    return () => {
      // Signal that AuthContext is no longer handling session management
      window.authContextActive = false;
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [isAuthenticated, resetSessionTimers, showSessionWarning]);
  
  // Get user data on initial load if authenticated
  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && !user) {
        try {
          // Fetch fresh user data from server instead of using JWT
          const response = await fetch(`${window.location.protocol}//${window.location.host}/api/users/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('onus_auth_token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            dispatch(authSuccess(userData));
          } else {
            // Fallback to JWT data if API call fails
            const currentUser = AuthService.getCurrentUser();
            if (currentUser) {
              dispatch(authSuccess(currentUser));
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
          // Fallback to JWT data
          const currentUser = AuthService.getCurrentUser();
          if (currentUser) {
            dispatch(authSuccess(currentUser));
          }
        }
      }
    };
    
    loadUser();
  }, [dispatch, isAuthenticated]); // Remove user from dependencies to prevent infinite loop
  
  // Handle session timeout
  useEffect(() => {
    if (sessionTimedOut) {
      // Store current path for redirect after re-authentication
      const currentPath = window.location.pathname;
      
      // Don't store login or register pages as redirect targets
      if (!currentPath.includes('/sign-in') && !currentPath.includes('/sign-up')) {
        setAuthRedirectPath(currentPath);
        localStorage.setItem('authRedirectPath', currentPath);
      }
      
      // Redirect to login with timeout message
      navigate('/sign-in?timeout=true');
      
      // Clear the timeout flag
      dispatch(clearSessionTimeout());
    }
  }, [sessionTimedOut, navigate, dispatch]);

  // Continue session and hide warning
  const continueSession = useCallback(() => {
    setShowSessionWarning(false);
    resetSessionTimers();
    
    // Ping the server to keep the session alive
    AuthService.pingSession().catch(error => {
      console.error('Error pinging session:', error);
    });
  }, [resetSessionTimers]);
  
  // Logout function
  const logout = useCallback(() => {
    // Clear timers
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    
    setShowSessionWarning(false);
    AuthService.logout();
    dispatch(logoutAction());
    navigate('/sign-in');
  }, [dispatch, navigate]);

  // Context value
  const contextValue = {
    isAuthenticated,
    user,
    authRedirectPath,
    setAuthRedirectPath,
    logout,
    showSessionWarning,
    continueSession,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use the auth context
 * @returns {Object} - Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 