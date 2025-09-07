import { create } from 'zustand';
import type { Meeting, MeetingStore } from '@/types';
import { apiClient, handleApiError } from '@/lib/api';

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  meetings: [],
  currentMeeting: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredMeetings: [],

  fetchMeetings: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getMeetings();
      const meetings = response.data.data;
      
      set({ 
        meetings, 
        filteredMeetings: meetings,
        isLoading: false 
      });
      
      // Apply current search if any
      const { searchQuery } = get();
      if (searchQuery) {
        get().setSearchQuery(searchQuery);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        meetings: [], 
        filteredMeetings: [],
        isLoading: false, 
        error: errorMessage 
      });
    }
  },

  fetchMeeting: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getMeeting(id);
      const meeting = response.data;
      
      set({ 
        currentMeeting: meeting, 
        isLoading: false 
      });
      
      // Update the meeting in the meetings list if it exists
      const { meetings } = get();
      const updatedMeetings = meetings.map(m => 
        m.id === meeting.id ? meeting : m
      );
      
      // If meeting not in list, add it
      if (!meetings.find(m => m.id === meeting.id)) {
        updatedMeetings.push(meeting);
      }
      
      set({ meetings: updatedMeetings });
      get().setSearchQuery(get().searchQuery); // Re-apply filter
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        currentMeeting: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    
    const { meetings } = get();
    
    if (!query.trim()) {
      set({ filteredMeetings: meetings });
      return;
    }
    
    const lowercaseQuery = query.toLowerCase();
    const filtered = meetings.filter(meeting => 
      meeting.topic.toLowerCase().includes(lowercaseQuery) ||
      meeting.hostName.toLowerCase().includes(lowercaseQuery) ||
      meeting.participants.some(p => 
        p.name.toLowerCase().includes(lowercaseQuery) ||
        p.email?.toLowerCase().includes(lowercaseQuery)
      ) ||
      new Date(meeting.startTime).toLocaleDateString().includes(lowercaseQuery)
    );
    
    set({ filteredMeetings: filtered });
  },

  clearError: () => set({ error: null }),
}));

// Create a separate store for transcript-related data
interface TranscriptStore {
  transcripts: Record<string, any>;
  summaries: Record<string, any>;
  currentTranscript: any;
  currentSummary: any;
  isLoading: boolean;
  error: string | null;
  searchResults: any[];
  fetchTranscript: (meetingId: string) => Promise<void>;
  fetchSummary: (meetingId: string) => Promise<void>;
  searchTranscripts: (query: string) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}

export const useTranscriptStore = create<TranscriptStore>((set, get) => ({
  transcripts: {},
  summaries: {},
  currentTranscript: null,
  currentSummary: null,
  isLoading: false,
  error: null,
  searchResults: [],

  fetchTranscript: async (meetingId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getTranscript(meetingId);
      const transcript = response.data;
      
      set(state => ({
        transcripts: { ...state.transcripts, [meetingId]: transcript },
        currentTranscript: transcript,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        currentTranscript: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  },

  fetchSummary: async (meetingId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.getSummary(meetingId);
      const summary = response.data;
      
      set(state => ({
        summaries: { ...state.summaries, [meetingId]: summary },
        currentSummary: summary,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        currentSummary: null, 
        isLoading: false, 
        error: errorMessage 
      });
    }
  },

  searchTranscripts: async (query: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiClient.searchTranscripts(query);
      const results = response.data;
      
      set({ 
        searchResults: results, 
        isLoading: false 
      });
    } catch (error) {
      const errorMessage = handleApiError(error);
      set({ 
        searchResults: [], 
        isLoading: false, 
        error: errorMessage 
      });
    }
  },

  clearSearch: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),
}));

// Theme store for dark mode support
interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  systemTheme: 'light' | 'dark';
  actualTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  systemTheme: 'light',
  actualTheme: 'light',

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set({ theme });
    
    const { systemTheme } = get();
    const actualTheme = theme === 'system' ? systemTheme : theme;
    
    set({ actualTheme });
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('transmeet-theme', theme);
      
      // Apply theme to document
      if (actualTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  initializeTheme: () => {
    if (typeof window !== 'undefined') {
      // Get saved theme or default to system
      const savedTheme = localStorage.getItem('transmeet-theme') as 'light' | 'dark' | 'system' || 'system';
      
      // Detect system theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      
      const actualTheme = savedTheme === 'system' ? systemTheme : savedTheme;
      
      set({ 
        theme: savedTheme, 
        systemTheme, 
        actualTheme 
      });
      
      // Apply theme to document
      if (actualTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        set({ systemTheme: newSystemTheme });
        
        const { theme } = get();
        if (theme === 'system') {
          get().setTheme('system'); // This will update the actual theme
        }
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    }
  },
}));