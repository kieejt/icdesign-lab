import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import ErrorText from '../components/ErrorText';

export default function LectureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [currentUser, setCurrentUser] = useState(null);
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Q&A state
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfileAndLecture = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch current user identity & role
      const resProfile = await api.get('/auth/me');
      setCurrentUser(resProfile.data.user);

      // 2. Fetch single lecture details (which increments views count on server)
      const resLecture = await api.get(`/lectures/${id}`);
      setLecture(resLecture.data);
    } catch (err) {
      console.error('Failed to load lecture details:', err);
      if (err.response?.status === 404) {
        setError('Lecture module not found.');
      } else {
        setError('Failed to validate session token or load lecture contents.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndLecture();
  }, [id, token]);

  // Parse YouTube video ID from URL
  const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : '';
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  // Student posts a new question
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !lecture) return;

    setActionLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/lectures/${lecture._id}/comments`, { text: commentText });
      setLecture(data);
      setCommentText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit question');
    } finally {
      setActionLoading(false);
    }
  };

  // Professor replies to a question
  const handlePostReply = async (commentId) => {
    const text = replyText[commentId];
    if (!text || !text.trim() || !lecture) return;

    setActionLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/lectures/${lecture._id}/comments/${commentId}/replies`, { text });
      setLecture(data);
      setReplyText(prev => ({ ...prev, [commentId]: '' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit reply');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin deletes a comment
  const handleDeleteComment = async (commentId) => {
    if (!lecture || !window.confirm('Are you sure you want to delete this comment?')) return;

    setActionLoading(true);
    setError('');
    try {
      const { data } = await api.delete(`/lectures/${lecture._id}/comments/${commentId}`);
      setLecture(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
        <p className="text-slate-550 font-light tracking-wide animate-pulse">Entering Classroom...</p>
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
            <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-650 leading-relaxed font-light">
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
              onClick={() => navigate('/admin/login')}
              className="inline-flex items-center justify-center px-6 py-3 w-full text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 transition-colors"
            >
              Sign In to Lab Console →
            </button>
          </div>
        </section>

      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="max-w-[80rem] mx-auto px-4 py-24 text-center bg-white">
        <div className="max-w-md mx-auto space-y-6">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
            <p className="text-sm font-semibold">{error || 'An unexpected error occurred.'}</p>
          </div>
          <Link
            to="/lectures"
            className="inline-flex items-center justify-center border border-slate-900 hover:bg-slate-900 hover:text-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors"
          >
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center selection:bg-slate-900 selection:text-white bg-white">
      
      {/* 1. Header Banner with Navigation back link */}
      <section className="w-full pt-10 pb-12 border-b border-slate-200 bg-slate-50/40">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6 text-left">
          <div>
            <Link
              to="/lectures"
              className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors gap-1.5"
            >
              ← Back to Classroom
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900 leading-tight">
                {lecture.title}
              </h1>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-450 uppercase tracking-wider">
                <span>Published: {new Date(lecture.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>👁 {lecture.views} views</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity:</span>
              <span className="inline-flex items-center border border-slate-900 bg-slate-900 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main content and Q&A */}
      <section className="w-full py-12 md:py-16">
        <div className="max-w-[64rem] mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-12">
          
          {error && <ErrorText message={error} />}

          {/* YouTube Embed Player */}
          {lecture.youtubeUrl ? (
            <div className="w-full aspect-video bg-slate-900 border border-slate-250 relative overflow-hidden rounded-2xl shadow-sm">
              <iframe
                src={getYoutubeEmbedUrl(lecture.youtubeUrl)}
                title={lecture.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="w-full aspect-video bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-500 font-light text-sm gap-2 rounded-2xl">
              <svg className="w-8 h-8 opacity-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span>No lecture video provided.</span>
            </div>
          )}

          {/* Description & slide download */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 pt-4">
            
            {/* Description */}
            <div className="flex-1 space-y-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Lecture Summary</h3>
              {lecture.description ? (
                <p className="text-slate-700 font-light leading-relaxed whitespace-pre-wrap text-base">
                  {lecture.description}
                </p>
              ) : (
                <p className="text-slate-400 italic font-light text-sm">No lecture overview provided.</p>
              )}
            </div>

            {/* Slide Downloader Button Card */}
            {lecture.materialUrl && (
              <div className="w-full md:w-80 p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-4 text-left">
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-900">Lecture Handouts</h4>
                  <p className="text-xs text-slate-500 font-light">Download lecture slides and pdf documents.</p>
                </div>
                <a
                  href={lecture.materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors rounded-lg shadow-sm"
                >
                  Download PDF Slides →
                </a>
              </div>
            )}

          </div>

          {/* 3. Discussion Q&A Board */}
          <div className="pt-12 border-t border-slate-200 space-y-8 text-left">
            
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Classroom Discussion</h3>
              <p className="text-xs text-slate-500 font-light mt-1">
                Post conceptual questions regarding this lecture module. Replies will be reviewed by the professor.
              </p>
            </div>

            {/* Question Submit Form (only for student role or anyone who wants to ask) */}
            {currentUser.role === 'student' && (
              <form onSubmit={handlePostComment} className="space-y-4 pt-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  className="block w-full border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:border-slate-900 focus:ring-0 sm:text-sm bg-transparent placeholder:text-slate-450 resize-none transition-colors"
                  placeholder="Ask a conceptual question about this lecture..."
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={actionLoading || !commentText.trim()}
                    className="inline-flex items-center justify-center px-6 py-3 text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors rounded-lg shadow-sm"
                  >
                    {actionLoading ? 'Posting...' : 'Ask Question'}
                  </button>
                </div>
              </form>
            )}

            {/* Discussion Threads */}
            <div className="space-y-8 pt-4">
              {lecture.comments && lecture.comments.map((comment) => {
                const studentInitial = comment.email ? comment.email.charAt(0).toUpperCase() : 'S';
                return (
                  <div key={comment._id} className="border-t border-slate-100 pt-8 pb-4 space-y-6 animate-fadeIn">
                    
                    {/* Student Question Card */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold uppercase shrink-0 select-none">
                        {studentInitial}
                      </div>
                      <div className="flex-1 space-y-1.5 text-left">
                        <p className="text-slate-900 text-base font-normal leading-relaxed font-sans">
                          {comment.text}
                        </p>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-2">
                            <span>{comment.email}</span>
                            <span>•</span>
                            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                          </div>
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="text-red-650 hover:text-red-800 transition-colors uppercase font-bold text-xs tracking-wider shrink-0"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Professor Nested Replies */}
                    {comment.replies && comment.replies.map((reply) => {
                      const profInitial = reply.email ? reply.email.charAt(0).toUpperCase() : 'P';
                      return (
                        <div key={reply._id} className="pl-12 md:pl-16 flex items-start gap-4 animate-fadeIn">
                          <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center text-white text-[10px] font-bold uppercase shrink-0 select-none">
                            {profInitial}
                          </div>
                          <div className="flex-1 space-y-1.5 text-left">
                            <p className="text-slate-800 text-base font-medium leading-relaxed font-sans">
                              {reply.text}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-550">
                              <span>{reply.email}</span>
                              <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase border border-slate-900 text-slate-900 bg-transparent select-none">
                                PROFESSOR
                              </span>
                              <span>•</span>
                              <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Professor inline Reply Box (restricted to Admin role) */}
                    {currentUser.role === 'admin' && (
                      <div className="pl-12 md:pl-16 pt-2">
                        <div className="flex gap-4 w-full">
                          <input
                            type="text"
                            value={replyText[comment._id] || ''}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [comment._id]: e.target.value }))}
                            className="block flex-1 border-b border-slate-200 py-2.5 px-0 text-sm text-slate-900 focus:border-slate-900 focus:ring-0 bg-transparent placeholder:text-slate-450 transition-colors"
                            placeholder="Type official professor response..."
                          />
                          <button
                            onClick={() => handlePostReply(comment._id)}
                            disabled={actionLoading || !replyText[comment._id]?.trim()}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}

              {(!lecture.comments || lecture.comments.length === 0) && (
                <div className="text-center py-12 border-t border-slate-100">
                  <p className="text-slate-400 italic font-light text-xs">No conceptual questions asked yet on this lecture module.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
