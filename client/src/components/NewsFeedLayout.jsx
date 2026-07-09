import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsFeedLayout({ title, subtitle, category, eyebrow }) {
  const { t } = useTranslation();
  const { page } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [featuredNews, setFeaturedNews] = useState([]);
  const [archiveNews, setArchiveNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(parseInt(page) || 1);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setCurrentPage(parseInt(page) || 1);
  }, [page]);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const params = { category };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const featuredRes = await api.get('/news/published', { 
          params: { ...params, offset: 0, limit: 20 } 
        });
        setFeaturedNews(featuredRes.data.data);
        
        const archiveOffset = 20 + (currentPage - 1) * 20;
        const archiveRes = await api.get('/news/published', {
          params: { ...params, offset: archiveOffset, limit: 20 }
        });
        
        setArchiveNews(archiveRes.data.data);
        const totalArchive = Math.max(0, archiveRes.data.total - 20);
        setTotalPages(Math.ceil(totalArchive / 20) || 1);
      } catch (error) {
        console.error('Failed to fetch news', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [category, currentPage, startDate, endDate]);

  const handlePageChange = (newPage) => {
    const basePath = location.pathname.replace(/\/page\/\d+/, '');
    if (newPage === 1) {
      navigate(basePath);
    } else {
      navigate(`${basePath}/page/${newPage}`);
    }
    document.getElementById('older-news-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDateFilterChange = (type, value) => {
    if (type === 'start') setStartDate(value);
    if (type === 'end') setEndDate(value);
    
    // Reset to page 1 on filter change
    if (currentPage !== 1) {
      const basePath = location.pathname.replace(/\/page\/\d+/, '');
      navigate(basePath);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
              {eyebrow}
            </p>
          )}
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">
            {title}
          </h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading && featuredNews.length === 0 ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
            </div>
          ) : featuredNews.length === 0 && archiveNews.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <p className="text-slate-500 font-light text-lg">
                {t('media.newsEmpty')}
              </p>
              {/* Optional Date filter can still be shown here to clear filters */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-16">
              {/* Featured News Grid (Always visible) */}
              <div className="space-y-12">
                <div className="border-b border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-900">
                      {t('media.latestUpdates')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-light uppercase tracking-wider">
                      {t('media.newestStories', { category })}
                    </p>
                  </div>
                </div>
                
                {featuredNews.length === 0 ? (
                  <p className="text-slate-500 font-light py-8">{t('media.noUpdates')}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                    {featuredNews.map((item) => (
                      <article
                        key={item._id}
                        className="group flex flex-col justify-between border-b border-slate-100 pb-10 hover:bg-slate-50/50 transition-colors p-4 -m-4"
                      >
                        <div className="space-y-4">
                          {item.thumbnail && (
                            <div className="w-full aspect-[16/10] bg-slate-100 overflow-hidden border border-slate-200">
                              <img
                                src={item.thumbnail}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                              {item.source}
                            </span>
                            <span className="text-xs font-light text-slate-400">
                              {formatDate(item.publishedAt)}
                            </span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              {item.title}
                            </a>
                          </h3>
                          <p className="text-slate-500 text-sm font-light leading-relaxed line-clamp-3">
                            {item.summary}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Archive News List */}
              <div id="older-news-section" className="pt-16 border-t border-slate-900 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-6 gap-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-900">
                      {t('media.newsArchive')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-light uppercase tracking-wider">
                      {t('media.olderArticles', { category })}
                    </p>
                  </div>
                  
                  {/* Date Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">From</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => handleDateFilterChange('start', e.target.value)}
                        className="text-sm px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-slate-900 text-slate-700 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">To</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => handleDateFilterChange('end', e.target.value)}
                        className="text-sm px-2 py-1.5 border border-slate-300 rounded outline-none focus:border-slate-900 text-slate-700 bg-white"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <button 
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 uppercase tracking-widest ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end w-full">
                  {totalPages > 1 && (
                    <span className="text-xs font-light text-slate-500 uppercase tracking-widest">
                      {t('media.pageOf', { current: currentPage, total: totalPages })}
                    </span>
                  )}
                </div>

                {loading ? (
                   <div className="flex justify-center py-12">
                     <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
                   </div>
                ) : archiveNews.length === 0 ? (
                  <p className="text-slate-500 font-light py-8 text-sm">
                    {currentPage === 1 
                      ? t('media.noOlder') 
                      : t('media.noMore')}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {archiveNews.map((item) => (
                      <div
                        key={item._id}
                        className="group py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors px-2 -mx-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-1.5 py-0.5 shrink-0">
                            {item.source}
                          </span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {item.title}
                          </a>
                        </div>
                        <span className="text-xs font-light text-slate-400 whitespace-nowrap sm:pl-4">
                          {formatDate(item.publishedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-8 mt-12">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      {t('media.prev')}
                    </button>

                    <div className="hidden md:flex gap-1.5 flex-wrap justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-9 h-9 flex items-center justify-center text-xs font-bold transition-colors ${
                            currentPage === page
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      {t('media.next')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
