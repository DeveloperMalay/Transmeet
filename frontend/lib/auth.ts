import type { User } from '@/types';

// Token management
export const TOKEN_KEY = 'transmeet_token';
export const USER_KEY = 'transmeet_user';

export const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const setStoredToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeStoredToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const getStoredUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
  }
  return null;
};

export const setStoredUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

// Token validation
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

export const isValidToken = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if token is expired
    return !isTokenExpired(token);
  } catch {
    return false;
  }
};

// URL handling for OAuth flow
export const getAuthCodeFromUrl = (): string | null => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('code');
  }
  return null;
};

export const getErrorFromUrl = (): string | null => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('error') || urlParams.get('error_description');
  }
  return null;
};

export const clearUrlParams = (): void => {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, document.title, url.toString());
  }
};

// Navigation helpers
export const redirectToLogin = (): void => {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const redirectToDashboard = (): void => {
  if (typeof window !== 'undefined') {
    window.location.href = '/dashboard';
  }
};

// Permission helpers
export const canAccessMeeting = (meeting: any, currentUserId: string): boolean => {
  // User can access meetings they hosted or participated in
  return (
    meeting.hostId === currentUserId ||
    meeting.participants.some((p: any) => p.id === currentUserId)
  );
};

export const canEditActionItem = (actionItem: any, currentUserId: string): boolean => {
  // Users can edit action items assigned to them or that they created
  return (
    actionItem.assigneeId === currentUserId ||
    actionItem.createdById === currentUserId
  );
};

// Format helpers for auth-related data
export const formatUserDisplayName = (user: User): string => {
  return user.name || user.email.split('@')[0];
};

export const getUserInitials = (user: User): string => {
  const name = user.name || user.email;
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Session management
export const createAuthSession = (user: User, token: string): void => {
  setStoredUser(user);
  setStoredToken(token);
};

export const clearAuthSession = (): void => {
  removeStoredToken();
};

export const hasValidSession = (): boolean => {
  const token = getStoredToken();
  const user = getStoredUser();
  return isValidToken(token) && user !== null;
};

// Auth state helpers
export const getInitialAuthState = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  const isAuthenticated = isValidToken(token) && user !== null;

  return {
    user,
    token,
    isAuthenticated,
    isLoading: false,
  };
};

// Error handling for auth flows
export const getAuthErrorMessage = (error: string): string => {
  const errorMessages: Record<string, string> = {
    'access_denied': 'You denied access to the application.',
    'invalid_request': 'Invalid authentication request.',
    'invalid_client': 'Invalid client configuration.',
    'invalid_grant': 'Invalid authorization grant.',
    'unauthorized_client': 'Unauthorized client.',
    'unsupported_grant_type': 'Unsupported grant type.',
    'invalid_scope': 'Invalid scope.',
    'server_error': 'Server error occurred during authentication.',
    'temporarily_unavailable': 'Authentication service is temporarily unavailable.',
  };

  return errorMessages[error] || 'An authentication error occurred.';
};