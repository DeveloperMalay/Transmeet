import axios, { AxiosInstance, AxiosError } from 'axios';
import type { 
  ApiResponse, 
  Meeting, 
  Transcript, 
  MeetingSummary, 
  SearchResult, 
  ExportRequest,
  PaginatedResponse,
  User
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear stored token and redirect to login
          this.clearStoredToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('transmeet_token');
    }
    return null;
  }

  private clearStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('transmeet_token');
    }
  }

  // Authentication endpoints
  async loginWithEmail(credentials: { email: string; password: string }): Promise<any> {
    const response = await this.client.post('/api/auth/login', credentials);
    return response.data;
  }

  async registerUser(data: { email: string; password: string; name?: string }): Promise<any> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async verifyOTP(data: { userId: string; otp: string }): Promise<ApiResponse<any>> {
    const response = await this.client.post('/api/auth/verify-otp', data);
    return response.data;
  }

  async resendOTP(userId: string): Promise<ApiResponse<any>> {
    const response = await this.client.post('/api/auth/resend-otp', { userId });
    return response.data;
  }

  async loginWithZoom(code: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.client.post('/api/auth/zoom/callback', { code });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearStoredToken();
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.client.post('/api/auth/refresh');
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // Meeting endpoints
  async getMeetings(page = 1, limit = 20): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    const response = await this.client.get('/api/meetings', {
      params: { page, limit }
    });
    return response.data;
  }

  async getMeeting(id: string): Promise<ApiResponse<Meeting>> {
    const response = await this.client.get(`/api/meetings/${id}`);
    return response.data;
  }

  async syncMeetings(): Promise<ApiResponse<{ synced: number }>> {
    const response = await this.client.post('/api/meetings/sync');
    return response.data;
  }

  // Transcript endpoints
  async getTranscript(meetingId: string): Promise<ApiResponse<Transcript>> {
    const response = await this.client.get(`/api/meetings/${meetingId}/transcript`);
    return response.data;
  }

  async generateTranscript(meetingId: string): Promise<ApiResponse<{ status: string }>> {
    const response = await this.client.post(`/api/meetings/${meetingId}/transcript/generate`);
    return response.data;
  }

  // Summary endpoints
  async getSummary(meetingId: string): Promise<ApiResponse<MeetingSummary>> {
    const response = await this.client.get(`/api/meetings/${meetingId}/summary`);
    return response.data;
  }

  async generateSummary(meetingId: string): Promise<ApiResponse<{ status: string }>> {
    const response = await this.client.post(`/api/meetings/${meetingId}/summary/generate`);
    return response.data;
  }

  // Search endpoints
  async searchTranscripts(query: string): Promise<ApiResponse<SearchResult[]>> {
    const response = await this.client.get('/api/search/transcripts', {
      params: { q: query }
    });
    return response.data;
  }

  async searchMeetings(query: string): Promise<ApiResponse<Meeting[]>> {
    const response = await this.client.get('/api/search/meetings', {
      params: { q: query }
    });
    return response.data;
  }

  // Export endpoints
  async exportMeeting(request: ExportRequest): Promise<Blob> {
    const response = await this.client.post('/api/export', request, {
      responseType: 'blob'
    });
    return response.data;
  }

  async getExportStatus(exportId: string): Promise<ApiResponse<{ status: string; downloadUrl?: string }>> {
    const response = await this.client.get(`/api/export/${exportId}/status`);
    return response.data;
  }

  // Action item endpoints
  async updateActionItem(itemId: string, updates: Partial<{ status: string; dueDate: string; assignee: string }>): Promise<ApiResponse<void>> {
    const response = await this.client.patch(`/api/action-items/${itemId}`, updates);
    return response.data;
  }

  async createActionItem(meetingId: string, item: { description: string; assignee?: string; dueDate?: string; priority: string }): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/api/meetings/${meetingId}/action-items`, item);
    return response.data;
  }

  // Utility methods
  getAuthUrl(): string {
    return `${BASE_URL}/api/auth/zoom`;
  }

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('transmeet_token', token);
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export utility functions
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

export default apiClient;