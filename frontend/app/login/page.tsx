'use client';

import { useEffect, useState } from 'react';
import { Video, ArrowRight, CheckCircle, Users, FileText, Brain } from 'lucide-react';
import { useAuthCallback } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { getAuthCodeFromUrl, getErrorFromUrl } from '@/lib/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function LoginPage() {
  const { isLoading, error } = useAuthCallback();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for auth errors in URL
    const urlError = getErrorFromUrl();
    if (urlError) {
      setAuthError(`Authentication failed: ${urlError}`);
    }
  }, []);

  const handleLogin = () => {
    window.location.href = apiClient.getAuthUrl();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Video className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Transmeet
              </span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Transform your Zoom meetings
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Get AI-powered transcripts, summaries, and action items
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10">
            {/* Features List */}
            <div className="mb-8 space-y-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Automatic meeting transcription
                </span>
              </div>
              <div className="flex items-center">
                <Brain className="h-5 w-5 text-purple-500 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  AI-generated summaries
                </span>
              </div>
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Action item tracking
                </span>
              </div>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-indigo-500 mr-3" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Participant insights
                </span>
              </div>
            </div>

            {/* Error Display */}
            {(error || authError) && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error || authError}
                </p>
              </div>
            )}

            {/* Login Button */}
            <div>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <Video className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                </span>
                {isLoading ? 'Connecting...' : 'Continue with Zoom'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>

            {/* Privacy Notice */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By continuing, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center">
                <FileText className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Smart Transcription
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Accurate speaker identification and timestamped transcripts
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Brain className="h-12 w-12 text-purple-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                AI Insights
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Key points, decisions, and next steps automatically extracted
              </p>
            </div>

            <div className="text-center">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                Team Collaboration
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Share summaries and track action items across your team
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}