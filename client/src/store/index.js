import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

// Import reducers
import authReducer from './slices/authSlice';

// Middleware
import { apiMiddleware, injectStore } from './middleware/apiMiddleware';
import { sessionMiddleware } from './middleware/sessionMiddleware';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  // Additional reducers will be added as needed
});

// Configure the Redux store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .concat(apiMiddleware)
    .concat(sessionMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Inject store into API middleware
injectStore(store);

export default store; 