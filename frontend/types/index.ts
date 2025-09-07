// Authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  zoomUserId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

// Meeting types
export interface Meeting {
  id: string;
  zoomMeetingId: string;
  topic: string;
  startTime: string;
  duration: number;
  hostId: string;
  hostName: string;
  participants: Participant[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  recordingUrl?: string;
  hasTranscript: boolean;
  hasSummary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  joinTime?: string;
  leaveTime?: string;
  duration?: number;
}

// Transcript types
export interface TranscriptSegment {
  id: string;
  speakerName: string;
  speakerId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface Transcript {
  id: string;
  meetingId: string;
  segments: TranscriptSegment[];
  language: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// Summary types
export interface MeetingSummary {
  id: string;
  meetingId: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  nextMeetingDate?: string;
  participants: string[];
  topics: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  assigneeEmail?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

// Search types
export interface SearchResult {
  meetingId: string;
  meetingTopic: string;
  meetingDate: string;
  matches: TranscriptMatch[];
}

export interface TranscriptMatch {
  segmentId: string;
  text: string;
  speaker: string;
  timestamp: number;
  context: string;
}

// Export types
export type ExportFormat = 'pdf' | 'word' | 'markdown' | 'txt';

export interface ExportRequest {
  meetingId: string;
  format: ExportFormat;
  includeTranscript: boolean;
  includeSummary: boolean;
  includeActionItems: boolean;
}

// API types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Component prop types
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Store types
export interface MeetingStore {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredMeetings: Meeting[];
  fetchMeetings: () => Promise<void>;
  fetchMeeting: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
}

export interface TranscriptStore {
  transcripts: Record<string, Transcript>;
  summaries: Record<string, MeetingSummary>;
  currentTranscript: Transcript | null;
  currentSummary: MeetingSummary | null;
  isLoading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  fetchTranscript: (meetingId: string) => Promise<void>;
  fetchSummary: (meetingId: string) => Promise<void>;
  searchTranscripts: (query: string) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
}