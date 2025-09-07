'use client';

import { useState } from 'react';
import { Download, FileText, File, Hash, ChevronDown, Check } from 'lucide-react';
import type { ExportFormat, ExportRequest } from '@/types';
import { apiClient, handleApiError } from '@/lib/api';
import { LoadingSpinner } from './LoadingSpinner';

interface ExportMenuProps {
  meetingId: string;
  meetingTitle: string;
  hasTranscript?: boolean;
  hasSummary?: boolean;
  hasActionItems?: boolean;
  className?: string;
}

export function ExportMenu({
  meetingId,
  meetingTitle,
  hasTranscript = false,
  hasSummary = false,
  hasActionItems = false,
  className = ''
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [exportOptions, setExportOptions] = useState({
    includeTranscript: hasTranscript,
    includeSummary: hasSummary,
    includeActionItems: hasActionItems,
  });

  const formats: { 
    format: ExportFormat; 
    label: string; 
    icon: React.ElementType; 
    description: string;
  }[] = [
    {
      format: 'pdf',
      label: 'PDF',
      icon: FileText,
      description: 'Professional document format'
    },
    {
      format: 'word',
      label: 'Word',
      icon: File,
      description: 'Microsoft Word document'
    },
    {
      format: 'markdown',
      label: 'Markdown',
      icon: Hash,
      description: 'Plain text with formatting'
    },
    {
      format: 'txt',
      label: 'Text',
      icon: FileText,
      description: 'Plain text file'
    }
  ];

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    
    try {
      const request: ExportRequest = {
        meetingId,
        format,
        ...exportOptions
      };
      
      const blob = await apiClient.exportMeeting(request);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', handleApiError(error));
      // You might want to show a toast notification here
    } finally {
      setIsExporting(null);
    }
  };

  const toggleOption = (option: keyof typeof exportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        disabled={isExporting !== null}
      >
        <Download className="w-4 h-4 mr-2" />
        Export
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Export Options
              </h3>
            </div>

            {/* Export Options */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                  Include Content
                </label>
                <div className="space-y-2">
                  {hasTranscript && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeTranscript}
                        onChange={() => toggleOption('includeTranscript')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Full transcript
                      </span>
                    </label>
                  )}
                  
                  {hasSummary && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeSummary}
                        onChange={() => toggleOption('includeSummary')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        AI summary & key points
                      </span>
                    </label>
                  )}
                  
                  {hasActionItems && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeActionItems}
                        onChange={() => toggleOption('includeActionItems')}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Action items & tasks
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium text-gray-900 dark:text-white mb-3 block">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {formats.map(({ format, label, icon: Icon, description }) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format)}
                      disabled={isExporting !== null}
                      className={`p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left transition-colors ${
                        isExporting === format ? 'opacity-75' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Icon className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {label}
                          </span>
                        </div>
                        {isExporting === format && <LoadingSpinner size="sm" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Export includes meeting metadata, participant list, and selected content.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}