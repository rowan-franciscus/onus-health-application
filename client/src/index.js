import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import store from './store';
import { injectStore } from './store/middleware/apiMiddleware';
import { clearAuthState } from './store/clearAuthState';
import './styles/globals.css';

// Import debug tools in development mode
if (process.env.NODE_ENV !== 'production') {
  import('./utils/debugTools');
}

// Inject store into API middleware
injectStore(store);

// Expose utilities to window for debugging
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