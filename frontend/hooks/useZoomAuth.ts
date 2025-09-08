import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface ZoomAuthResponse {
  success: boolean;
  authUrl?: string;
  message?: string;
}

export function useZoomAuthUrl() {
  const { token } = useAuthStore();
  
  return useMutation<ZoomAuthResponse, Error>({
    mutationFn: async () => {
      const response = await apiClient.client.get('/api/auth/zoom', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.authUrl) {
        // Redirect to Zoom OAuth page
        window.location.href = data.authUrl;
      }
    },
  });
}

export function useZoomCallback() {
  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const response = await apiClient.client.post('/api/auth/zoom/callback', {
        code,
        state,
      });
      return response.data;
    },
  });
}