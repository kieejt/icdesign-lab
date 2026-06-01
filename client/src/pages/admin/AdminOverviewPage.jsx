import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for replying inline to comments
  const [replyTexts, setReplyTexts] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [replySuccess, setReplySuccess] = useState('');
  
  // State for audit logs filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [resDashboard, resLogs] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/audit-logs')
      ]);
      setData(resDashboard.data);
      setAuditLogs(resLogs.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError('Failed to fetch console statistics. Ensure you have administrator rights.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePostReply = async (lectureId, commentId) => {
    const text = replyTexts[commentId];
    if (!text || !text.trim()) return;

    setReplyingId(commentId);
    setReplySuccess('');
    try {
      await api.post(`/lectures/${lectureId}/comments/${commentId}/replies`, { text: text.trim() });
      
      setReplySuccess('Reply posted successfully.');
      
      // Clear specific reply text
      setReplyTexts(prev => ({ ...prev, [commentId]: '' }));
      
      // Fade out the resolved comment from the dashboard feed after a short delay
      setTimeout(() => {
        setData(prev => ({
          ...prev,
          unansweredComments: prev.unansweredComments.filter(c => c.commentId !== commentId)
        }));
        setReplySuccess('');
      }, 1000);

      // Refresh Audit Log to reflect the reply
      const resLogs = await api.get('/analytics/audit-logs');
      setAuditLogs(resLogs.data);
    } catch (err) {
      console.error('Failed to post reply:', err);
      setError('Failed to submit professor reply.');
    } finally {
      setReplyingId(null);
    }
  };

  const handleDeleteComment = async (lectureId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/lectures/${lectureId}/comments/${commentId}`);
      setData(prev => ({
        ...prev,
        unansweredComments: prev.unansweredComments.filter(c => c.commentId !== commentId)
      }));
      const resLogs = await api.get('/analytics/audit-logs');
      setAuditLogs(resLogs.data);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError('Failed to delete comment.');
    }
  };

  // Filter audit logs based on search query and action dropdown
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesAction = filterAction === 'All' || log.action === filterAction;
    
    return matchesSearch && matchesAction;
  });

  // Extract unique actions from logs for dropdown filter
  const uniqueActions = ['All', ...new Set(auditLogs.map(log => log.action))];

  // Helper to color-code audit log actions
  const getActionBadgeStyle = (action) => {
    if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-800 border-emerald-250';
    if (action.includes('DELETE') || action.includes('REVOKE')) return 'bg-rose-50 text-rose-800 border-rose-250';
    if (action.includes('UPDATE')) return 'bg-amber-50 text-amber-800 border-amber-250';
    if (action.includes('REPLY')) return 'bg-indigo-50 text-indigo-850 border-indigo-250';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // Helper to map paths to friendly readable names for Page Views
  const getFriendlyPageName = (path) => {
    if (path === '/') return 'Home Page';
    if (path.includes('/people/professor')) return 'Faculty - Professor';
    if (path.includes('/people/students')) return 'Students List';
    if (path.includes('/people/alumni')) return 'Alumni Directory';
    if (path.includes('/research/project')) return 'Research Projects';
    if (path.includes('/research/publications')) return 'Research Publications';
    if (path.includes('/lab-event/event')) return 'Lab Events';
    if (path.includes('/lab-event/gallery')) return 'Gallery Media';
    if (path.includes('/documents')) return 'Books & Documents Catalog';
    if (path.includes('/lectures')) return 'Classroom Lecture Video Portal';
    if (path.includes('/news/world-news')) return 'World Semiconductors News';
    if (path.includes('/news/vietnam-news')) return 'Vietnam ICDesign News';
    if (path.includes('/news/jobs')) return 'Jobs & Internship Board';
    if (path.includes('/lab-recruitment')) return 'Admission/Join the Lab';
    if (path.includes('/contact')) return 'Contact Form Page';
    if (path.includes('/admin')) return 'Admin Panel Area';
    return path;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-200 border border-slate-100 rounded-xl"></div>
          ))}
        </div>

        {/* Double Row Splitted Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
          <div className="h-96 bg-slate-200 border border-slate-100 rounded-xl"></div>
          <div className="h-96 bg-slate-200 border border-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-center space-y-4">
        <svg className="w-12 h-12 mx-auto text-rose-450" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h3 className="text-lg font-bold">Access Unauthorized</h3>
        <p className="text-sm font-light leading-relaxed max-w-md mx-auto">{error || 'An unexpected error occurred loading console overview.'}</p>
        <button onClick={fetchDashboardData} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors">
          Retry Request
        </button>
      </div>
    );
  }

  const { metrics, topPages, topLectures, unansweredComments, documentDownloads } = data;

  return (
    <div className="space-y-12">
      {/* Top Banner Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-8 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Console Analytics</h1>
          <p className="mt-1.5 text-sm font-light text-slate-500">
            Real-time tracking of visitor traffic, resource downloads, pending academic discussions, and administrator actions.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-100/50 border border-slate-200/60 px-4 py-2 rounded-lg">
          <span className="w-2.5 h-2.5 bg-emerald-555 rounded-full animate-ping"></span>
          <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase select-none">
            Live Feed: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 1. Core Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Page Views */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Page Views</span>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-semibold text-slate-900 tracking-tight">{metrics.totalPageViews.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1.5">Accumulated page views</p>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Unique Visitors</span>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-semibold text-slate-900 tracking-tight">{metrics.uniqueVisitors.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1.5">Distinct IP addresses</p>
          </div>
        </div>

        {/* Visitors Today */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-900 rounded-2xl flex flex-col justify-between shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-300 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Active Today</span>
            <div className="p-2 bg-white/10 border border-white/20 rounded-lg text-white">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-semibold tracking-tight">{metrics.visitorsToday.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider mt-1.5">Visitors today</p>
          </div>
        </div>

        {/* Reach Range */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Reach Statistics</span>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-1 border-t border-slate-100">
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">{metrics.visitorsThisWeek.toLocaleString()}</span>
              <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">This Week</p>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <span className="text-lg font-bold text-slate-900 tracking-tight">{metrics.visitorsThisMonth.toLocaleString()}</span>
              <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">This Month</p>
            </div>
          </div>
        </div>

      </div>

      {/* 2. unanswered comments section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Unanswered Lecture Discussion Feed</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-rose-50 text-rose-800 border border-rose-100">
              {unansweredComments.length} Pending Questions
            </span>
          </div>
          <p className="text-xs font-light text-slate-450">Lecturers will not miss student questions when replying from this inbox.</p>
        </div>

        {unansweredComments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h4 className="text-sm font-semibold text-slate-950">Inbox Fully Cleared</h4>
            <p className="text-xs text-slate-500 font-light max-w-sm mx-auto">All student questions across computer engineering lectures have been replied to by the professor.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[30rem] overflow-y-auto">
            {unansweredComments.map((comment) => {
              const studentInitial = comment.email ? comment.email.charAt(0).toUpperCase() : 'S';
              return (
                <div key={comment.commentId} className="p-6 hover:bg-slate-50/30 transition-all flex flex-col md:flex-row gap-6 items-start">
                  
                  {/* Student profile info */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {studentInitial}
                    </div>
                    <div className="text-left md:w-36">
                      <p className="text-sm font-bold text-slate-900 truncate" title={comment.email}>{comment.email}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Question and inline reply field */}
                  <div className="flex-1 space-y-3 text-left">
                    <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl space-y-1">
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border border-slate-900 bg-slate-900 text-white select-none rounded mb-1">
                        Lecture: {comment.lectureTitle}
                      </span>
                      <p className="text-slate-900 text-base leading-relaxed font-normal font-sans">{comment.text}</p>
                    </div>

                    {/* Inline Reply Form */}
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={replyTexts[comment.commentId] || ''}
                        onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.commentId]: e.target.value }))}
                        placeholder="Type official professor response..."
                        disabled={replyingId === comment.commentId}
                        className="block flex-1 border border-slate-200 rounded-lg py-2 px-3.5 text-sm text-slate-900 placeholder:text-slate-450 focus:border-slate-900 focus:ring-0 bg-transparent disabled:opacity-50 transition-colors"
                      />
                      <button
                        onClick={() => handlePostReply(comment.lectureId, comment.commentId)}
                        disabled={replyingId === comment.commentId || !replyTexts[comment.commentId]?.trim()}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors rounded-lg shrink-0"
                      >
                        {replyingId === comment.commentId ? 'Posting...' : 'Reply'}
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.lectureId, comment.commentId)}
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-655 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-colors shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                    {replySuccess && replyingId === null && replyTexts[comment.commentId] === '' && (
                      <p className="text-emerald-700 text-xs font-semibold select-none animate-fadeIn">{replySuccess}</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Top analytics grid (Top Visited Pages, Top Lectures, Document Downloads) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top Visited Pages */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Top Visited Pages</h3>
            <p className="text-xs text-slate-500 font-light leading-relaxed">Pages receiving the highest navigation traffic.</p>
          </div>
          
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[22rem] pr-1">
            {topPages.map((page, index) => {
              const maxCount = topPages[0]?.count || 1;
              const pctWidth = `${(page.count / maxCount) * 100}%`;
              return (
                <div key={page.url} className="py-3.5 space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900 truncate max-w-[13rem]" title={page.url}>
                      {getFriendlyPageName(page.url)}
                    </span>
                    <span className="font-bold text-slate-500 shrink-0">{page.count} views</span>
                  </div>
                  {/* Progress visualization line */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 rounded-full" style={{ width: pctWidth }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Lectures */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Top Viewed Lectures</h3>
            <p className="text-xs text-slate-500 font-light leading-relaxed">Classroom lecture videos with maximum student engagement.</p>
          </div>
          
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[22rem] pr-1">
            {topLectures.length === 0 ? (
              <p className="text-xs italic text-slate-400 text-center py-10">No lecture views recorded yet.</p>
            ) : (
              topLectures.map((lec) => {
                const maxViews = topLectures[0]?.views || 1;
                const pctWidth = `${(lec.views / maxViews) * 100}%`;
                return (
                  <div key={lec._id} className="py-3.5 space-y-1.5 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-900 truncate max-w-[13rem]" title={lec.title}>
                        {lec.title}
                      </span>
                      <span className="font-bold text-slate-500 shrink-0">{lec.views} views</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-650 rounded-full" style={{ width: pctWidth }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Document Downloads */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Document Downloads</h3>
            <p className="text-xs text-slate-500 font-light leading-relaxed">Downloads count for lab textbooks and study guides.</p>
          </div>
          
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[22rem] pr-1">
            {documentDownloads.length === 0 ? (
              <p className="text-xs italic text-slate-400 text-center py-10">No documents downloaded yet.</p>
            ) : (
              documentDownloads.map((doc) => (
                <div key={doc._id} className="py-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="text-left truncate space-y-0.5">
                    <p className="font-semibold text-slate-900 truncate" title={doc.title}>{doc.title}</p>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{doc.subject}</span>
                      {doc.isLabOwned && (
                        <span className="text-[7px] px-1 py-0.5 bg-slate-900 text-white font-bold uppercase tracking-widest rounded select-none">Lab Owned</span>
                      )}
                    </div>
                  </div>
                  <span className="font-bold text-slate-600 shrink-0 bg-slate-100 px-2 py-1 rounded-md">{doc.downloads} dl</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. Complete Audit Trail Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-6">
        
        {/* Section Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 text-left">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">System Audit Trail</h3>
            <p className="text-xs text-slate-500 font-light">Traceable record of all administrative operations performed in the lab panel.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Action filter dropdown */}
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="block border border-slate-200 py-2 px-3 rounded-lg text-xs text-slate-700 bg-white focus:border-slate-900 focus:ring-0"
            >
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action === 'All' ? 'All System Actions' : action}
                </option>
              ))}
            </select>

            {/* Keyword Search Input */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit trail..."
              className="block border border-slate-200 py-2 px-3.5 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:border-slate-900 focus:ring-0"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th scope="col" className="py-4 pl-4 pr-3 text-xs font-bold uppercase tracking-wider text-slate-400">Timestamp</th>
                <th scope="col" className="px-3 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Administrator</th>
                <th scope="col" className="px-3 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Action Type</th>
                <th scope="col" className="px-3 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Operation Details</th>
                <th scope="col" className="py-4 pl-3 pr-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Location Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-xs font-light text-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 italic">No audit records found matching your filters.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-4 pr-3 whitespace-nowrap text-slate-500">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap font-semibold text-slate-900">{log.adminEmail}</td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-semibold border ${getActionBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-4 max-w-sm truncate" title={log.details}>{log.details}</td>
                    <td className="py-4 pl-3 pr-4 text-right whitespace-nowrap text-slate-400">
                      <p className="font-semibold text-slate-650">{log.ip || 'no-ip'}</p>
                      <p className="text-[9px] truncate max-w-[12rem] float-right mt-0.5" title={log.userAgent}>{log.userAgent}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
