'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, ArrowRight, Shield, Users, FileText, Brain, Link2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useZoomAuthUrl } from '@/hooks/useZoomAuth';

export default function ConnectZoomPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { mutate: getZoomAuthUrl, isPending, error } = useZoomAuthUrl();

  useEffect(() => {
    // Redirect if not logged in or email not verified
    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (!user.emailVerified) {
      router.push('/verify-email');
      return;
    }

    // If already connected to Zoom, redirect to dashboard
    if (user.zoomConnected) {
      router.push('/dashboard');
    }
  }, [user, token, router]);

  const handleConnectZoom = () => {
    getZoomAuthUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <Video className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Transmeet
              </span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Connect your Zoom account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Unlock the full power of Transmeet by connecting your Zoom account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10">
            {/* Features List */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                What you&apos;ll get:
              </h3>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Automatic meeting sync
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    All your Zoom meetings automatically imported
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Meeting transcripts
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Access full transcripts with speaker identification
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Brain className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    AI-powered insights
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get summaries, action items, and key decisions
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Shield className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Secure & private
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your data is encrypted and never shared
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions Notice */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Permissions we&apos;ll request:
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <ul className="list-disc list-inside space-y-1">
                      <li>View your meetings</li>
                      <li>Access meeting recordings</li>
                      <li>Read meeting transcripts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error.message || 'Failed to connect to Zoom. Please try again.'}
                </p>
              </div>
            )}

            {/* Connect Button */}
            <div className="space-y-4">
              <button
                onClick={handleConnectZoom}
                disabled={isPending}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-5 w-5 mr-2" />
                    Connect with Zoom
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {/* Privacy Notice */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By connecting, you agree to our{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>{' '}
                and Zoom&apos;s{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}