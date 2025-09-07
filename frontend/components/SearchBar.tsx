'use client';

import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  showFilters?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search meetings...",
  isLoading = false,
  showFilters = false,
  onFilterClick,
  className = ''
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(value);
  };

  const handleClear = () => {
    onChange('');
    onSearch?.('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className={`relative flex items-center transition-all ${
        isFocused 
          ? 'ring-2 ring-blue-500 ring-opacity-50' 
          : 'ring-1 ring-gray-300 dark:ring-gray-600'
      } rounded-lg bg-white dark:bg-gray-800`}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {showFilters && (
            <button
              type="button"
              onClick={onFilterClick}
              className="p-2 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search suggestions could be added here */}
    </form>
  );
}

// Global search component with tabs
interface GlobalSearchProps {
  onClose: () => void;
  className?: string;
}

export function GlobalSearch({ onClose, className = '' }: GlobalSearchProps) {
  const [activeTab, setActiveTab] = useState<'meetings' | 'transcripts'>('meetings');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Implementation would depend on your API
      // const response = await apiClient.search(searchQuery, activeTab);
      // setResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Search
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          placeholder="Search across all meetings and transcripts..."
          isLoading={isLoading}
        />
        
        {/* Tabs */}
        <div className="flex mt-4 space-x-1">
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-3 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'meetings'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Meetings
          </button>
          <button
            onClick={() => setActiveTab('transcripts')}
            className={`px-3 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'transcripts'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Transcripts
          </button>
        </div>
      </div>
      
      {/* Results */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
          </div>
        )}
        
        {!isLoading && query && results.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No results found for "{query}"
          </div>
        )}
        
        {!query && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Enter a search query to find meetings and transcripts
          </div>
        )}
        
        {/* Results list would go here */}
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              {/* Result content */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}