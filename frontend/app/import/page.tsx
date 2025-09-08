'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Upload, Cloud, ArrowLeft } from 'lucide-react';
import { CSVUpload } from '@/components/CSVUpload';
import { ZoomSync } from '@/components/ZoomSync';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function ImportPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'csv' | 'zoom'>('zoom');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    // Optionally redirect to dashboard after a delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mr-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="flex items-center space-x-2">
                  <Video className="h-6 w-6 text-blue-600" />
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">
                    Import Meetings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Import Meeting Data
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Import meetings from Zoom or upload CSV files with transcripts
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <nav className="flex space-x-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('zoom')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'zoom'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Cloud className="inline h-4 w-4 mr-2" />
                Sync from Zoom
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'csv'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Upload className="inline h-4 w-4 mr-2" />
                Upload CSV
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {activeTab === 'zoom' ? (
              <div className="p-6">
                {user?.zoomConnected ? (
                  <ZoomSync onSyncComplete={handleImportSuccess} />
                ) : (
                  <div className="text-center py-12">
                    <Cloud className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Zoom Not Connected
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Connect your Zoom account to sync meetings
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => router.push('/connect-zoom')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Connect Zoom Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <CSVUpload
                  onSuccess={handleImportSuccess}
                  onError={(error) => console.error('CSV upload error:', error)}
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
              {activeTab === 'zoom' ? 'Zoom Sync Instructions' : 'CSV Upload Instructions'}
            </h3>
            {activeTab === 'zoom' ? (
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <li>• Select a date range to sync meetings from</li>
                <li>• The sync will fetch all available recordings and transcripts</li>
                <li>• Meetings will be automatically analyzed with AI for summaries and action items</li>
                <li>• Large date ranges may take longer to process</li>
              </ul>
            ) : (
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <li>• Prepare a CSV file with your meeting data</li>
                <li>• Required columns: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">topic</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">date</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">transcript</code></li>
                <li>• Optional columns: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">duration</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">meeting_id</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">end_date</code></li>
                <li>• Each row will be processed and analyzed with AI</li>
                <li>• Action items will be automatically extracted from transcripts</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}