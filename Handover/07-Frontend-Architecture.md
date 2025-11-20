# 7. Frontend Architecture (React)

This document explains the frontend architecture of the Onus Health Application, built with React 18 and following a component-based architecture with Redux state management.

---

## Architecture Overview

**Framework**: React 18.2.0  
**Build Tool**: Create React App (CRA) 5.0.1  
**Routing**: React Router v6.20.0  
**State Management**: Redux Toolkit (@reduxjs/toolkit 2.0.1)  
**HTTP Client**: Axios 1.6.2  
**Styling**: CSS Modules  
**Forms**: Formik 2.4.5 + Yup 1.3.2  
**UI Notifications**: React Toastify 9.1.3

---

## Entry Points

### Main Entry Point: `client/src/index.js`

**Purpose**: Bootstraps the React application with providers and global configuration.

**Key Elements**:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import store from './store';
import { injectStore } from './store/middleware/apiMiddleware';
import './styles/globals.css';

// Inject store into API middleware
injectStore(store);

// Expose utilities for debugging (development only)
window.clearAuthState = clearAuthState;
window.checkLocalStorage = () => {
  console.log('Auth token:', localStorage.getItem('onus_auth_token') ? 'exists' : 'missing');
  console.log('Refresh token:', localStorage.getItem('onus_refresh_token') ? 'exists' : 'missing');
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <ToastContainer position="top-right" autoClose={5000} />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
```

**Provider Hierarchy**:
1. **React.StrictMode** - Highlights potential problems in development
2. **Redux Provider** - Makes Redux store available to all components
3. **BrowserRouter** - Enables client-side routing
4. **App** - Root application component
5. **ToastContainer** - Global toast notification container

**Debug Tools** (development only):
- `window.clearAuthState()` - Clear authentication state
- `window.checkLocalStorage()` - Check token existence

---

### Application Root: `client/src/App.js`

**Purpose**: Defines routing structure, auth initialization, and lazy-loaded pages.

**Key Features**:
- Lazy-loaded page components (React.lazy + Suspense)
- Protected route guards with role-based access control
- Auth initialization on mount
- Session timeout monitoring
- Loading fallback with diagnostic information

**Structure Overview**:

```javascript
function App() {
  return (
    <>
      <AuthInitializer />  {/* Restore auth state from localStorage */}
      <SessionTimeout />   {/* Monitor session timeout */}
      
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          
          {/* Protected patient routes */}
          <Route path="/patient/*" element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="dashboard" element={<PatientDashboard />} />
            {/* ... more patient routes */}
          </Route>
          
          {/* Protected provider routes */}
          <Route path="/provider/*" element={<ProtectedRoute allowedRoles={['provider']} />}>
            <Route path="dashboard" element={<ProviderDashboard />} />
            {/* ... more provider routes */}
          </Route>
          
          {/* Protected admin routes */}
          <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            {/* ... more admin routes */}
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
```

**See**: `client/src/App.js` (lines 1-636) for complete routing configuration.

---

## Folder Structure

```
client/src/
├── index.js                  # Application entry point
├── App.js                    # Root component with routing
├── components/               # Reusable UI components (114 files)
│   ├── common/               # Generic reusable components (16 components)
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Table/
│   │   ├── Modal/
│   │   ├── Pagination/
│   │   ├── SearchBox/
│   │   ├── LoadingSpinner/
│   │   └── ... (8 more)
│   ├── forms/                # Form-specific components
│   │   ├── ConsultationForm/ # 8-tab consultation form
│   │   ├── MultiStepForm/    # Onboarding multi-step form
│   │   ├── FileUpload/
│   │   ├── Checkbox/
│   │   └── Radio/
│   ├── layouts/              # Layout wrappers (28 files)
│   │   ├── AuthLayout/       # Layout for sign-in/sign-up pages
│   │   ├── DashboardLayout/  # Layout for authenticated pages
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   └── ... (5 more)
│   ├── medical-records/      # Medical record display components
│   ├── patient/              # Patient-specific components
│   ├── AuthInitializer.jsx   # Restore auth on mount
│   ├── ProtectedRoute.jsx    # Route guard component
│   └── SessionTimeout/       # Session timeout modal
├── pages/                    # Page-level components (115 files)
│   ├── auth/                 # Authentication pages (9 files)
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   ├── AdminSignIn.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   └── VerifyEmail.jsx
│   ├── patient/              # Patient pages (45 files)
│   │   ├── Dashboard.jsx
│   │   ├── Consultations.jsx
│   │   ├── Onboarding.jsx
│   │   ├── medical-records/  # 7 medical record type pages
│   │   ├── Profile.jsx
│   │   └── Settings.jsx
│   ├── provider/             # Provider pages (34 files)
│   │   ├── Dashboard.jsx
│   │   ├── Patients.jsx
│   │   ├── AddConsultation.jsx
│   │   ├── Onboarding.jsx
│   │   └── ... (30 more)
│   ├── admin/                # Admin pages (20 files)
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── HealthProviders.jsx
│   │   └── ... (17 more)
│   └── shared/               # Shared pages (5 files)
│       ├── NotFound.jsx
│       └── Help.jsx
├── services/                 # API service layer (12 files)
│   ├── api.service.js        # Base API service with HTTP methods
│   ├── auth.service.js       # Authentication API calls
│   ├── consultation.service.js
│   ├── connection.service.js
│   ├── medicalRecord.service.js
│   ├── admin.service.js
│   └── ... (6 more)
├── store/                    # Redux store (5 files)
│   ├── index.js              # Store configuration
│   ├── slices/               # Redux slices
│   │   └── authSlice.js      # Auth state management
│   └── middleware/           # Custom middleware
│       ├── apiMiddleware.js  # Axios interceptors, token refresh
│       └── sessionMiddleware.js  # Session timeout monitoring
├── contexts/                 # React Context (1 file, legacy)
│   └── AuthContext.js        # Auth context (superseded by Redux)
├── hooks/                    # Custom React hooks (1 file)
│   └── useForm.js            # Form state management hook
├── utils/                    # Utility functions (5 files)
│   ├── dateUtils.js          # Date formatting helpers
│   ├── validation.js         # Validation utilities
│   ├── initials.js           # Generate user initials for avatars
│   ├── consultationExport.js # Export consultations to PDF
│   └── debugTools.js         # Development debugging utilities
├── config/                   # Configuration (2 files)
│   ├── constants.js          # Application constants (roles, timeouts, etc.)
│   └── index.js              # Environment-based config
├── styles/                   # Global styles (2 files)
│   ├── globals.css           # Global CSS
│   └── global.css            # Additional global styles (duplicate?)
└── assets/                   # Static assets (39 files)
    ├── fonts/                # DM Sans font files (.ttf)
    ├── icons/                # SVG icons (30 files)
    ├── images/               # Hero images
    ├── logos/                # Onus branding
    └── patterns/             # Background patterns
```

---

## Routing

### Routing Configuration

**Router**: React Router v6 (declarative, nested routes)  
**File**: `client/src/App.js` (lines 150-636)

**Route Structure**:

```
/
├── /sign-in                           # Public: Sign in page
├── /sign-up                           # Public: Sign up page
├── /admin/sign-in                     # Public: Admin sign in
├── /forgot-password                   # Public: Password reset request
├── /reset-password                    # Public: Password reset with token
├── /verify-email/:token               # Public: Email verification
├── /patient/*                         # Protected: Patient routes
│   ├── /dashboard                     # Patient dashboard
│   ├── /onboarding                    # Patient onboarding (8 steps)
│   ├── /consultations                 # List consultations
│   ├── /consultations/:id             # View consultation
│   ├── /medical-records               # Medical records hub
│   │   ├── /vitals                    # Vitals records
│   │   ├── /medications               # Medications
│   │   ├── /immunizations             # Immunizations
│   │   ├── /lab-results               # Lab results
│   │   ├── /radiology-reports         # Radiology reports
│   │   ├── /hospital                  # Hospital records
│   │   └── /surgery                   # Surgery records
│   ├── /connections                   # Provider connections
│   ├── /profile                       # User profile
│   └── /settings                      # Settings
├── /provider/*                        # Protected: Provider routes
│   ├── /dashboard                     # Provider dashboard
│   ├── /onboarding                    # Provider onboarding (7 steps)
│   ├── /verification-pending          # Waiting for admin verification
│   ├── /patients                      # List patients
│   ├── /patients/:id                  # View patient
│   ├── /add-patient                   # Add patient by email
│   ├── /consultations                 # List consultations
│   ├── /add-consultation              # Create consultation (8 tabs)
│   ├── /consultations/:id             # View consultation
│   ├── /medical-records               # Medical records (all patients)
│   ├── /profile                       # Provider profile
│   └── /settings                      # Settings
├── /admin/*                           # Protected: Admin routes
│   ├── /dashboard                     # Admin dashboard with analytics
│   ├── /users                         # All users list
│   ├── /health-providers              # Provider list
│   ├── /health-providers/:id          # View provider
│   ├── /health-providers/:id/request  # View verification request
│   ├── /patients                      # Patient list
│   ├── /patients/:id                  # View patient
│   ├── /patients/:id/edit             # Edit patient
│   └── /settings                      # Admin settings
├── /help                              # Public: Help page
└── *                                  # Not Found (404)
```

---

### Public vs. Protected Routes

#### Public Routes (No Authentication Required)

- `/sign-in`, `/sign-up`, `/admin/sign-in`
- `/forgot-password`, `/reset-password`
- `/verify-email/:token`
- `/help`

**Implementation**: No middleware, directly accessible.

---

#### Protected Routes (Authentication Required)

**Implementation**: `<ProtectedRoute>` component wraps routes requiring authentication.

**File**: `client/src/components/ProtectedRoute.jsx`

**Features**:
1. Check if user is authenticated
2. Check if user has required role(s)
3. Check if onboarding is completed (if required)
4. Check provider verification status (if provider)
5. Redirect to appropriate page if checks fail

**Example Usage**:

```javascript
<Route 
  path="/patient/dashboard" 
  element={
    <ProtectedRoute 
      element={<PatientDashboard />}
      allowedRoles={['patient']}
      requireOnboarding={true}
    />
  } 
/>
```

**Redirect Logic**:

| Scenario | Redirect To |
|----------|-------------|
| Not authenticated | `/sign-in` (with state: from location) |
| Wrong role (patient tries admin route) | Role-specific dashboard |
| Onboarding not completed | Role-specific onboarding page |
| Provider not verified | `/provider/verification-pending` |

---

### Role-Based Route Guards

**Middleware**: `ProtectedRoute` component (lines 16-124)

**Role Checking**:

```javascript
if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
  // Redirect to appropriate dashboard based on role
  if (user?.role === 'patient') {
    return <Navigate to="/patient/dashboard" replace />;
  } else if (user?.role === 'provider') {
    return <Navigate to="/provider/dashboard" replace />;
  } else if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
}
```

**Onboarding Check**:

```javascript
if (requireOnboarding && user) {
  const hasCompletedOnboarding = user.onboardingCompleted || user.isProfileCompleted;
  
  if (!hasCompletedOnboarding) {
    if (user.role === 'patient') {
      return <Navigate to="/patient/onboarding" replace />;
    } else if (user.role === 'provider') {
      return <Navigate to="/provider/onboarding" replace />;
    }
  }
}
```

**Provider Verification Check** (lines 106-119):

```javascript
if (user.role === 'provider' && hasCompletedOnboarding) {
  const isVerified = user.isVerified === true;
  
  if (!isVerified && location.pathname !== '/provider/verification-pending') {
    return <Navigate to="/provider/verification-pending" replace />;
  }
}
```

---

### Lazy Loading & Code Splitting

**Pattern**: React.lazy() + Suspense

**Implementation** (in `App.js`):

```javascript
// Lazy-loaded pages
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard'));
// ... all pages are lazy-loaded

<Suspense fallback={<LoadingFallback />}>
  <Routes>
    {/* ... routes */}
  </Routes>
</Suspense>
```

**Benefits**:
- Reduces initial bundle size
- Loads page components only when needed
- Improves initial page load time

**Loading Fallback** (lines 81-150):
- Shows "Loading Application..." message
- Displays elapsed time
- Shows troubleshooting tips after 10 seconds
- Logs diagnostic info after 5 seconds (development)

---

## State Management

### Redux Store Configuration

**File**: `client/src/store/index.js`

**Store Structure**:

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiMiddleware } from './middleware/apiMiddleware';
import { sessionMiddleware } from './middleware/sessionMiddleware';

const store = configureStore({
  reducer: {
    auth: authReducer,
    // Additional reducers can be added here
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .concat(apiMiddleware)
    .concat(sessionMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});
```

**Middleware Pipeline**:
1. Default middleware (thunk, serializableCheck, immutableCheck)
2. **apiMiddleware** - Axios interceptors, automatic token refresh
3. **sessionMiddleware** - Session timeout monitoring

---

### Auth State Slice

**File**: `client/src/store/slices/authSlice.js`

**State Shape**:

```javascript
{
  auth: {
    user: {
      id: string,
      email: string,
      firstName: string,
      lastName: string,
      role: 'patient' | 'provider' | 'admin',
      isProfileCompleted: boolean,
      onboardingCompleted: boolean,
      isEmailVerified: boolean,
      isVerified: boolean, // For providers only
      profileImage: string | null
    } | null,
    isAuthenticated: boolean,
    isInitializing: boolean,
    loading: false,
    error: null,
    sessionTimeoutWarning: boolean
  }
}
```

**Selectors** (lines 400-407):

```javascript
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthInitializing = (state) => state.auth.isInitializing;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectSessionTimeoutWarning = (state) => state.auth.sessionTimeoutWarning;
```

**Usage in Components**:

```javascript
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../store/slices/authSlice';

function MyComponent() {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  return <div>Hello, {user?.firstName}!</div>;
}
```

---

### Async Actions (Thunks)

**Defined in**: `client/src/store/slices/authSlice.js` (lines 45-150)

**Available Actions**:

| Action | Purpose | API Call |
|--------|---------|----------|
| `loginUser` | Regular login | `POST /api/auth/login` |
| `loginAdmin` | Admin login | `POST /api/auth/admin/login` |
| `registerUser` | Registration | `POST /api/auth/register` |
| `socialAuth` | Initiate OAuth | Redirects to OAuth provider |
| `processSocialCallback` | Handle OAuth callback | `POST /api/auth/social-callback` |
| `verifyEmail` | Email verification | `POST /api/auth/verify-email` |
| `resendVerificationEmail` | Resend verification | `POST /api/auth/resend-verification` |

**Usage Example**:

```javascript
import { useDispatch } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';

function SignIn() {
  const dispatch = useDispatch();
  
  const handleSubmit = async (values) => {
    const result = await dispatch(loginUser(values));
    
    if (loginUser.fulfilled.match(result)) {
      // Success - navigate to dashboard
      navigate('/patient/dashboard');
    } else {
      // Error - show toast
      toast.error(result.payload);
    }
  };
}
```

---

### State Persistence

**Token Storage**: localStorage (not Redux persist)

**Keys**:
- `onus_auth_token` - JWT access token (7 days)
- `onus_refresh_token` - JWT refresh token (30 days)

**Auth Initialization Flow**:

1. App loads → `<AuthInitializer />` component mounts
2. Read tokens from localStorage
3. Decode access token, extract user data
4. Check token expiration and session timeout
5. Dispatch `initializeAuth` action to populate Redux state
6. If token expired/invalid, clear auth state

**File**: `client/src/components/AuthInitializer.jsx`

**Token Validation** (in `authSlice.js` lines 7-42):

```javascript
const getStoredToken = () => {
  const token = localStorage.getItem(config.tokenKey);
  if (!token) return null;
  
  try {
    const decoded = jwt_decode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (decoded.exp < currentTime) {
      AuthService.logout();
      return null;
    }
    
    // Check session timeout (30 minutes)
    const tokenIssueTime = decoded.iat;
    const minutesSinceIssue = Math.floor((currentTime - tokenIssueTime) / 60);
    const sessionTimeoutMinutes = Math.floor((config.sessionTimeout || 1800000) / 60000);
    
    if (minutesSinceIssue >= sessionTimeoutMinutes) {
      AuthService.logout();
      return null;
    }
    
    return token;
  } catch (error) {
    AuthService.logout();
    return null;
  }
};
```

---

## API Interaction

### API Client (Axios)

**File**: `client/src/store/middleware/apiMiddleware.js`

**Axios Instance Configuration**:

```javascript
export const api = axios.create({
  baseURL: config.apiUrl,  // http://localhost:5001/api (dev) or production URL
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000,  // 15 seconds
  withCredentials: false
});
```

**Base URL Resolution**:
- **Development**: `http://localhost:5001/api` (proxied via CRA proxy)
- **Production**: `${window.location.protocol}//${window.location.host}/api`

**See**: `client/src/config/index.js` for environment-based configuration.

---

### Request Interceptors

**Token Injection** (lines 43-58):

```javascript
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('onus_auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding Authorization header with token');
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);
```

**Effect**: Every API request automatically includes JWT token in Authorization header.

---

### Response Interceptors

**File**: `client/src/store/middleware/apiMiddleware.js` (lines 61-211)

**Error Handling Flow**:

```
API Error
    ↓
Session Timeout (401 + code: SESSION_TIMEOUT)?
    ↓ YES → Dispatch sessionTimeout() → Show session timeout modal
    ↓ NO
Token Expired (401)?
    ↓ YES → Attempt token refresh
    │         ↓ SUCCESS → Retry original request
    │         ↓ FAIL → Logout user, redirect to /sign-in
    ↓ NO
ECONNREFUSED (dev)?
    ↓ YES → Retry with exponential backoff (max 3 attempts)
    ↓ NO
Other Error
    ↓
Return error with user-friendly message
```

**Token Refresh Logic** (lines 140-187):

```javascript
if (error.response && error.response.status === 401 && !originalRequest._hasTriedRefresh) {
  originalRequest._hasTriedRefresh = true;
  
  try {
    const refreshToken = localStorage.getItem(config.refreshTokenKey);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Try to refresh the token
    const response = await axios.post(`${config.apiUrl}/auth/refresh-token`, {
      refreshToken,
    });
    
    if (response.data.success && response.data.tokens) {
      // Store new tokens
      localStorage.setItem(config.tokenKey, response.data.tokens.authToken);
      localStorage.setItem(config.refreshTokenKey, response.data.tokens.refreshToken);
      
      // Update authorization header and retry request
      originalRequest.headers.Authorization = `Bearer ${response.data.tokens.authToken}`;
      return api(originalRequest);
    } else {
      // Force logout
      storeRef.dispatch(logout());
      throw new Error('Token refresh failed');
    }
  } catch (refreshError) {
    storeRef.dispatch(logout());
    return Promise.reject(refreshError);
  }
}
```

**Benefits**:
- Automatic token refresh on expiration
- Seamless user experience (no re-login required)
- Single retry per request (prevents infinite loops)

---

### API Service Layer

**Base Service**: `client/src/services/api.service.js`

**Pattern**: Static class with HTTP method wrappers

**Available Methods**:

| Method | Purpose | Usage |
|--------|---------|-------|
| `get(url, params, options)` | GET request | Fetch data |
| `post(url, data, options)` | POST request | Create resource |
| `put(url, data, options)` | PUT request | Update resource (replace) |
| `patch(url, data, options)` | PATCH request | Update resource (partial) |
| `delete(url, options)` | DELETE request | Delete resource |
| `upload(url, formData, onProgress)` | File upload | Upload with progress |
| `download(url, params, onProgress)` | File download | Download with progress |

**Example Usage**:

```javascript
import ApiService from '../services/api.service';

// GET request
const consultations = await ApiService.get('/consultations', { page: 1, limit: 20 });

// POST request
const newConsultation = await ApiService.post('/consultations', consultationData);

// File upload with progress
await ApiService.upload('/files/upload', formData, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});
```

---

### Domain-Specific Services

**Pattern**: Service files organized by domain

**Structure**:

```
services/
├── api.service.js             # Base HTTP methods
├── auth.service.js            # Authentication (login, register, verify)
├── consultation.service.js    # Consultation CRUD
├── connection.service.js      # Patient-provider connections
├── medicalRecord.service.js   # Medical records
├── medicalRecords.service.js  # Record-type-specific APIs
├── patient.service.js         # Patient operations
├── patientDashboard.service.js # Patient dashboard data
├── userProfile.service.js     # User profile CRUD
├── userSettings.service.js    # Settings management
├── admin.service.js           # Admin operations
└── file.service.js            # File upload/download
```

**Example Service** (`auth.service.js`):

```javascript
import ApiService from './api.service';

class AuthService {
  static async login(credentials) {
    const response = await ApiService.post('/auth/login', credentials);
    
    if (response.tokens) {
      this.setTokens(response.tokens);
    }
    
    return response;
  }
  
  static setTokens(tokens) {
    localStorage.setItem('onus_auth_token', tokens.authToken);
    localStorage.setItem('onus_refresh_token', tokens.refreshToken);
  }
  
  static getToken() {
    return localStorage.getItem('onus_auth_token');
  }
  
  static logout() {
    localStorage.removeItem('onus_auth_token');
    localStorage.removeItem('onus_refresh_token');
  }
}
```

---

## Forms & Validation

### Form Libraries

**Primary**: Formik 2.4.5  
**Validation**: Yup 1.3.2

---

### Form Patterns

#### 1. Simple Forms (Formik)

**Example**: Login form

```javascript
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required')
});

function SignIn() {
  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await dispatch(loginUser(values));
      navigate('/patient/dashboard');
    } catch (error) {
      toast.error(error.message);
    }
    setSubmitting(false);
  };
  
  return (
    <Formik
      initialValues={{ email: '', password: '' }}
      validationSchema={loginSchema}
      onSubmit={handleSubmit}
    >
      {({ errors, touched }) => (
        <Form>
          <Field name="email" type="email" />
          {errors.email && touched.email && <div>{errors.email}</div>}
          
          <Field name="password" type="password" />
          {errors.password && touched.password && <div>{errors.password}</div>}
          
          <button type="submit">Sign In</button>
        </Form>
      )}
    </Formik>
  );
}
```

---

#### 2. Multi-Step Forms

**Component**: `client/src/components/forms/MultiStepForm/`

**Used For**:
- Patient onboarding (8 steps)
- Provider onboarding (7 steps)

**Features**:
- Step navigation (Next/Previous)
- Progress indicator
- Step validation
- Data persistence between steps
- Review step before submission

**Structure**:

```javascript
<MultiStepForm
  steps={[
    { title: 'Personal Info', component: <Step1 /> },
    { title: 'Health Insurance', component: <Step2 /> },
    // ... more steps
  ]}
  onSubmit={handleFinalSubmit}
  initialValues={initialData}
/>
```

---

#### 3. Complex Forms (Consultation Form)

**Component**: `client/src/components/forms/ConsultationForm/`

**Features**:
- 8 tabs (General, Vitals, Medications, Immunizations, Lab Results, Radiology, Hospital, Surgery)
- Tab switching with data persistence
- Draft saving
- File attachment support
- Dynamic field arrays (medications, immunizations, etc.)

**Structure**:

```javascript
<ConsultationForm
  patientEmail={patientEmail}
  onSubmit={handleSubmit}
  onSaveDraft={handleSaveDraft}
  initialValues={draftData}
/>
```

**Tab Components**:
- `GeneralTab.jsx` - Date, specialist, reason for visit
- `VitalsTab.jsx` - Heart rate, BP, BMI, etc.
- `MedicationsTab.jsx` - Dynamic medication fields
- `ImmunizationsTab.jsx` - Dynamic immunization fields
- `LabResultsTab.jsx` - Lab test results
- `RadiologyTab.jsx` - Radiology reports
- `HospitalTab.jsx` - Hospital admissions
- `SurgeryTab.jsx` - Surgery records

---

### Validation Schemas

**Location**: Typically defined inline in form components or in `utils/validation.js`

**Example** (Patient Onboarding):

```javascript
const step1Schema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  dateOfBirth: Yup.date().required('Date of birth is required'),
  gender: Yup.string().oneOf(['male', 'female', 'other']).required('Gender is required'),
  phone: Yup.string().matches(/^\d{10}$/, 'Phone must be 10 digits'),
  address: Yup.object().shape({
    street: Yup.string().required('Street is required'),
    city: Yup.string().required('City is required'),
    postalCode: Yup.string().required('Postal code is required')
  })
});
```

**Common Validators**:
- `.required()` - Required field
- `.email()` - Email format
- `.min(n)` / `.max(n)` - String length
- `.oneOf([...])` - Enum values
- `.matches(regex)` - Regex pattern
- `.test(name, message, fn)` - Custom validation

---

## Styling System

### CSS Modules

**Pattern**: Component-scoped CSS with `.module.css` extension

**Benefits**:
- Scoped styles (no global conflicts)
- Explicit dependencies (import styles)
- Type-safe class names (with IDE support)

**File Naming**: `ComponentName.module.css`

**Example**:

```jsx
// Button.jsx
import styles from './Button.module.css';

function Button({ variant, children }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  );
}
```

```css
/* Button.module.css */
.button {
  padding: 10px 20px;
  border-radius: 4px;
  font-family: 'DM Sans', sans-serif;
}

.button.primary {
  background-color: #007bff;
  color: white;
}

.button.secondary {
  background-color: #6c757d;
  color: white;
}
```

**Generated Class Names**: `.Button_button__abc123` (hashed to ensure uniqueness)

---

### Global Styles

**File**: `client/src/styles/globals.css`

**Contains**:
- CSS reset/normalize
- Root CSS variables (colors, fonts, spacing)
- Global element styles (body, headings, links)
- DM Sans font face declarations

**Typography**: DM Sans (locally hosted)
- **Files**: `client/src/assets/fonts/DMSans-*.ttf`
- **Weights**: Variable font (supports all weights)

**Color Palette** (from context):
- Primary: `#007bff` (blue)
- Secondary: `#6c757d` (gray)
- Success: `#28a745` (green)
- Danger: `#dc3545` (red)
- Warning: `#ffc107` (yellow)
- Info: `#17a2b8` (teal)

---

### Layout Dimensions

**From context** (designed at 1400x800px):
- **Sidebar**: 250px fixed width
- **Main Content**: 1150px max width
- **Dashboard Layout**: Sidebar (250px) + Main (remaining width)

**Responsive**: From context, this is a **desktop-first** application. Mobile responsiveness may be limited or not fully implemented.

---

## Component Architecture

### Component Categories

#### 1. Presentational Components (`components/common/`)

**Purpose**: Reusable, stateless UI components

**Examples**:
- **Button** - Button with variants (primary, secondary, danger)
- **Input** - Text input with validation display
- **Card** - Container with shadow and padding
- **Table** - Data table with sorting
- **Modal** - Overlay modal dialog
- **Pagination** - Page navigation
- **SearchBox** - Search input with debouncing
- **LoadingSpinner** - Loading indicator

**Pattern**:
```javascript
// Stateless, props-driven
function Button({ variant = 'primary', onClick, disabled, children }) {
  return (
    <button 
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

---

#### 2. Container Components (`pages/`)

**Purpose**: Page-level components with business logic

**Pattern**:
- Fetch data (useEffect + API service)
- Manage local state (useState)
- Handle user actions
- Render presentational components

**Example**:
```javascript
function PatientDashboard() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useSelector(selectUser);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      const data = await PatientDashboardService.getDashboardData();
      setConsultations(data.consultations);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <DashboardLayout>
      <h1>Welcome, {user.firstName}!</h1>
      <ConsultationList consultations={consultations} />
    </DashboardLayout>
  );
}
```

---

#### 3. Layout Components (`components/layouts/`)

**Purpose**: Wrap pages with consistent layout structure

**Available Layouts**:

| Layout | Purpose | Structure |
|--------|---------|-----------|
| **AuthLayout** | Sign-in/sign-up pages | Centered form with hero image |
| **DashboardLayout** | Authenticated pages | Sidebar + Header + Main content |
| **MainLayout** | General wrapper | Header + Main content (no sidebar) |

**Example** (`DashboardLayout`):

```javascript
function DashboardLayout({ children, role }) {
  return (
    <div className={styles.layout}>
      <Sidebar role={role} />  {/* 250px fixed */}
      <div className={styles.mainContainer}>
        <Header />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

#### 4. Form Components (`components/forms/`)

**Purpose**: Complex form logic and UI

**Pattern**:
- Formik for form state
- Yup for validation
- Custom components for special inputs

**Examples**:
- **ConsultationForm** - 8-tab consultation entry
- **MultiStepForm** - Wizard-style multi-step form
- **FileUpload** - Drag-and-drop file upload with preview

---

### Component Reusability

**Best Practices** (observed in codebase):
1. **Composition over inheritance** - Combine small components
2. **Props for customization** - Avoid hardcoded values
3. **CSS Modules for scoping** - Prevent style conflicts
4. **Index exports** - Clean imports (`import { Button } from '../components/common'`)

**Example Structure**:
```
Button/
├── Button.jsx           # Component implementation
├── Button.module.css    # Scoped styles
└── index.js             # Export (export { default } from './Button')
```

---

## Performance Optimizations

### Implemented Optimizations

1. **Lazy Loading** - All page components lazy-loaded with React.lazy()
2. **Code Splitting** - Automatic via CRA + lazy loading
3. **Memoization** - React.memo() for expensive components (likely used, not explicitly verified)
4. **Debouncing** - Search inputs debounced (in SearchBox component)
5. **Pagination** - Large lists paginated (limit server load and render time)
6. **Axios Interceptors** - Single global error handling (reduces boilerplate)

---

### Suggested Optimizations (Not Implemented)

From context, these could improve performance:

1. **useMemo** / **useCallback** - Prevent unnecessary re-renders
2. **Virtual Scrolling** - For very long lists (e.g., consultation history)
3. **Image Optimization** - Lazy load images, use WebP format
4. **Service Worker** - Offline support, caching
5. **React Query** - Cache API responses, reduce redundant requests

---

## Key Frontend Patterns

### 1. Authentication Flow

```
1. User submits login form
   ↓
2. Dispatch loginUser() thunk → API call
   ↓
3. AuthService stores tokens in localStorage
   ↓
4. Redux updates auth state (user, isAuthenticated)
   ↓
5. ProtectedRoute allows navigation to dashboard
   ↓
6. All subsequent API calls include JWT token (axios interceptor)
```

---

### 2. Protected Navigation

```
User navigates to /patient/dashboard
   ↓
ProtectedRoute checks:
   - isAuthenticated? → No → Redirect to /sign-in
   - allowedRoles includes user.role? → No → Redirect to role dashboard
   - requireOnboarding && !isProfileCompleted? → Yes → Redirect to /onboarding
   - isProvider && !isVerified? → Yes → Redirect to /verification-pending
   ↓
All checks pass → Render <PatientDashboard />
```

---

### 3. API Error Handling

```
API call fails
   ↓
Axios response interceptor catches error
   ↓
Check error type:
   - 401 + SESSION_TIMEOUT → Show session timeout modal
   - 401 (token expired) → Attempt token refresh → Retry request
   - ECONNREFUSED (dev) → Retry with backoff
   - Other → Extract user-friendly message
   ↓
Component catch block displays toast notification
```

---

## Summary

### Frontend Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | React 18 | UI library |
| **Routing** | React Router v6 | Client-side routing |
| **State** | Redux Toolkit | Global state management |
| **HTTP** | Axios | API communication |
| **Forms** | Formik + Yup | Form state + validation |
| **Styling** | CSS Modules | Component-scoped styles |
| **Build** | Create React App | Build tooling |
| **Notifications** | React Toastify | Toast messages |

---

### Key Architectural Decisions

1. **Redux over Context** - Global state with Redux Toolkit for auth state
2. **CSS Modules over Styled Components** - Scoped styles without runtime overhead
3. **Service Layer Pattern** - API calls abstracted into service files
4. **Protected Route Guards** - Centralized authentication and role checking
5. **Lazy Loading** - All pages lazy-loaded for performance
6. **Token Refresh** - Automatic token refresh in axios interceptor
7. **Session Timeout** - 30-minute inactivity timeout with modal warning

---

## Next Steps

To understand the frontend architecture more deeply:

1. **Read App.js**: `client/src/App.js` for complete routing structure
2. **Read Auth Slice**: `client/src/store/slices/authSlice.js` for state management
3. **Read API Middleware**: `client/src/store/middleware/apiMiddleware.js` for HTTP interceptors
4. **Explore Components**: Start with `client/src/components/common/` for reusable UI
5. **Review Form Patterns**: `client/src/components/forms/ConsultationForm/` for complex forms
6. **Test Flows**: Login → Dashboard → Create Consultation → View Medical Records

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Previous Document**: [06-Authentication-Authorization-Security.md](./06-Authentication-Authorization-Security.md)  
**Next Document**: [08-Domain-Specific-Flows.md](./08-Domain-Specific-Flows.md)

