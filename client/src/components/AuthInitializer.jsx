import React from 'react';
import { useSelector } from 'react-redux';
import { selectAuthInitializing } from '../store/slices/authSlice';

/**
 * AuthInitializer component that shows a loading state while authentication is being initialized
 * This prevents the flash of sign-in page during refresh
 */
const AuthInitializer = ({ children }) => {
  const isInitializing = useSelector(selectAuthInitializing);

  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          <p style={{
            color: '#6c757d',
            fontSize: '16px',
            margin: 0
          }}>Loading...</p>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthInitializer;
