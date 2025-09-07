import { useEffect, useState, useMemo } from 'react';
import { useTranscriptStore } from '@/store/meetingStore';
import type { TranscriptSegment } from '@/types';

export const useTranscript = (meetingId: string | null) => {
  const {
    currentTranscript,
    isLoading,
    error,
    fetchTranscript,
    clearError,
  } = useTranscriptStore();

  useEffect(() => {
    if (meetingId) {
      fetchTranscript(meetingId);
    }
  }, [meetingId, fetchTranscript]);

  return {
    transcript: currentTranscript,
    segments: currentTranscript?.segments || [],
    isLoading,
    error,
    clearError,
    refetch: () => meetingId && fetchTranscript(meetingId),
    hasTranscript: !!currentTranscript,
  };
};

export const useSummary = (meetingId: string | null) => {
  const {
    currentSummary,
    isLoading,
    error,
    fetchSummary,
    clearError,
  } = useTranscriptStore();

  useEffect(() => {
    if (meetingId) {
      fetchSummary(meetingId);
    }
  }, [meetingId, fetchSummary]);

  return {
    summary: currentSummary,
    isLoading,
    error,
    clearError,
    refetch: () => meetingId && fetchSummary(meetingId),
    hasSummary: !!currentSummary,
  };
};

// Hook for transcript search functionality
export const useTranscriptSearch = (segments: TranscriptSegment[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !segments.length) return [];

    const query = searchQuery.toLowerCase();
    return segments
      .map((segment, index) => ({
        segment,
        index,
        matchIndex: segment.text.toLowerCase().indexOf(query),
      }))
      .filter(result => result.matchIndex !== -1);
  }, [searchQuery, segments]);

  const currentMatch = searchResults[currentMatchIndex] || null;

  const goToNextMatch = () => {
    if (searchResults.length > 0) {
      setCurrentMatchIndex(prev => (prev + 1) % searchResults.length);
    }
  };

  const goToPrevMatch = () => {
    if (searchResults.length > 0) {
      setCurrentMatchIndex(prev => 
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentMatch,
    currentMatchIndex,
    totalMatches: searchResults.length,
    hasMatches: searchResults.length > 0,
    goToNextMatch,
    goToPrevMatch,
    clearSearch,
  };
};

// Hook for global transcript search across all meetings
export const useGlobalTranscriptSearch = () => {
  const {
    searchResults,
    isLoading,
    error,
    searchTranscripts,
    clearSearch,
    clearError,
  } = useTranscriptStore();
  
  const [query, setQuery] = useState('');

  const search = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim()) {
      await searchTranscripts(searchQuery);
    } else {
      clearSearch();
    }
  };

  return {
    query,
    results: searchResults,
    isLoading,
    error,
    search,
    clearSearch: () => {
      setQuery('');
      clearSearch();
    },
    clearError,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length,
  };
};

// Hook for managing transcript playback/navigation
export const useTranscriptPlayback = (segments: TranscriptSegment[]) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSegment = useMemo(() => {
    return segments.find(segment => 
      currentTime >= segment.startTime && currentTime <= segment.endTime
    ) || null;
  }, [segments, currentTime]);

  const goToTime = (time: number) => {
    setCurrentTime(time);
  };

  const goToSegment = (segment: TranscriptSegment) => {
    setCurrentTime(segment.startTime);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    currentTime,
    currentSegment,
    isPlaying,
    setIsPlaying,
    goToTime,
    goToSegment,
    formatTime,
  };
};