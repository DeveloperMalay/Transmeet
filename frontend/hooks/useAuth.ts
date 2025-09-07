import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    token,
    login,
    logout,
    refreshToken,
    getCurrentUser,
    clearError,
    handleAuthCallback,
  } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    // If we have a token, set it in the API client
    if (token) {
      apiClient.setToken(token);
      
      // Verify the current user if we don't have user data
      if (!user) {
        getCurrentUser();
      }
    }
  }, [token, user, getCurrentUser]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Actions
    login,
    logout,
    refreshToken,
    getCurrentUser,
    clearError,
    handleAuthCallback,
    
    // Computed
    userDisplayName: user?.name || user?.email?.split('@')[0] || '',
    userInitials: user ? 
      (user.name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
      '',
  };
};

// Hook for handling auth callbacks (removed - causing infinite loops)
// Use the login page's own auth handling instead

// Hook for protected routes
export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
};