'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Users, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { MeetingSummary, ActionItem } from '@/types';
import { LoadingSpinner } from './LoadingSpinner';

interface MeetingSummaryProps {
  summary: MeetingSummary | null;
  isLoading?: boolean;
  className?: string;
}

export function MeetingSummary({ summary, isLoading = false, className = '' }: MeetingSummaryProps) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    keyPoints: true,
    actionItems: true,
    decisions: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getActionItemColor = (item: ActionItem) => {
    if (item.status === 'completed') {
      return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
    }
    
    if (item.dueDate && new Date(item.dueDate) < new Date()) {
      return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
    }
    
    if (item.priority === 'high') {
      return 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20';
    }
    
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
  };

  const getActionItemIcon = (item: ActionItem) => {
    if (item.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
    }
    
    if (item.dueDate && new Date(item.dueDate) < new Date()) {
      return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
    
    return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  };

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Generating summary...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        No summary available for this meeting.
      </div>
    );
  }

  const Section = ({ 
    title, 
    isExpanded, 
    onToggle, 
    children,
    count 
  }: { 
    title: string; 
    isExpanded: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    count?: number;
  }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {count !== undefined && (
            <span className="text-sm text-gray-500 dark:text-gray-400">({count})</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Meeting Summary
        </h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {format(new Date(summary.createdAt), 'MMM d, yyyy h:mm a')}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {summary.participants.length} participants
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Summary Section */}
        <Section
          title="Summary"
          isExpanded={expandedSections.summary}
          onToggle={() => toggleSection('summary')}
        >
          <div className="mt-3 prose prose-sm max-w-none dark:prose-invert">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {summary.summary}
            </p>
          </div>
        </Section>

        {/* Key Points */}
        <Section
          title="Key Points"
          isExpanded={expandedSections.keyPoints}
          onToggle={() => toggleSection('keyPoints')}
          count={summary.keyPoints.length}
        >
          <ul className="mt-3 space-y-2">
            {summary.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{point}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Action Items */}
        <Section
          title="Action Items"
          isExpanded={expandedSections.actionItems}
          onToggle={() => toggleSection('actionItems')}
          count={summary.actionItems.length}
        >
          <div className="mt-3 space-y-3">
            {summary.actionItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border ${getActionItemColor(item)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2 flex-1">
                    {getActionItemIcon(item)}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {item.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {item.assignee && (
                          <span>Assigned to: {item.assignee}</span>
                        )}
                        {item.dueDate && (
                          <span>Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : item.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {summary.actionItems.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No action items identified in this meeting.
              </p>
            )}
          </div>
        </Section>

        {/* Decisions */}
        {summary.decisions.length > 0 && (
          <Section
            title="Decisions Made"
            isExpanded={expandedSections.decisions}
            onToggle={() => toggleSection('decisions')}
            count={summary.decisions.length}
          >
            <ul className="mt-3 space-y-2">
              {summary.decisions.map((decision, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{decision}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Topics Discussed */}
        {summary.topics.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Topics Discussed</h4>
            <div className="flex flex-wrap gap-2">
              {summary.topics.map((topic, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}