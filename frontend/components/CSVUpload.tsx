'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from './LoadingSpinner';

interface CSVUploadProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function CSVUpload({ onSuccess, onError }: CSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await apiClient.uploadCSV(selectedFile);
      
      if (response.success) {
        setUploadResult(response);
        onSuccess?.(response);
        
        // Reset after successful upload
        setTimeout(() => {
          setSelectedFile(null);
          setUploadResult(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to upload CSV';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
        {!selectedFile && !uploadResult ? (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Upload CSV File
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a CSV file with meeting transcripts
            </p>
            <div className="mt-6">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Upload className="h-4 w-4 mr-2" />
                  Select CSV File
                </span>
                <input
                  ref={fileInputRef}
                  id="csv-upload"
                  name="csv-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p className="font-semibold mb-1">Required CSV columns:</p>
              <ul className="list-disc list-inside text-left inline-block">
                <li><code>topic</code> - Meeting title/topic</li>
                <li><code>date</code> - Meeting date (YYYY-MM-DD)</li>
                <li><code>transcript</code> - Meeting transcript text</li>
              </ul>
              <p className="mt-2">Optional: <code>duration</code>, <code>meeting_id</code>, <code>end_date</code></p>
            </div>
          </div>
        ) : selectedFile && !uploadResult ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-gray-500"
                disabled={isUploading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </button>
            </div>
          </div>
        ) : uploadResult ? (
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Upload Successful!
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Processed {uploadResult.processed} meetings from CSV
            </p>
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="mt-4 text-left bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Some rows had errors:
                </p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  {uploadResult.errors.slice(0, 3).map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {uploadResult.errors.length > 3 && (
                    <li>...and {uploadResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}