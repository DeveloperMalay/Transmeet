'use client';

import { useState } from 'react';
import { RefreshCw, Download, FileText, Film, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from './LoadingSpinner';
import { format } from 'date-fns';

interface ZoomSyncProps {
  onSyncComplete?: () => void;
}

export function ZoomSync({ onSyncComplete }: ZoomSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await apiClient.syncMeetings();
      
      if (response.success) {
        setSyncResult(response);
        onSyncComplete?.();
      } else {
        throw new Error(response.message || 'Sync failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to sync meetings';
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncWithDateRange = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await apiClient.client.post('/api/meetings/sync', dateRange);
      
      if (response.data.success) {
        setSyncResult(response.data);
        onSyncComplete?.();
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to sync meetings';
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Zoom Meeting Sync
        </h3>
        <RefreshCw className={`h-5 w-5 text-gray-400 ${isSyncing ? 'animate-spin' : ''}`} />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Sync your recent Zoom meetings to fetch recordings and transcripts.
      </p>

      {/* Date Range Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isSyncing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            disabled={isSyncing}
          />
        </div>
      </div>

      {/* Sync Options */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <Film className="h-4 w-4" />
          <span>Meeting recordings</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <FileText className="h-4 w-4" />
          <span>Meeting transcripts</span>
        </div>
        <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>Meeting metadata</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {syncResult && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Successfully synced {syncResult.synced} meetings
              </p>
              {syncResult.errors && syncResult.errors.length > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {syncResult.errors.length} meetings had errors
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Last 30 Days
            </>
          )}
        </button>
        <button
          onClick={handleSyncWithDateRange}
          disabled={isSyncing}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSyncing ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Syncing...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Sync Date Range
            </>
          )}
        </button>
      </div>

      {/* Additional Info */}
      <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Syncing will fetch all available meetings, recordings, and transcripts from your Zoom account within the specified date range. Large date ranges may take longer to process.
        </p>
      </div>
    </div>
  );
}