'use client';

import { useState } from 'react';
import { Plus, Search, Filter, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MeetingCard } from '@/components/MeetingCard';
import { SearchBar } from '@/components/SearchBar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMeetings, useMeetingSearch } from '@/hooks/useMeetings';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { meetings, isLoading, error, fetchMeetings, clearError } = useMeetings();
  const { query, setQuery, hasQuery, resultCount } = useMeetingSearch();
  
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');

  const handleRefresh = () => {
    fetchMeetings();
  };

  const handleSyncMeetings = async () => {
    try {
      // await apiClient.syncMeetings();
      fetchMeetings();
    } catch (error) {
      console.error('Failed to sync meetings:', error);
    }
  };

  const getFilteredMeetings = () => {
    let filtered = meetings;

    if (dateFilter === 'week') {
      const start = startOfWeek(new Date());
      const end = endOfWeek(new Date());
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= start && meetingDate <= end;
      });
    } else if (dateFilter === 'month') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      filtered = filtered.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return meetingDate >= start && meetingDate <= end;
      });
    }

    return filtered;
  };

  const filteredMeetings = getFilteredMeetings();

  const stats = {
    total: meetings.length,
    thisWeek: meetings.filter(m => {
      const start = startOfWeek(new Date());
      const end = endOfWeek(new Date());
      const meetingDate = new Date(m.startTime);
      return meetingDate >= start && meetingDate <= end;
    }).length,
    withTranscripts: meetings.filter(m => m.hasTranscript).length,
    withSummaries: meetings.filter(m => m.hasSummary).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Transmeet
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Welcome back, {user?.name || user?.email}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleSyncMeetings}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync
              </button>
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Meetings
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      This Week
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.thisWeek}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      With Transcripts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.withTranscripts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">S</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      With Summaries
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {stats.withSummaries}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search meetings by title, host, or participant..."
              showFilters
              onFilterClick={() => setShowFilters(!showFilters)}
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Date Range:
              </span>
              <div className="flex space-x-2">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setDateFilter(option.value as any)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      dateFilter === option.value
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {hasQuery && (
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {resultCount} result{resultCount !== 1 ? 's' : ''} for "{query}"
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={clearError}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Meetings List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading meetings...</span>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {hasQuery ? 'No meetings found' : 'No meetings yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {hasQuery 
                ? 'Try adjusting your search or filters'
                : 'Your Zoom meetings will appear here automatically'
              }
            </p>
            {!hasQuery && (
              <div className="mt-6">
                <button
                  onClick={handleSyncMeetings}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Meetings
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}