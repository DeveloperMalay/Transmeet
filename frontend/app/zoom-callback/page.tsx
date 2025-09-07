'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import axios from 'axios';

export default function ZoomCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, updateUser, login } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    handleZoomCallback();
  }, [searchParams]);

  const handleZoomCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle Zoom OAuth errors
    if (errorParam) {
      setError(`Zoom authorization failed: ${errorParam}`);
      setIsProcessing(false);
      // Redirect back to connect-zoom page after delay
      setTimeout(() => {
        router.push('/connect-zoom');
      }, 3000);
      return;
    }

    // Check if we have both code and state
    if (!code || !state) {
      setError('Invalid callback parameters. Missing authorization code or state.');
      setIsProcessing(false);
      setTimeout(() => {
        router.push('/connect-zoom');
      }, 3000);
      return;
    }

    try {
      // Send the code and state to backend
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/zoom/callback`,
        { code, state },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        // Update user state with Zoom connection
        if (response.data.user) {
          updateUser(response.data.user);
        }
        
        // Update tokens if provided
        if (response.data.tokens) {
          login({
            user: response.data.user,
            token: response.data.tokens.accessToken,
            refreshToken: response.data.tokens.refreshToken,
          });
        }

        setIsSuccess(true);
        setIsProcessing(false);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Zoom callback error:', err);
      setError(err.response?.data?.message || 'Failed to connect Zoom account. Please try again.');
      setIsProcessing(false);
      
      // Redirect back to connect-zoom page after delay
      setTimeout(() => {
        router.push('/connect-zoom');
      }, 3000);
    }
  };

  // Processing state
  if (isProcessing) {
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
  if (error) {
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
            {error}
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