import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser, selectAuthInitializing } from '../store/slices/authSlice';
import AuthService from '../services/auth.service';

/**
 * Protected route component that checks authentication and roles
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.element - The component to render if conditions pass
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @param {boolean} props.requireOnboarding - Whether to check if onboarding is completed
 * @returns {JSX.Element} - The protected component or a redirect
 */
const ProtectedRoute = ({ 
  element, 
  allowedRoles = [], 
  requireOnboarding = false,
}) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const isInitializing = useSelector(selectAuthInitializing);
  const location = useLocation();
  const navigate = useNavigate();

  // Effect to check provider verification status
  useEffect(() => {
    // Skip if still initializing
    if (isInitializing) {
      return;
    }
    
    // Only run this check for provider routes when onboarding is complete
    if (user && user.role === 'provider' && (user.onboardingCompleted || user.isProfileCompleted)) {
      // Skip this check if we're already on the verification-pending page
      if (location.pathname === '/provider/verification-pending') {
        return;
      }
      
      // Make a request to a protected endpoint to check if the provider is verified
      const checkVerification = async () => {
        try {
          const response = await fetch('/api/provider/status', {
            headers: {
              'Authorization': `Bearer ${AuthService.getToken()}`
            }
          });
          
          // If response is not ok, check for verification error
          if (!response.ok) {
            const data = await response.json();
            if (response.status === 403 && data.code === 'PROVIDER_NOT_VERIFIED') {
              // If provider is not verified, redirect to verification pending
              navigate('/provider/verification-pending');
            }
          }
        } catch (error) {
          console.error('Error checking provider verification:', error);
        }
      };
      
      checkVerification();
    }
  }, [user, navigate, location.pathname, isInitializing]);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate 
      to="/sign-in" 
      replace 
      state={{ from: location }}
    />;
  }

  // If roles specified and user doesn't have an allowed role, redirect
  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'patient') {
      return <Navigate to="/patient/dashboard" replace />;
    } else if (user?.role === 'provider') {
      return <Navigate to="/provider/dashboard" replace />;
    } else if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    
    // Default fallback
    return <Navigate to="/" replace />;
  }

  // If onboarding is required but not completed, redirect to onboarding
  if (requireOnboarding && user) {
    // Check both onboardingCompleted and isProfileCompleted fields
    const hasCompletedOnboarding = user.onboardingCompleted || user.isProfileCompleted;
    
    if (!hasCompletedOnboarding) {
      if (user.role === 'patient') {
        return <Navigate to="/patient/onboarding" replace />;
      } else if (user.role === 'provider') {
        return <Navigate to="/provider/onboarding" replace />;
      }
    }
    
    // For providers with completed onboarding, check verification status
    if (user.role === 'provider' && hasCompletedOnboarding) {
      // Skip verification check if we're already on the verification-pending page
      if (location.pathname !== '/provider/verification-pending') {
        // Use the isVerified flag from the token first
        const isVerified = user.isVerified === true;
        
        // If not verified, redirect to verification pending
        if (!isVerified) {
          // Make a status check request to verify with backend
          // This is a fallback in case the token data is stale
          return <Navigate to="/provider/verification-pending" replace />;
        }
      }
    }
  }

  // If all checks pass, render the protected component
  return element;
};

export default ProtectedRoute; 