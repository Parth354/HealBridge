import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

const DataLoader = ({ 
  children, 
  isLoading, 
  error, 
  onRetry, 
  emptyState,
  loadingComponent 
}) => {
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
        <p className="text-red-700 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return children || emptyState;
};

export default DataLoader;