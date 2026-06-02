import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function LecturesPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [currentUser, setCurrentUser] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfileAndLectures = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch current user identity & role
      const resProfile = await api.get('/auth/me');
      setCurrentUser(resProfile.data.user);

      // 2. Fetch course lecture modules
      const resLectures = await api.get('/lectures');
      setLectures(resLectures.data);
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndLectures();
  }, [token]);

  // Extract YouTube ID to get thumbnail image
  const getYoutubeThumbnailUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : '';
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-light tracking-wide animate-pulse">Entering Classroom...</p>
      </div>
    );
  }

  // Gatekeeper: restrict access to logged-in members
  if (!token || !currentUser) {
    return (
      <div className="w-full flex flex-col items-center bg-white selection:bg-slate-900 selection:text-white">

        {/* Page Header */}
        <section className="w-full pt-16 pb-24 border-b border-slate-200">
          <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Lab Classroom</h1>
            <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
              Advanced computer engineering and IC Design video lecture portal. Restricted access for registered students and lab staff.
            </p>
          </div>
        </section>

        {/* Lock Container */}
        <section className="w-full py-24 bg-white">
          <div className="max-w-md mx-auto px-4 text-center space-y-8">
            <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-900 shrink-0">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Access Restricted</h3>
              <p className="text-sm font-light text-slate-500 leading-relaxed">
                Please log in with your lab credentials to access educational modules, watch course videos, download slides, and ask the professor questions.
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center px-6 py-3 w-full text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Sign In to Lab Console →
            </button>
          </div>
        </section>

      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center selection:bg-slate-900 selection:text-white bg-white">

      {/* Header Banner */}
      <section className="w-full pt-16 pb-20 border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 text-left">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Lab Classroom</h1>
            <p className="text-lg text-slate-550 font-light max-w-xl">
              Study professional lecture content, review lecture slides, and discuss computer engineering details with our professor.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity:</span>
            <span className="inline-flex items-center border border-slate-900 bg-slate-900 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded select-none">
              {currentUser.role}
            </span>
          </div>
        </div>
      </section>

      {/* Grid listing area */}
      <section className="w-full py-16 md:py-24 bg-white">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">

          {error && <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">{error}</div>}

          {lectures.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 font-light text-sm">No lecture modules have been uploaded yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {lectures.map((lec) => {
                const thumbnailUrl = getYoutubeThumbnailUrl(lec.youtubeUrl);
                return (
                  <div
                    key={lec._id}
                    onClick={() => navigate(`/lectures/${lec._id}`)}
                    className="group bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between text-left"
                  >
                    {/* Lecture Card Header Image */}
                    <div className="w-full aspect-video bg-slate-100 overflow-hidden relative border-b border-slate-100 shrink-0">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={lec.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white/40">
                          <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}

                      {/* Interactive play hover effect */}
                      <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 flex items-center justify-center transition-all duration-300">
                        <div className="w-12 h-12 bg-white/95 border border-white/20 shadow-lg scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 rounded-full flex items-center justify-center text-slate-900 transition-all duration-300">
                          <svg className="w-5 h-5 ml-0.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Lecture Card Body */}
                    <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                          {new Date(lec.createdAt).toLocaleDateString()}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-2 leading-snug">
                          {lec.title}
                        </h3>
                        {lec.description && (
                          <p className="text-sm font-light text-slate-500 leading-relaxed line-clamp-3">
                            {lec.description}
                          </p>
                        )}
                      </div>

                      {/* Lecture Card Footer Metrics */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-450 uppercase tracking-wider">
                        <div className="flex items-center gap-3">
                          <span>{lec.views || 0} views</span>
                          <span>•</span>
                          <span>{lec.comments?.length || 0} QA</span>
                        </div>
                        <span className="text-slate-900 group-hover:translate-x-1.5 transition-transform duration-300">
                          Study Module →
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
