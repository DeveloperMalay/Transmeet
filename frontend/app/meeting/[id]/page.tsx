'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare, 
  CheckSquare,
  Share2,
  Download
} from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TranscriptViewer } from '@/components/TranscriptViewer';
import { MeetingSummary } from '@/components/MeetingSummary';
import { TaskList } from '@/components/TaskList';
import { ExportMenu } from '@/components/ExportMenu';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useMeeting } from '@/hooks/useMeetings';
import { useTranscript, useSummary } from '@/hooks/useTranscript';

interface MeetingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const { id } = use(params);
  
  return (
    <ProtectedRoute>
      <MeetingDetailContent meetingId={id} />
    </ProtectedRoute>
  );
}

function MeetingDetailContent({ meetingId }: { meetingId: string }) {
  const { meeting, isLoading: meetingLoading, error: meetingError } = useMeeting(meetingId);
  const { transcript, segments, isLoading: transcriptLoading } = useTranscript(meetingId);
  const { summary, isLoading: summaryLoading } = useSummary(meetingId);
  
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'tasks'>('summary');

  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (meetingError || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-500 mb-4">
            <MessageSquare className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Meeting Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {meetingError || 'The meeting you\'re looking for doesn\'t exist or you don\'t have access to it.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const tabs = [
    {
      id: 'summary' as const,
      label: 'Summary',
      icon: MessageSquare,
      available: meeting.hasSummary || summary,
      loading: summaryLoading
    },
    {
      id: 'transcript' as const,
      label: 'Transcript',
      icon: FileText,
      available: meeting.hasTranscript || segments.length > 0,
      loading: transcriptLoading
    },
    {
      id: 'tasks' as const,
      label: 'Action Items',
      icon: CheckSquare,
      available: summary?.actionItems && summary.actionItems.length > 0,
      loading: summaryLoading
    }
  ];

  const availableTabs = tabs.filter(tab => tab.available);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
              <div className="h-6 border-l border-gray-300 dark:border-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {meeting.topic}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Hosted by {meeting.hostName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              
              <ExportMenu
                meetingId={meeting.id}
                meetingTitle={meeting.topic}
                hasTranscript={meeting.hasTranscript}
                hasSummary={meeting.hasSummary}
                hasActionItems={summary?.actionItems ? summary.actionItems.length > 0 : false}
              />
            </div>
          </div>
          
          {/* Meeting Info */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              {format(new Date(meeting.startTime), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              {format(new Date(meeting.startTime), 'h:mm a')} • {formatDuration(meeting.duration)}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 mr-2" />
              {meeting.participants.length} participants
            </div>
            <div className="flex items-center text-sm">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                meeting.status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : meeting.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {meeting.status.replace('_', ' ')}
              </div>
            </div>
          </div>
          
          {/* Participants */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Participants ({meeting.participants.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {meeting.participants.map(participant => (
                <span
                  key={participant.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                >
                  {participant.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Processing Notice */}
        {!meeting.hasTranscript && !meeting.hasSummary && (
          <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center">
              <LoadingSpinner size="sm" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Processing Meeting
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  We're generating the transcript and summary for this meeting. This usually takes a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {availableTabs.length > 0 && (
          <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {availableTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                      {tab.loading && <LoadingSpinner size="sm" className="ml-2" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'summary' && (
            <MeetingSummary 
              summary={summary} 
              isLoading={summaryLoading} 
            />
          )}
          
          {activeTab === 'transcript' && (
            <TranscriptViewer 
              segments={segments} 
              isLoading={transcriptLoading} 
            />
          )}
          
          {activeTab === 'tasks' && summary && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Action Items
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Tasks and follow-ups identified from this meeting
                </p>
              </div>
              <div className="p-6">
                <TaskList 
                  actionItems={summary.actionItems} 
                  canEdit={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* No Content State */}
        {availableTabs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Content Processing
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This meeting is still being processed. Check back in a few minutes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}