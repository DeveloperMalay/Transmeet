'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X, Play, Pause } from 'lucide-react';
import { useTranscriptSearch, useTranscriptPlayback } from '@/hooks/useTranscript';
import type { TranscriptSegment } from '@/types';
import { LoadingSpinner } from './LoadingSpinner';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  isLoading?: boolean;
  className?: string;
}

export function TranscriptViewer({ segments, isLoading = false, className = '' }: TranscriptViewerProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    currentMatch,
    currentMatchIndex,
    totalMatches,
    hasMatches,
    goToNextMatch,
    goToPrevMatch,
    clearSearch,
  } = useTranscriptSearch(segments);

  const {
    currentTime,
    currentSegment,
    isPlaying,
    setIsPlaying,
    goToTime,
    goToSegment,
    formatTime,
  } = useTranscriptPlayback(segments);

  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const segmentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Auto-scroll to current match
  useEffect(() => {
    if (currentMatch && segmentRefs.current[currentMatch.segment.id]) {
      segmentRefs.current[currentMatch.segment.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentMatch]);

  // Focus search input when opening
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark 
            key={index} 
            className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const getSpeakerColor = (speakerId: string) => {
    const colors = [
      'text-blue-600 dark:text-blue-400',
      'text-green-600 dark:text-green-400',
      'text-purple-600 dark:text-purple-400',
      'text-orange-600 dark:text-orange-400',
      'text-pink-600 dark:text-pink-400',
      'text-indigo-600 dark:text-indigo-400',
    ];
    
    // Simple hash function to assign consistent colors
    let hash = 0;
    for (let i = 0; i < speakerId.length; i++) {
      hash = speakerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading transcript...</span>
      </div>
    );
  }

  if (!segments.length) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        No transcript available for this meeting.
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header with Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Transcript
          </h3>
          <div className="flex items-center space-x-2">
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Search transcript"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {hasMatches && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                  {currentMatchIndex + 1} of {totalMatches}
                </div>
              )}
            </div>
            
            {hasMatches && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={goToPrevMatch}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                  title="Previous match"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMatch}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                  title="Next match"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => {
                setShowSearch(false);
                clearSearch();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Transcript Content */}
      <div className="max-h-96 overflow-y-auto">
        <div className="p-4 space-y-4">
          {segments.map((segment, index) => {
            const isCurrentSegment = currentSegment?.id === segment.id;
            const isHighlighted = currentMatch?.segment.id === segment.id;
            
            return (
              <div
                key={segment.id}
                ref={(el) => (segmentRefs.current[segment.id] = el)}
                className={`group flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                  isCurrentSegment 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : isHighlighted
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {/* Timestamp and Speaker */}
                <div className="flex-shrink-0 min-w-0 w-20">
                  <button
                    onClick={() => goToSegment(segment)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-mono"
                    title="Jump to timestamp"
                  >
                    {formatTime(segment.startTime)}
                  </button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium mb-1 ${getSpeakerColor(segment.speakerId)}`}>
                    {segment.speakerName}
                  </div>
                  <div className="text-gray-900 dark:text-gray-100 leading-relaxed">
                    {highlightText(segment.text, searchQuery)}
                  </div>
                </div>

                {/* Play button (visible on hover) */}
                <button
                  onClick={() => goToSegment(segment)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity"
                  title="Jump to this point"
                >
                  <Play className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{segments.length} segments</span>
          {hasMatches && (
            <span>{totalMatches} matches found</span>
          )}
        </div>
      </div>
    </div>
  );
}