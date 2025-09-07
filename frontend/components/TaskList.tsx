'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, User, Calendar, Flag } from 'lucide-react';
import type { ActionItem } from '@/types';
import { apiClient, handleApiError } from '@/lib/api';

interface TaskListProps {
  actionItems: ActionItem[];
  onUpdate?: (itemId: string, updates: Partial<ActionItem>) => void;
  canEdit?: boolean;
  className?: string;
}

export function TaskList({ actionItems, onUpdate, canEdit = false, className = '' }: TaskListProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const updateActionItem = async (itemId: string, updates: Partial<{ status: string; dueDate: string; assignee: string }>) => {
    if (!canEdit) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      await apiClient.updateActionItem(itemId, updates);
      onUpdate?.(itemId, updates);
    } catch (error) {
      console.error('Failed to update action item:', handleApiError(error));
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const getItemColor = (item: ActionItem) => {
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

  const getItemIcon = (item: ActionItem) => {
    if (item.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
    
    if (item.dueDate && new Date(item.dueDate) < new Date()) {
      return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
    
    return <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />;
  };

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const isOverdue = (item: ActionItem) => {
    return item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed';
  };

  if (!actionItems.length) {
    return (
      <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No action items for this meeting.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {actionItems.map((item) => {
          const isUpdating = updatingItems.has(item.id);
          
          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all ${getItemColor(item)} ${
                isUpdating ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getItemIcon(item)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <p className={`text-sm font-medium ${
                      item.status === 'completed' 
                        ? 'line-through text-gray-500 dark:text-gray-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {item.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        <Flag className="w-3 h-3 mr-1" />
                        {item.priority}
                      </span>
                      
                      {canEdit ? (
                        <select
                          value={item.status}
                          onChange={(e) => updateActionItem(item.id, { status: e.target.value })}
                          disabled={isUpdating}
                          className={`text-xs rounded-full border-0 px-2 py-1 font-medium ${getStatusColor(item.status)} ${
                            isUpdating ? 'cursor-wait' : 'cursor-pointer'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                    {item.assignee && (
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        <span>{item.assignee}</span>
                      </div>
                    )}
                    
                    {item.dueDate && (
                      <div className={`flex items-center ${
                        isOverdue(item) ? 'text-red-600 dark:text-red-400' : ''
                      }`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>
                          Due {format(new Date(item.dueDate), 'MMM d, yyyy')}
                          {isOverdue(item) && (
                            <span className="ml-1 font-medium">(Overdue)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress indicator for in-progress items */}
                  {item.status === 'in_progress' && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>In Progress</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {actionItems.length}
            </div>
          </div>
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">In Progress</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {actionItems.filter(item => item.status === 'in_progress').length}
            </div>
          </div>
          <div>
            <div className="font-semibold text-green-600 dark:text-green-400">Completed</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {actionItems.filter(item => item.status === 'completed').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}