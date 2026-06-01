import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({
    title: '',
    subject: '',
    link: '',
    isLabOwned: false,
    downloadUrl: '',
    type: 'Free'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // States for bulk operation and excel import
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkSection, setShowBulkSection] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);


  const loadDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Simple validation for lab-owned books
    if (form.isLabOwned && !form.downloadUrl.trim()) {
      setError('Google Drive download URL is required for lab-owned books.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/documents', {
        ...form,
        downloadUrl: form.isLabOwned ? form.downloadUrl : ''
      });
      setForm({
        title: '',
        subject: '',
        link: '',
        isLabOwned: false,
        downloadUrl: '',
        type: 'Free'
      });
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book reference?')) return;
    try {
      await api.delete(`/documents/${id}`);
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleSelectDoc = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map(doc => doc._id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected books? This action cannot be undone.`)) return;
    
    setLoading(true);
    setError('');
    try {
      await api.post('/documents/bulk-delete', { ids: selectedIds });
      setSelectedIds([]);
      await loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete selected documents');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const headers = [
      'Title (Tiêu đề)',
      'Subject (Chủ đề)',
      'Reference Link (Link tham khảo)',
      'Access Type (Loại truy cập: Free/Paid)',
      'Is Lab Owned (Tài liệu của Lab: Yes/No)',
      'Download Link (Link tải Google Drive nếu có)'
    ];
    
    const sampleRows = [
      [
        'CMOS VLSI Design: A Circuits and Systems Perspective',
        'VLSI Design',
        'https://www.amazon.com/CMOS-VLSI-Design-Circuits-Perspective/dp/0321547748',
        'Free',
        'Yes',
        'https://drive.google.com/file/d/12345sampleGdriveLink/view'
      ],
      [
        'Digital Integrated Circuits: A Design Perspective',
        'Digital ICs',
        'https://www.amazon.com/Digital-Integrated-Circuits-Design-Perspective/dp/0130905509',
        'Paid',
        'No',
        ''
      ]
    ];

    const wsData = [headers, ...sampleRows];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Documents Template');
    XLSX.writeFile(wb, 'ICDesign_Documents_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          setError('The Excel file is empty.');
          return;
        }
        
        const headers = jsonData[0].map(h => String(h).trim());
        const rows = jsonData.slice(1);
        
        const findColIndex = (patterns) => {
          return headers.findIndex(h => 
            patterns.some(p => h.toLowerCase().includes(p.toLowerCase()))
          );
        };
        
        const titleIdx = findColIndex(['title', 'tiêu đề', 'tên sách', 'tên tài liệu']);
        const subjectIdx = findColIndex(['subject', 'topic', 'chủ đề', 'môn học']);
        const linkIdx = findColIndex(['link', 'reference', 'tham khảo', 'nxb', 'publisher']);
        const typeIdx = findColIndex(['type', 'loại', 'truy cập']);
        const ownedIdx = findColIndex(['owned', 'của lab', 'thuộc lab']);
        const downloadIdx = findColIndex(['download', 'gdrive', 'link tải', 'đường dẫn tải']);
        
        if (titleIdx === -1 || subjectIdx === -1 || linkIdx === -1) {
          setError('Could not find required columns in Excel sheet. Please make sure "Title", "Subject", and "Link" columns are present.');
          return;
        }
        
        const parsedRows = rows.map((row, index) => {
          if (row.length === 0 || row.every(val => val === undefined || val === null || val === '')) {
            return null;
          }

          const title = row[titleIdx] ? String(row[titleIdx]).trim() : '';
          const subject = row[subjectIdx] ? String(row[subjectIdx]).trim() : '';
          const link = row[linkIdx] ? String(row[linkIdx]).trim() : '';
          
          let type = 'Free';
          if (typeIdx !== -1 && row[typeIdx]) {
            const typeVal = String(row[typeIdx]).toLowerCase();
            if (typeVal.includes('paid') || typeVal.includes('mua') || typeVal.includes('tính phí')) {
              type = 'Paid';
            }
          }
          
          let isLabOwned = false;
          if (ownedIdx !== -1 && row[ownedIdx]) {
            const ownedVal = String(row[ownedIdx]).toLowerCase();
            if (ownedVal.includes('yes') || ownedVal.includes('có') || ownedVal.includes('true') || ownedVal === '1') {
              isLabOwned = true;
            }
          }
          
          const downloadUrl = (downloadIdx !== -1 && row[downloadIdx]) ? String(row[downloadIdx]).trim() : '';
          
          let isValid = true;
          let rowError = '';
          
          if (!title) {
            isValid = false;
            rowError = 'Title is required. ';
          }
          if (!subject) {
            isValid = false;
            rowError += 'Subject is required. ';
          }
          if (!link) {
            isValid = false;
            rowError += 'Reference Link is required. ';
          } else {
            try {
              new URL(link);
            } catch (_) {
              isValid = false;
              rowError += 'Reference Link must be a valid URL. ';
            }
          }
          
          if (isLabOwned && !downloadUrl) {
            isValid = false;
            rowError += 'Google Drive Download Link is required for Lab Owned materials. ';
          } else if (isLabOwned && downloadUrl) {
            try {
              new URL(downloadUrl);
            } catch (_) {
              isValid = false;
              rowError += 'Google Drive Download Link must be a valid URL. ';
            }
          }
          
          return {
            rowIndex: index + 2,
            title,
            subject,
            link,
            type,
            isLabOwned,
            downloadUrl,
            isValid,
            error: rowError
          };
        }).filter(Boolean);
        
        setBulkData(parsedRows);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Error reading Excel file. Please ensure it is a valid format.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkImport = async () => {
    const validItems = bulkData.filter(item => item.isValid);
    if (validItems.length === 0) {
      setError('No valid documents to import.');
      return;
    }

    setBulkLoading(true);
    setError('');
    try {
      await api.post('/documents/bulk', validItems.map(({ title, subject, link, isLabOwned, downloadUrl, type }) => ({
        title,
        subject,
        link,
        isLabOwned,
        downloadUrl,
        type
      })));
      
      setBulkData([]);
      setShowBulkSection(false);
      loadDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to bulk import documents.');
    } finally {
      setBulkLoading(false);
    }
  };


  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Manage Books & Documents
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Add, list, and delete textbook references and digital learning guides for the IC Design Lab.
        </p>
      </div>

      {/* Error Alert */}
      <ErrorText message={error} />

      {/* Modern Card Layout Form */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-6 sm:p-8">
        
        {/* Toggle headers */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add Book & Reference</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Add book references manually or upload in bulk from an Excel file.</p>
          </div>
          
          <div className="flex bg-slate-100 rounded-xl p-0.5" role="group">
            <button
              onClick={() => {
                setShowBulkSection(false);
                setError('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                !showBulkSection 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => {
                setShowBulkSection(true);
                setError('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                showBulkSection 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Excel Bulk Import
            </button>
          </div>
        </div>

        {showBulkSection ? (
          <div className="space-y-6">
            
            {/* Template download & upload zone */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Instructions and Download Template Card */}
              <div className="md:col-span-1 border border-indigo-50 bg-indigo-50/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 text-indigo-700 font-bold text-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4>Excel Template</h4>
                </div>
                
                <p className="text-xs text-slate-650 font-medium leading-relaxed">
                  Use our standardized template to format your book references list. Supports both English and Vietnamese column headers.
                </p>
                
                <button
                  onClick={downloadSampleTemplate}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="md:col-span-2">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all text-center group h-full">
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        Upload Excel spreadsheet
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        Drag and drop or click to choose .xlsx or .xls files
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleExcelUpload}
                  />
                </label>
              </div>

            </div>

            {/* Preview table if data is parsed */}
            {bulkData.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-900">
                    Preview Data ({bulkData.length} records parsed)
                  </h4>
                  <div className="flex gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {bulkData.filter(d => d.isValid).length} Valid
                    </span>
                    {bulkData.some(d => !d.isValid) && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        {bulkData.filter(d => !d.isValid).length} Errors
                      </span>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Reference URL</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Lab Owned</th>
                        <th className="px-4 py-3">GDrive Link</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bulkData.map((row) => (
                        <tr key={row.rowIndex} className={`hover:bg-slate-50 ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                          <td className="px-4 py-3 text-slate-500 font-bold">#{row.rowIndex}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate" title={row.title}>{row.title}</td>
                          <td className="px-4 py-3 text-slate-600">{row.subject}</td>
                          <td className="px-4 py-3 text-indigo-600 truncate max-w-xs" title={row.link}>
                            <a href={row.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.link}</a>
                          </td>
                          <td className="px-4 py-3 font-medium">{row.type}</td>
                          <td className="px-4 py-3">{row.isLabOwned ? 'Yes' : 'No'}</td>
                          <td className="px-4 py-3 text-indigo-600 truncate max-w-xs" title={row.downloadUrl}>
                            {row.isLabOwned ? (
                              <a href={row.downloadUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{row.downloadUrl}</a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 cursor-help"
                                title={row.error}
                              >
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setBulkData([]);
                      setError('');
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={handleConfirmBulkImport}
                    disabled={bulkLoading || bulkData.filter(d => d.isValid).length === 0}
                    className="inline-flex justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {bulkLoading ? 'Importing...' : `Import ${bulkData.filter(d => d.isValid).length} Valid References`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Book Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="block w-full rounded-xl border-slate-200 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border"
                  placeholder="e.g. CMOS VLSI Design: A Circuits and Systems Perspective"
                  required
                />
              </div>

              {/* Subject / Topic */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Subject/Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="block w-full rounded-xl border-slate-200 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border"
                  placeholder="e.g. VLSI Design"
                  required
                />
              </div>

              {/* Access Type (Free vs Paid) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Access Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="block w-full rounded-xl border-slate-200 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border bg-white"
                  required
                >
                  <option value="Free">Free Access</option>
                  <option value="Paid">Purchase Required (Paid)</option>
                </select>
              </div>

              {/* Reference URL / Link */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reference URL / Publisher Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="block w-full rounded-xl border-slate-200 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border"
                  placeholder="e.g. https://www.amazon.com/... or publisher page"
                  required
                />
              </div>

              {/* Owned by Lab Toggle */}
              <div className="sm:col-span-2 flex items-center gap-3 py-2">
                <input
                  id="isLabOwned"
                  type="checkbox"
                  checked={form.isLabOwned}
                  onChange={(e) => setForm({ ...form, isLabOwned: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isLabOwned" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                  This book is owned by the Lab (Include Google Drive download link)
                </label>
              </div>

              {/* Conditionally Render Google Drive Download Link */}
              {form.isLabOwned && (
                <div className="sm:col-span-2 space-y-2 animate-fadeIn">
                  <label className="block text-sm font-semibold text-slate-700">
                    Google Drive Download Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={form.downloadUrl}
                    onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
                    className="block w-full rounded-xl border-slate-200 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border"
                    placeholder="e.g. https://drive.google.com/file/d/..."
                    required={form.isLabOwned}
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    Ensure the sharing settings on Google Drive are set to "Anyone with the link can view".
                  </p>
                </div>
              )}

            </div>

            {/* Submit button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Add Book Reference'}
              </button>
            </div>

          </form>
        )}
      </div>

      {/* Catalog Listing */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Current Catalog ({documents.length})</h3>
            {documents.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-2 bg-indigo-50/50 hover:bg-indigo-50 px-3.5 py-2 rounded-xl transition-all border border-indigo-100"
              >
                <input
                  type="checkbox"
                  checked={documents.length > 0 && selectedIds.length === documents.length}
                  onChange={() => {}} // handled by button click
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 pointer-events-none"
                />
                <span>{selectedIds.length === documents.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => {
            const isSelected = selectedIds.includes(doc._id);
            return (
              <div
                key={doc._id}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-50/50 bg-indigo-50/5' : 'border-slate-100'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox for selection */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectDoc(doc._id)}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer shrink-0"
                      />
                      <h4 
                        className="font-bold text-slate-900 text-base leading-snug line-clamp-2 cursor-pointer select-none"
                        onClick={() => handleSelectDoc(doc._id)}
                      >
                        {doc.title}
                      </h4>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete book"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="pl-7 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {doc.subject}
                    </span>
                    
                    {doc.type === 'Free' ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Free Access
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Paid Reference
                      </span>
                    )}

                    {doc.isLabOwned && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        Lab Owned (GDrive)
                      </span>
                    )}
                  </div>

                  <div className="pl-7 text-xs space-y-1 text-slate-500 font-medium">
                    <p className="truncate">
                      <span className="font-bold text-slate-700">Ref:</span> <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{doc.link}</a>
                    </p>
                    {doc.isLabOwned && doc.downloadUrl && (
                      <p className="truncate">
                        <span className="font-bold text-slate-700">GDrive:</span> <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{doc.downloadUrl}</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 font-medium shadow-sm">
              No books found in the database catalog. Add a new book reference to get started.
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between gap-6 z-50 border border-slate-800 w-[calc(100%-2rem)] max-w-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold ring-4 ring-indigo-500/20">
              {selectedIds.length}
            </span>
            <span className="text-sm font-semibold tracking-wide text-slate-200">
              {selectedIds.length === 1 ? 'Book selected' : 'Books selected'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-650 hover:bg-red-600 active:bg-red-750 px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
