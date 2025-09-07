import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '@/types';
import { apiClient, handleApiError } from '@/lib/api';
import { 
  getInitialAuthState, 
  createAuthSession, 
  clearAuthSession,
  getAuthCodeFromUrl,
  clearUrlParams,
  redirectToLogin
} from '@/lib/auth';

interface AuthStore extends AuthState {
  error: string | null;
  // Actions
  login: (data: { user: any; token: string; refreshToken?: string }) => void;
  loginWithZoom: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  handleAuthCallback: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...getInitialAuthState(),
      error: null,

      login: (data: { user: any; token: string; refreshToken?: string }) => {
        const { user, token, refreshToken } = data;
        
        createAuthSession(user, token);
        apiClient.setToken(token);
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        // Store refresh token if provided
        if (refreshToken && typeof window !== 'undefined') {
          localStorage.setItem('transmeet_refresh_token', refreshToken);
        }
      },

      loginWithZoom: async (code: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.login(code);
          const { user, token } = response.data;
          
          createAuthSession(user, token);
          apiClient.setToken(token);
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          await apiClient.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout error:', error);
        } finally {
          clearAuthSession();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          redirectToLogin();
        }
      },

      refreshToken: async () => {
        try {
          const response = await apiClient.refreshToken();
          const { token } = response.data;
          
          apiClient.setToken(token);
          
          set(state => ({
            ...state,
            token,
            error: null,
          }));
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: errorMessage,
          });
          redirectToLogin();
        }
      },

      getCurrentUser: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiClient.getCurrentUser();
          const user = response.data;
          
          set(state => ({
            ...state,
            user,
            isLoading: false,
            error: null,
          }));
        } catch (error) {
          const errorMessage = handleApiError(error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      handleAuthCallback: async () => {
        try {
          const code = getAuthCodeFromUrl();
          
          if (code) {
            await get().loginWithZoom(code);
            clearUrlParams();
            return;
          }
          
          // Don't automatically redirect - let the component handle it
        } catch (error) {
          clearUrlParams();
          throw error;
        }
      },

      clearError: () => set(state => ({ ...state, error: null })),
      
      setLoading: (loading: boolean) => set(state => ({ ...state, isLoading: loading })),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);