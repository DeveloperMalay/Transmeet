import { useEffect } from 'react';
import { useMeetingStore } from '@/store/meetingStore';

export const useMeetings = (autoFetch = true) => {
  const {
    meetings,
    filteredMeetings,
    currentMeeting,
    isLoading,
    error,
    searchQuery,
    fetchMeetings,
    fetchMeeting,
    setSearchQuery,
    clearError,
  } = useMeetingStore();

  // Auto-fetch meetings on mount if requested
  useEffect(() => {
    if (autoFetch && meetings.length === 0 && !isLoading) {
      fetchMeetings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Only re-run if autoFetch changes, not on every fetchMeetings update

  return {
    // State
    meetings: filteredMeetings,
    allMeetings: meetings,
    currentMeeting,
    isLoading,
    error,
    searchQuery,
    
    // Actions
    fetchMeetings,
    fetchMeeting,
    setSearchQuery,
    clearError,
    
    // Computed
    isEmpty: filteredMeetings.length === 0,
    hasSearchResults: searchQuery.length > 0,
  };
};

// Hook specifically for a single meeting
export const useMeeting = (meetingId: string | null) => {
  const {
    currentMeeting,
    isLoading,
    error,
    fetchMeeting,
    clearError,
  } = useMeetingStore();

  useEffect(() => {
    if (meetingId) {
      fetchMeeting(meetingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]); // Only re-run when meetingId changes

  return {
    meeting: currentMeeting,
    isLoading,
    error,
    clearError,
    refetch: () => meetingId && fetchMeeting(meetingId),
  };
};

// Hook for meeting search
export const useMeetingSearch = () => {
  const {
    filteredMeetings,
    searchQuery,
    setSearchQuery,
    isLoading,
  } = useMeetingStore();

  return {
    results: filteredMeetings,
    query: searchQuery,
    setQuery: setSearchQuery,
    isSearching: isLoading && searchQuery.length > 0,
    hasQuery: searchQuery.length > 0,
    resultCount: filteredMeetings.length,
  };
};