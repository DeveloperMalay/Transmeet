'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useZoomCallback } from '@/hooks/useZoomAuth';

export default function ZoomCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUser, login } = useAuthStore();
  const { mutate: handleCallback, isPending, isSuccess, error, data } = useZoomCallback();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle Zoom OAuth errors
    if (errorParam) {
      // Redirect back to connect-zoom page after delay
      setTimeout(() => {
        router.push('/connect-zoom');
      }, 3000);
      return;
    }

    // Check if we have both code and state
    if (!code || !state) {
      setTimeout(() => {
        router.push('/connect-zoom');
      }, 3000);
      return;
    }

    // Process the callback
    handleCallback(
      { code, state },
      {
        onSuccess: (response) => {
          if (response.success) {
            // Update user state with Zoom connection
            if (response.user) {
              updateUser(response.user);
            }
            
            // Update tokens if provided
            if (response.tokens) {
              login({
                user: response.user,
                token: response.tokens.accessToken,
                refreshToken: response.tokens.refreshToken,
              });
            }

            // Redirect to dashboard after a short delay
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        },
        onError: () => {
          // Redirect back to connect-zoom page after delay
          setTimeout(() => {
            router.push('/connect-zoom');
          }, 3000);
        },
      }
    );
  }, [searchParams, handleCallback, updateUser, login, router]);

  // Get error message from params or mutation error
  const errorParam = searchParams.get('error');
  const errorMessage = errorParam 
    ? `Zoom authorization failed: ${errorParam}`
    : error?.message || 'Failed to connect Zoom account. Please try again.';

  // Processing state
  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <LoadingSpinner size="lg" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Connecting to Zoom...
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please wait while we complete the connection
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 mb-8">
            <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Zoom Connected Successfully!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || errorParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900 mb-8">
            <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Connection Failed
          </h2>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {errorMessage}
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Redirecting back to connection page...
          </p>
        </div>
      </div>
    );
  }

  // Default loading state (shouldn't normally reach here)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center space-x-2">
          <Video className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            Transmeet
          </span>
        </div>
      </div>
    </div>
  );
}