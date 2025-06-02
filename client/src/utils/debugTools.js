/**
 * Debug tools for development and troubleshooting
 * IMPORTANT: These functions should only be used during development and not in production!
 */

// Make these functions available in the global window object
// so they can be called from the browser console
if (process.env.NODE_ENV !== 'production') {
  /**
   * Marks the user onboarding as completed in the Redux store
   * This is useful for testing when onboarding status is preventing access to pages
   */
  window.markOnboardingComplete = () => {
    try {
      // Access the Redux store directly from window.__REDUX_DEVTOOLS_EXTENSION__
      const state = window.__REDUX_DEVTOOLS_EXTENSION__.liftedState.computedStates.slice(-1)[0].state;
      const store = window.__REDUX_DEVTOOLS_EXTENSION__.store;

      // Check if user exists in auth state
      if (state.auth && state.auth.user) {
        // Dispatch the action to mark onboarding as completed
        store.dispatch({ type: 'auth/markOnboardingCompleted' });
        
        console.log('✅ Onboarding marked as completed!');
        console.log('You should now be able to access dashboard pages.');
        console.log('Refresh the page or navigate to /patient/dashboard or /provider/dashboard');
        
        return true;
      } else {
        console.error('❌ No user found in auth state. Make sure you are logged in.');
        return false;
      }
    } catch (error) {
      console.error('❌ Error marking onboarding as completed:', error);
      console.log('Make sure Redux DevTools extension is installed and store is accessible.');
      return false;
    }
  };

  /**
   * Gets the current user from Redux store
   */
  window.getCurrentUser = () => {
    try {
      const state = window.__REDUX_DEVTOOLS_EXTENSION__.liftedState.computedStates.slice(-1)[0].state;
      return state.auth.user;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  };

  console.log('Debug tools loaded. Available commands:');
  console.log('- markOnboardingComplete() - Mark onboarding as completed');
  console.log('- getCurrentUser() - Get current user from Redux store');
} 