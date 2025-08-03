import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from './store/slices/authSlice';
import { AuthProvider } from './contexts/AuthContext';
import SessionTimeout from './components/SessionTimeout';
import ProtectedRoute from './components/ProtectedRoute';
import config from './config';

// Layouts
import AuthLayout from './components/layouts/AuthLayout';
import DashboardLayout from './components/layouts/DashboardLayout';

// Lazy-loaded pages
// Authentication pages
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const AdminSignIn = lazy(() => import('./pages/auth/AdminSignIn'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const EmailVerificationSent = lazy(() => import('./pages/auth/EmailVerificationSent'));
const VerificationError = lazy(() => import('./pages/auth/VerificationError'));

// Onboarding pages
const PatientOnboarding = lazy(() => import('./pages/patient/Onboarding'));
const ProviderOnboarding = lazy(() => import('./pages/provider/Onboarding'));
const ProviderVerificationPending = lazy(() => import('./pages/provider/VerificationPending'));

// Patient pages
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'));
const PatientConsultations = lazy(() => import('./pages/patient/Consultations'));
const PatientViewConsultation = lazy(() => import('./pages/patient/ViewConsultation'));
const PatientConnections = lazy(() => import('./pages/patient/Connections'));
const PatientMedicalRecords = lazy(() => import('./pages/patient/MedicalRecords'));
const PatientVitals = lazy(() => import('./pages/patient/medical-records/Vitals'));
const PatientAddVitals = lazy(() => import('./pages/patient/AddVitals'));
const PatientViewVitals = lazy(() => import('./pages/patient/medical-records/ViewVitals'));
const PatientMedications = lazy(() => import('./pages/patient/medical-records/Medications'));
const PatientImmunizations = lazy(() => import('./pages/patient/medical-records/Immunizations'));
const PatientLabResults = lazy(() => import('./pages/patient/medical-records/LabResults'));
const PatientRadiologyReports = lazy(() => import('./pages/patient/medical-records/RadiologyReports'));
const PatientHospital = lazy(() => import('./pages/patient/medical-records/Hospital'));
const PatientSurgery = lazy(() => import('./pages/patient/medical-records/Surgery'));
const PatientProfile = lazy(() => import('./pages/patient/Profile'));
const PatientSettings = lazy(() => import('./pages/patient/Settings'));

// Provider pages
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard'));
const ProviderPatients = lazy(() => import('./pages/provider/Patients'));
const ProviderViewPatient = lazy(() => import('./pages/provider/ViewPatient'));
const ProviderAddPatient = lazy(() => import('./pages/provider/AddPatient'));
const ProviderConsultations = lazy(() => import('./pages/provider/Consultations'));
const ProviderAddConsultation = lazy(() => import('./pages/provider/AddConsultation'));
const ProviderViewConsultation = lazy(() => import('./pages/provider/ViewConsultation'));
const ProviderMedicalRecords = lazy(() => import('./pages/provider/MedicalRecords'));
const ProviderViewVitals = lazy(() => import('./pages/provider/ViewVitals'));
const ProviderProfile = lazy(() => import('./pages/provider/Profile'));
const ProviderSettings = lazy(() => import('./pages/provider/Settings'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminHealthProviders = lazy(() => import('./pages/admin/HealthProviders'));
const AdminViewProviderRequest = lazy(() => import('./pages/admin/ViewProviderRequest'));
const AdminViewProvider = lazy(() => import('./pages/admin/ViewProvider'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminPatients = lazy(() => import('./pages/admin/Patients'));
const AdminViewPatient = lazy(() => import('./pages/admin/ViewPatient'));
const AdminEditPatient = lazy(() => import('./pages/admin/EditPatient'));
const AdminPatientProfile = lazy(() => import('./pages/admin/PatientProfile'));

// Shared pages
const NotFound = lazy(() => import('./pages/shared/NotFound'));
const Help = lazy(() => import('./pages/shared/Help'));



// Loading component
const LoadingFallback = () => {
  const [loadingTime, setLoadingTime] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setLoadingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    // Log extended diagnostic info if loading takes too long
    if (loadingTime === 5) {
      console.warn('Loading taking longer than expected. Checking API and token state...');
      console.log('Auth token exists:', !!localStorage.getItem('onus_auth_token'));
      console.log('API URL configured:', config.apiUrl);
    }
  }, [loadingTime]);
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
        Loading Application...
      </div>
      <div style={{ marginBottom: '30px' }}>
        {loadingTime > 0 && `Elapsed time: ${loadingTime}s`}
      </div>
      {loadingTime > 10 && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '5px',
          maxWidth: '500px',
          margin: '0 auto',
          textAlign: 'left'
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Taking longer than expected?</p>
          <p>Try these troubleshooting steps:</p>
          <ul style={{ paddingLeft: '20px', marginBottom: '15px' }}>
            <li>Check if the server is running</li>
            <li>Clear your browser cache and cookies</li>
            <li>Try refreshing the page</li>
          </ul>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/admin/sign-in" element={<AdminSignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/verify-your-email" element={<EmailVerificationSent />} />
            <Route path="/verification-error" element={<VerificationError />} />
          </Route>

          {/* Onboarding routes */}
          <Route 
            path="/patient/onboarding" 
            element={
              <ProtectedRoute 
                element={<PatientOnboarding />} 
                allowedRoles={['patient']} 
              />
            } 
          />
          <Route 
            path="/provider/onboarding" 
            element={
              <ProtectedRoute 
                element={<ProviderOnboarding />} 
                allowedRoles={['provider']} 
              />
            } 
          />
          <Route 
            path="/provider/verification-pending" 
            element={
              <ProtectedRoute 
                element={<ProviderVerificationPending />} 
                allowedRoles={['provider']} 
              />
            } 
          />

          {/* Patient routes */}
          <Route element={<DashboardLayout role="patient" />}>
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
            <Route 
              path="/patient/consultations" 
              element={
                <ProtectedRoute 
                  element={<PatientConsultations />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/consultations/:id" 
              element={
                <ProtectedRoute 
                  element={<PatientViewConsultation />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/connections" 
              element={
                <ProtectedRoute 
                  element={<PatientConnections />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records" 
              element={
                <ProtectedRoute 
                  element={<PatientMedicalRecords />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/vitals" 
              element={
                <ProtectedRoute 
                  element={<PatientVitals />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/vitals/add" 
              element={
                <ProtectedRoute 
                  element={<PatientAddVitals />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/vitals/:id" 
              element={
                <ProtectedRoute 
                  element={<PatientViewVitals />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/medications" 
              element={
                <ProtectedRoute 
                  element={<PatientMedications />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/immunizations" 
              element={
                <ProtectedRoute 
                  element={<PatientImmunizations />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/lab-results" 
              element={
                <ProtectedRoute 
                  element={<PatientLabResults />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/radiology" 
              element={
                <ProtectedRoute 
                  element={<PatientRadiologyReports />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/hospital" 
              element={
                <ProtectedRoute 
                  element={<PatientHospital />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/medical-records/surgery" 
              element={
                <ProtectedRoute 
                  element={<PatientSurgery />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/profile" 
              element={
                <ProtectedRoute 
                  element={<PatientProfile />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/settings" 
              element={
                <ProtectedRoute 
                  element={<PatientSettings />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/patient/help" 
              element={
                <ProtectedRoute 
                  element={<Help />} 
                  allowedRoles={['patient']} 
                  requireOnboarding={true}
                />
              } 
            />
          </Route>

          {/* Provider routes */}
          <Route element={<DashboardLayout role="provider" />}>
            <Route 
              path="/provider/dashboard" 
              element={
                <ProtectedRoute 
                  element={<ProviderDashboard />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/patients" 
              element={
                <ProtectedRoute 
                  element={<ProviderPatients />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/patients/:id" 
              element={
                <ProtectedRoute 
                  element={<ProviderViewPatient />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/patients/add" 
              element={
                <ProtectedRoute 
                  element={<ProviderAddPatient />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/consultations" 
              element={
                <ProtectedRoute 
                  element={<ProviderConsultations />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/consultations/new" 
              element={
                <ProtectedRoute 
                  element={<ProviderAddConsultation />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/consultations/:id/edit" 
              element={
                <ProtectedRoute 
                  element={<ProviderAddConsultation />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/consultations/:id" 
              element={
                <ProtectedRoute 
                  element={<ProviderViewConsultation />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/medical-records" 
              element={
                <ProtectedRoute 
                  element={<ProviderMedicalRecords />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/medical-records/:type" 
              element={
                <ProtectedRoute 
                  element={<ProviderMedicalRecords />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/medical-records/vitals/:id" 
              element={
                <ProtectedRoute 
                  element={<ProviderViewVitals />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/profile" 
              element={
                <ProtectedRoute 
                  element={<ProviderProfile />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/settings" 
              element={
                <ProtectedRoute 
                  element={<ProviderSettings />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
            <Route 
              path="/provider/help" 
              element={
                <ProtectedRoute 
                  element={<Help />} 
                  allowedRoles={['provider']} 
                  requireOnboarding={true}
                />
              } 
            />
          </Route>

          {/* Admin routes */}
          <Route element={<DashboardLayout role="admin" />}>
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute 
                  element={<AdminDashboard />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute 
                  element={<AdminUsers />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/health-providers" 
              element={
                <ProtectedRoute 
                  element={<AdminHealthProviders />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/health-providers/:id" 
              element={
                <ProtectedRoute 
                  element={<AdminViewProvider />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/health-providers/verify/:id" 
              element={
                <ProtectedRoute 
                  element={<AdminViewProviderRequest />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/patients" 
              element={
                <ProtectedRoute 
                  element={<AdminPatients />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/patients/:id" 
              element={
                <ProtectedRoute 
                  element={<AdminViewPatient />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/patients/:id/edit" 
              element={
                <ProtectedRoute 
                  element={<AdminEditPatient />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/patients/:id/profile" 
              element={
                <ProtectedRoute 
                  element={<AdminPatientProfile />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute 
                  element={<AdminSettings />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
            <Route 
              path="/admin/help" 
              element={
                <ProtectedRoute 
                  element={<Help />} 
                  allowedRoles={['admin']} 
                />
              } 
            />
          </Route>

          {/* Redirect from root */}
          <Route path="/" element={<Navigate to="/sign-in" />} />

          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Session timeout component */}
        <SessionTimeout />
      </Suspense>
    </AuthProvider>
  );
}

export default App; 