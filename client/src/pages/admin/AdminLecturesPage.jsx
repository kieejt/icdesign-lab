import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

export default function AdminLecturesPage() {
  const [lectures, setLectures] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit states
  const [editMode, setEditMode] = useState(false);
  const [editLectureId, setEditLectureId] = useState(null);

  const loadLectures = async () => {
    try {
      const { data } = await api.get('/lectures');
      setLectures(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load lectures');
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editMode) {
        await api.put(`/lectures/${editLectureId}`, {
          title,
          description,
          youtubeUrl,
          materialUrl
        });
        setSuccess(`Lecture "${title}" has been successfully updated.`);
        setEditMode(false);
        setEditLectureId(null);
      } else {
        await api.post('/lectures', {
          title,
          description,
          youtubeUrl,
          materialUrl
        });
        setSuccess(`Lecture "${title}" has been successfully uploaded.`);
      }
      setTitle('');
      setDescription('');
      setYoutubeUrl('');
      setMaterialUrl('');
      loadLectures();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} lecture`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (lec) => {
    setTitle(lec.title || '');
    setDescription(lec.description || '');
    setYoutubeUrl(lec.youtubeUrl || '');
    setMaterialUrl(lec.materialUrl || '');
    setEditLectureId(lec._id);
    setEditMode(true);
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setTitle('');
    setDescription('');
    setYoutubeUrl('');
    setMaterialUrl('');
    setEditLectureId(null);
    setEditMode(false);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id, lectureTitle) => {
    if (!window.confirm(`Are you sure you want to delete lecture "${lectureTitle}"? All student questions and answers on this lecture will be lost.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await api.delete(`/lectures/${id}`);
      setSuccess(`Lecture "${lectureTitle}" deleted.`);
      loadLectures();
      if (editMode && editLectureId === id) {
        handleCancelEdit();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lecture');
    }
  };


  return (
    <div className="space-y-12">
      
      {/* Page Title */}
      <div className="border-b border-paper-border pb-5">
        <h2 className="text-3xl font-bold text-ink-900 tracking-tight">
          Upload Video Lectures
        </h2>
        <p className="mt-2 text-sm text-ink-500 font-light">
          Publish learning videos and slides for lab students. Students can watch videos, download materials, and ask questions here.
        </p>
      </div>

      {/* Notifications */}
      {error && <ErrorText message={error} />}
      {success && (
        <div className="border border-ink-900 bg-paper-sunken px-4 py-3 text-sm text-ink-900 font-medium">
          {success}
        </div>
      )}

      {/* Upload Form Card */}
      <div className="border border-paper-border p-6 sm:p-8 bg-paper-raised">
        <h3 className="text-lg font-bold text-ink-900 mb-6">
          {editMode ? `Edit Lecture: ${title}` : 'Publish New Lecture'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                Lecture Title <span className="text-signal-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="e.g. CMOS VLSI Lecture 1: MOSFET Physics"
                required
              />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                YouTube Video Link
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="e.g. https://www.youtube.com/watch?v=..."
              />
              <p className="text-[10px] text-ink-400 mt-1 font-light">Copy and paste the full YouTube browser link or sharing URL.</p>
            </div>

            {/* Material/Drive URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                Teaching Material Link (slides/PDFs)
              </label>
              <input
                type="url"
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="e.g. https://drive.google.com/file/d/..."
              />
              <p className="text-[10px] text-ink-400 mt-1 font-light">Set your Google Drive slide/PDF sharing to "Anyone with the link can view".</p>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-ink-500 mb-2">
                Lecture Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full border border-paper-border py-3 px-4 text-ink-900 focus:border-ink-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder="Provide a brief summary of the topics covered in this lecture..."
              />
            </div>

          </div>

          <div className="flex justify-end gap-3">
            {editMode && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-ink-700 border border-paper-border hover:bg-paper-sunken transition-colors"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-paper bg-ink-900 hover:bg-ink-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : (editMode ? 'Update Lecture' : 'Publish Lecture')}
            </button>
          </div>
        </form>
      </div>

      {/* Lectures List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink-900">Current Video Lectures ({lectures.length})</h3>
        
        <div className="border-t border-ink-900 overflow-x-auto">
          <table className="min-w-full divide-y divide-paper-border text-left">
            <thead>
              <tr className="bg-paper-sunken/50">
                <th className="py-4 pl-4 pr-4 text-xs font-bold uppercase tracking-widest text-ink-500">Lecture Info</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-widest text-ink-500">YouTube Embed ID</th>
                <th className="py-4 pl-4 pr-4 text-right text-xs font-bold uppercase tracking-widest text-ink-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-paper-raised">
              {lectures.map((lec) => (
                <tr key={lec._id} className="hover:bg-paper-sunken/50 transition-colors">
                  <td className="py-4 pl-4 pr-4 max-w-sm">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-ink-900 block truncate">{lec.title}</span>
                      {lec.description && (
                        <span className="text-xs font-light text-ink-500 block truncate">{lec.description}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-light text-ink-500 block truncate max-w-xs">{lec.youtubeUrl || 'None'}</span>
                  </td>
                  <td className="py-4 pl-4 pr-4 text-right space-x-2">
                    <button
                      onClick={() => handleStartEdit(lec)}
                      className="inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-600 hover:text-ink-900 hover:bg-paper-sunken transition-colors"
                    >
                      Edit →
                    </button>
                    <button
                      onClick={() => handleDelete(lec._id, lec.title)}
                      className="inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-signal-danger hover:text-signal-danger hover:bg-signal-dangerSoft transition-colors"
                    >
                      Delete →
                    </button>
                  </td>
                </tr>
              ))}

              {lectures.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-ink-500 font-light text-sm">
                    No learning lectures published. Add your first lecture reference above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
