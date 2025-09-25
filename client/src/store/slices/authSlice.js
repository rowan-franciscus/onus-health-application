import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import jwt_decode from 'jwt-decode';
import config from '../../config';
import AuthService from '../../services/auth.service';

// Helper function to get token from localStorage and validate session
const getStoredToken = () => {
  const token = localStorage.getItem(config.tokenKey);
  if (!token) return null;
  
  try {
    // Decode token to check session timeout
    const decoded = jwt_decode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (decoded.exp < currentTime) {
      // Token is expired, clear it
      AuthService.logout();
      return null;
    }
    
    // Check session timeout (30 minutes)
    const tokenIssueTime = decoded.iat;
    const minutesSinceIssue = Math.floor((currentTime - tokenIssueTime) / 60);
    const sessionTimeoutMinutes = Math.floor((config.sessionTimeout || 1800000) / 60000); // Convert ms to minutes
    
    if (minutesSinceIssue >= sessionTimeoutMinutes) {
      // Session has timed out
      console.log('Session timed out on app initialization');
      AuthService.logout();
      return null;
    }
    
    return token;
  } catch (error) {
    // Invalid token
    console.error('Invalid token:', error);
    AuthService.logout();
    return null;
  }
};

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(credentials);
      if (response.success) {
        // Return the user data from response which includes profileImage
        return response.user;
      }
      return rejectWithValue(response.message || 'Login failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await AuthService.adminLogin(credentials);
      if (response.success) {
        // Return the user data from response which includes profileImage
        return response.user;
      }
      return rejectWithValue(response.message || 'Admin login failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Admin login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await AuthService.register(userData);
      if (response.success) {
        return response;
      }
      return rejectWithValue(response.message || 'Registration failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const socialAuth = createAsyncThunk(
  'auth/socialAuth',
  async ({ provider, role }, { rejectWithValue }) => {
    try {
      const response = await AuthService.socialAuth(provider, role);
      if (response.success && response.authUrl) {
        // Redirect to auth URL
        window.location.href = response.authUrl;
        return null;
      }
      return rejectWithValue('Social authentication failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Social authentication failed');
    }
  }
);

export const processSocialCallback = createAsyncThunk(
  'auth/processSocialCallback',
  async ({ provider, queryParams }, { rejectWithValue }) => {
    try {
      const response = await AuthService.processSocialCallback(provider, queryParams);
      if (response.success) {
        // Return the user data from response which includes profileImage
        return response.user;
      }
      return rejectWithValue(response.message || 'Social login callback failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Social login callback failed');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await AuthService.verifyEmail(token);
      if (response.success) {
        return response;
      }
      return rejectWithValue(response.message || 'Email verification failed');
    } catch (error) {
      return rejectWithValue(error.message || 'Email verification failed');
    }
  }
);

export const resendVerificationEmail = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (email, { rejectWithValue }) => {
    try {
      const response = await AuthService.resendVerificationEmail({ email });
      if (response.success) {
        return response;
      }
      return rejectWithValue(response.message || 'Failed to resend verification email');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to resend verification email');
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email, { rejectWithValue }) => {
    try {
      const response = await AuthService.requestPasswordReset({ email });
      if (response.success) {
        return response;
      }
      return rejectWithValue(response.message || 'Failed to request password reset');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to request password reset');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await AuthService.resetPassword({ token, newPassword });
      if (response.success) {
        return response;
      }
      return rejectWithValue(response.message || 'Failed to reset password');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to reset password');
    }
  }
);

// Initial state
const initialState = {
  isAuthenticated: !!getStoredToken(),
  user: null,
  loading: false,
  error: null,
  sessionTimedOut: false,
  registrationSuccess: false,
  emailVerified: false,
  passwordResetRequested: false,
  passwordResetSuccess: false,
};

// Log initial state for debugging
console.log('Auth initial state:', {
  ...initialState,
  token: getStoredToken() ? 'Token exists' : 'No token',
});

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      state.sessionTimedOut = false;
    },
    authFail: (state, action) => {
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.sessionTimedOut = false;
      state.registrationSuccess = false;
      state.emailVerified = false;
      state.passwordResetRequested = false;
      state.passwordResetSuccess = false;
      // The actual localStorage clearing is done in AuthService.logout()
      AuthService.logout();
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    sessionTimeout: (state) => {
      state.sessionTimedOut = true;
      state.isAuthenticated = false;
      state.user = null;
      // Clear tokens on timeout
      AuthService.logout();
    },
    clearSessionTimeout: (state) => {
      state.sessionTimedOut = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearRegistrationSuccess: (state) => {
      state.registrationSuccess = false;
    },
    clearEmailVerified: (state) => {
      state.emailVerified = false;
    },
    clearPasswordResetRequested: (state) => {
      state.passwordResetRequested = false;
    },
    clearPasswordResetSuccess: (state) => {
      state.passwordResetSuccess = false;
    },
    // Mark onboarding as completed
    markOnboardingCompleted: (state) => {
      if (state.user) {
        state.user.onboardingCompleted = true;
        state.user.isProfileCompleted = true;
      }
    },
    // Reset the entire auth state
    resetAuthState: (state) => {
      // First clear local storage
      localStorage.removeItem(config.tokenKey);
      localStorage.removeItem(config.refreshTokenKey);
      localStorage.removeItem('lastLoginTime');
      
      // Then reset the state
      return {
        ...initialState,
        isAuthenticated: false, // Explicitly set to false regardless of token
        user: null,             // Explicitly reset user
      };
    },
    // Reset just the loading state
    resetAuthLoading: (state) => {
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login admin
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registrationSuccess = false;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
        state.registrationSuccess = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Social authentication
    builder
      .addCase(socialAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(socialAuth.fulfilled, (state) => {
        // We don't modify state here because we're redirecting
        state.loading = false;
      })
      .addCase(socialAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Process social callback
    builder
      .addCase(processSocialCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(processSocialCallback.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(processSocialCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Verify email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.emailVerified = false;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.loading = false;
        state.emailVerified = true;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Resend verification email
    builder
      .addCase(resendVerificationEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Request password reset
    builder
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordResetRequested = false;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading = false;
        state.passwordResetRequested = true;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordResetSuccess = false;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.passwordResetSuccess = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  authStart,
  authSuccess,
  authFail,
  logout,
  updateUser,
  sessionTimeout,
  clearSessionTimeout,
  clearAuthError,
  clearRegistrationSuccess,
  clearEmailVerified,
  clearPasswordResetRequested,
  clearPasswordResetSuccess,
  resetAuthState,
  resetAuthLoading,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectSessionTimedOut = (state) => state.auth.sessionTimedOut;
export const selectRegistrationSuccess = (state) => state.auth.registrationSuccess;
export const selectEmailVerified = (state) => state.auth.emailVerified;
export const selectPasswordResetRequested = (state) => state.auth.passwordResetRequested;
export const selectPasswordResetSuccess = (state) => state.auth.passwordResetSuccess;

// Export reducer
export default authSlice.reducer; 