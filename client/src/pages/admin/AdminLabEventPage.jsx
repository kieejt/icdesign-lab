import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';
import Pagination from '../../components/Pagination';

export default function AdminLabEventPage() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 border-b border-slate-200 pb-4">Manage Lab Events & Gallery</h2>
      
      <div className="mb-6 flex gap-4 border-b border-slate-200">
        <button
          className={`pb-2 px-2 ${activeTab === 'events' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-slate-500'}`}
          onClick={() => setActiveTab('events')}
        >
          Lab Events
        </button>
        <button
          className={`pb-2 px-2 ${activeTab === 'gallery' ? 'border-b-2 border-blue-600 font-semibold text-blue-600' : 'text-slate-500'}`}
          onClick={() => setActiveTab('gallery')}
        >
          Gallery
        </button>
      </div>

      {activeTab === 'events' ? <EventsManager /> : <GalleryManager />}
    </div>
  );
}

function EventsManager() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ title: '', date: '', location: '', status: 'Upcoming', description: '' });
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lab-events', { params: { page, limit: 10 } });
      setEvents(data.data);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/lab-events/${editingId}`, form);
      } else {
        await api.post('/lab-events', form);
      }
      setForm({ title: '', date: '', location: '', status: 'Upcoming', description: '' });
      setEditingId('');
      loadEvents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/lab-events/${id}`);
      loadEvents();
    } catch (err) {
      setError('Failed to delete event');
    }
  };

  return (
    <div>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Event Title" required />
        <div className="flex gap-3">
          <input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Date (e.g. August 15, 2026)" required />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Location" required />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded border px-3 py-2" required>
            <option value="Upcoming">Upcoming</option>
            <option value="Past">Past</option>
          </select>
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-24 w-full rounded border px-3 py-2" placeholder="Description" required />
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update Event' : 'Create Event'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setForm({ title: '', date: '', location: '', status: 'Upcoming', description: '' }); }} className="rounded bg-slate-500 px-4 py-2 text-white">Cancel</button>}
        </div>
      </form>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event._id} className="rounded bg-slate-100 p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">{event.title}</p>
                <p className="text-sm text-slate-600">{event.date} • {event.location} • <span className={event.status === 'Upcoming' ? 'text-amber-600 font-medium' : 'text-slate-500'}>{event.status}</span></p>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{event.description}</p>
              </div>
              <div className="flex gap-2 shrink-0 ml-4">
                <button
                  onClick={() => {
                    setEditingId(event._id);
                    setForm({ title: event.title, date: event.date, location: event.location, status: event.status, description: event.description });
                  }}
                  className="rounded bg-amber-500 px-3 py-1 text-sm text-white"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(event._id)} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
      </div>
    </div>
  );
}

function GalleryManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', category: '', coverImage: '', images: [] });
  const [files, setFiles] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/gallery', { params: { page, limit: 12 } });
      setItems(data.data);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError('Failed to load gallery albums');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUploadProgress(0);
    try {
      let uploadedUrls = [];
      if (files && files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('images', f));
        const res = await api.post('/upload/batch', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        uploadedUrls = res.data.urls;
      }

      setUploadProgress('Saving...');

      const newImages = [...(form.images || []), ...uploadedUrls];
      const payload = {
        title: form.title,
        category: form.category,
        images: newImages,
        coverImage: form.coverImage || newImages[0] || ''
      };

      if (editingId) {
        await api.put(`/gallery/${editingId}`, payload);
      } else {
        await api.post('/gallery', payload);
      }
      setForm({ title: '', category: '', coverImage: '', images: [] });
      setFiles(null);
      setEditingId('');
      setSelectedImages([]);
      // reset file input
      document.getElementById('album-files').value = '';
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save album');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this album and all its images?')) return;
    try {
      await api.delete(`/gallery/${id}`);
      loadItems();
    } catch (err) {
      setError('Failed to delete album');
    }
  };

  const toggleSelectImage = (index) => {
    setSelectedImages(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleBulkRemove = () => {
    if (!window.confirm(`Remove ${selectedImages.length} selected image(s)?`)) return;
    
    // Check if the cover image is among the removed ones
    const coverImageRemoved = selectedImages.some(i => form.images[i] === form.coverImage);
    
    const remainingImages = form.images.filter((_, i) => !selectedImages.includes(i));
    
    setForm({
      ...form,
      images: remainingImages,
      coverImage: coverImageRemoved ? (remainingImages[0] || '') : form.coverImage
    });
    setSelectedImages([]);
  };

  const handleEditClick = (item) => {
    setEditingId(item._id);
    setForm({ title: item.title, category: item.category, coverImage: item.coverImage || '', images: item.images || [] });
    setSelectedImages([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-4 mb-8 bg-slate-50 p-4 border border-slate-200 rounded-lg">
        <h3 className="font-semibold text-slate-900">{editingId ? 'Edit Album' : 'Create New Album'}</h3>
        <div className="flex gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1 rounded border px-3 py-2" placeholder="Album Title" required />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-1/3 rounded border px-3 py-2" placeholder="Category (e.g. 2026, Event)" required />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Add Images to Album (Max 50)</label>
          <input id="album-files" type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)} className="w-full rounded border px-3 py-2 bg-white" />
        </div>

        {editingId && form.images && form.images.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <p className="text-sm font-medium text-slate-700">Existing Images in Album</p>
              {selectedImages.length > 0 && (
                <button type="button" onClick={handleBulkRemove} className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition-colors">
                  Remove Selected ({selectedImages.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded bg-white">
              {form.images.map((imgUrl, i) => {
                const isSelected = selectedImages.includes(i);
                return (
                  <div 
                    key={i} 
                    onClick={() => toggleSelectImage(i)}
                    className={`group relative w-20 h-20 rounded overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-blue-600 scale-95 opacity-80' : 'border-transparent hover:opacity-90'}`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    )}
                    {form.coverImage === imgUrl && !isSelected && <span className="absolute top-0 left-0 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 uppercase backdrop-blur-sm shadow-sm">Cover</span>}
                    
                    {!isSelected && form.coverImage !== imgUrl && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setForm({ ...form, coverImage: imgUrl }); }} 
                        className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-bold uppercase py-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all text-center"
                      >
                        Set Cover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="pt-2">
              <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" placeholder="Cover Image URL (optional, defaults to first image)" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <div className="flex gap-2">
            <button type="submit" disabled={uploadProgress !== null} className="rounded bg-blue-600 px-5 py-2 text-white font-medium disabled:opacity-50">
              {uploadProgress !== null ? (typeof uploadProgress === 'number' ? `Uploading... ${uploadProgress}%` : uploadProgress) : (editingId ? 'Update Album' : 'Create Album')}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(''); setForm({ title: '', category: '', coverImage: '', images: [] }); setFiles(null); setSelectedImages([]); document.getElementById('album-files').value = ''; }} className="rounded bg-slate-500 px-4 py-2 text-white font-medium disabled:opacity-50" disabled={uploadProgress !== null}>
                Cancel
              </button>
            )}
          </div>
          
          {uploadProgress !== null && typeof uploadProgress === 'number' && (
            <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item._id} className="rounded-xl bg-white border border-slate-200 overflow-hidden relative group shadow-sm">
            <div className="w-full h-40 bg-slate-100 relative">
              {item.coverImage ? (
                <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-light text-sm">No cover</div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm">
                {item.images?.length || 0} photos
              </div>
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900 truncate" title={item.title}>{item.title}</p>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{item.category}</p>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEditClick(item)}
                className="rounded bg-amber-500 p-1.5 text-white shadow hover:bg-amber-600 transition-colors"
                title="Edit Album"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button onClick={() => handleDelete(item._id)} className="rounded bg-red-600 p-1.5 text-white shadow hover:bg-red-700 transition-colors" title="Delete Album">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-6">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
      </div>
    </div>
  );
}

