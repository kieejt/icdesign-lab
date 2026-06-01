import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import ErrorText from '../../components/ErrorText';

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

  const loadEvents = async () => {
    try {
      const { data } = await api.get('/lab-events');
      setEvents(data);
    } catch (err) {
      setError('Failed to load events');
    }
  };

  useEffect(() => { loadEvents(); }, []);

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
    </div>
  );
}

function GalleryManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', category: '', imageUrl: '' });
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');

  const loadItems = async () => {
    try {
      const { data } = await api.get('/gallery');
      setItems(data);
    } catch (err) {
      setError('Failed to load gallery items');
    }
  };

  useEffect(() => { loadItems(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/gallery/${editingId}`, form);
      } else {
        await api.post('/gallery', form);
      }
      setForm({ title: '', category: '', imageUrl: '' });
      setEditingId('');
      loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save gallery item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gallery item?')) return;
    try {
      await api.delete(`/gallery/${id}`);
      loadItems();
    } catch (err) {
      setError('Failed to delete gallery item');
    }
  };

  return (
    <div>
      <ErrorText message={error} />
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="flex gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1 rounded border px-3 py-2" placeholder="Image Title" required />
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-1/3 rounded border px-3 py-2" placeholder="Category (e.g. Team, Event)" required />
        </div>
        <input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Image URL" required />
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">{editingId ? 'Update Item' : 'Add Image'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(''); setForm({ title: '', category: '', imageUrl: '' }); }} className="rounded bg-slate-500 px-4 py-2 text-white">Cancel</button>}
        </div>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item._id} className="rounded bg-slate-100 overflow-hidden relative group">
            <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />
            <div className="p-2">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-slate-500">{item.category}</p>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditingId(item._id);
                  setForm({ title: item.title, category: item.category, imageUrl: item.imageUrl });
                }}
                className="rounded bg-amber-500 p-1.5 text-white shadow"
                title="Edit"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button onClick={() => handleDelete(item._id)} className="rounded bg-red-600 p-1.5 text-white shadow" title="Delete">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
