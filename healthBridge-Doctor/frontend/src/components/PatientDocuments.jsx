/**
 * Patient Documents Component
 * 
 * Features:
 * - View all patient documents
 * - Filter by document type
 * - Download documents
 * - Preview PDFs
 * - Upload new documents
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye, Upload, Filter, Calendar, File } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

const PatientDocuments = ({ patientId }) => {
  const [filterType, setFilterType] = useState('all');
  const [previewDoc, setPreviewDoc] = useState(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      const response = await api.get(`/doctor/patients/${patientId}/documents`);
      return response.data.documents || [];
    }
  });

  const documentTypes = [
    { value: 'all', label: 'All Documents', icon: File },
    { value: 'prescription', label: 'Prescriptions', icon: FileText },
    { value: 'lab_report', label: 'Lab Reports', icon: FileText },
    { value: 'medical_record', label: 'Medical Records', icon: FileText },
    { value: 'other', label: 'Other', icon: File }
  ];

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'prescription':
        return <FileText className="text-blue-600" size={24} />;
      case 'lab_report':
        return <FileText className="text-green-600" size={24} />;
      case 'medical_record':
        return <FileText className="text-purple-600" size={24} />;
      default:
        return <File className="text-gray-600" size={24} />;
    }
  };

  const getDocumentTypeLabel = (type) => {
    const typeObj = documentTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const filteredDocuments = documents?.filter(doc => 
    filterType === 'all' || doc.type === filterType
  ) || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} className="text-blue-600" />
            Documents
          </h2>

          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Upload size={16} />
            Upload Document
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {documentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                  ${filterType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <Icon size={16} />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">
              {filterType === 'all' ? 'No documents available' : `No ${getDocumentTypeLabel(filterType).toLowerCase()}`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getDocumentIcon(doc.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {doc.name || `${getDocumentTypeLabel(doc.type)} - ${format(new Date(doc.createdAt), 'MMM dd, yyyy')}`}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Calendar size={14} />
                    <span>{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                  </div>

                  {doc.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  {doc.ocrConfidence && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-600 mb-1">
                        OCR Confidence: {(doc.ocrConfidence * 100).toFixed(0)}%
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${doc.ocrConfidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      Preview
                    </button>
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-1"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                  {doc.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document Summary */}
      {documents && documents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {documents.length}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {documents.filter(d => d.type === 'prescription').length}
              </div>
              <div className="text-sm text-gray-600">Prescriptions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {documents.filter(d => d.type === 'lab_report').length}
              </div>
              <div className="text-sm text-gray-600">Lab Reports</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {documents.filter(d => d.type === 'medical_record').length}
              </div>
              <div className="text-sm text-gray-600">Records</div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-800">
                {previewDoc.name || 'Document Preview'}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {previewDoc.url.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full min-h-[600px]"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="Document"
                  className="max-w-full h-auto mx-auto"
                />
              )}
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => window.open(previewDoc.url, '_blank')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Open in New Tab
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;

