'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Clock, Users, FileText, MessageSquare, Calendar } from 'lucide-react';
import type { Meeting } from '@/types';

interface MeetingCardProps {
  meeting: Meeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <Link href={`/meeting/${meeting.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {meeting.topic}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Hosted by {meeting.hostName}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
              {meeting.status.replace('_', ' ')}
            </span>
          </div>

          {/* Meeting Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              {format(new Date(meeting.startTime), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              {format(new Date(meeting.startTime), 'h:mm a')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 mr-2" />
              {meeting.participants.length} participants
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              {formatDuration(meeting.duration)}
            </div>
          </div>

          {/* Features Available */}
          <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {meeting.hasTranscript && (
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <FileText className="w-4 h-4 mr-1" />
                Transcript
              </div>
            )}
            {meeting.hasSummary && (
              <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                <MessageSquare className="w-4 h-4 mr-1" />
                Summary
              </div>
            )}
            {!meeting.hasTranscript && !meeting.hasSummary && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}