import React, { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsFeedLayout({ title, subtitle, category, eyebrow }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const response = await api.get('/news/published', { params: { category } });
        setNews(response.data);
      } catch (error) {
        console.error('Failed to fetch news', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [category]);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [category]);

  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [news]);

  const newestArticles = useMemo(() => {
    return sortedNews.slice(0, 20);
  }, [sortedNews]);

  const olderArticles = useMemo(() => {
    return sortedNews.slice(20);
  }, [sortedNews]);

  const pageSize = 20;
  const totalPages = Math.ceil(olderArticles.length / pageSize);

  const paginatedOlder = useMemo(() => {
    return olderArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [olderArticles, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.getElementById('older-news-section')?.scrollIntoView({ behavior: 'smooth' });
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
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900" />
            </div>
          ) : news.length === 0 ? (
            <p className="text-center py-24 text-slate-500 font-light text-lg">
              No published articles in this category yet. Check back soon.
            </p>
          ) : (
            <div className="w-full space-y-16">
              {/* 20 newest news with full details - only shown on page 1 */}
              {currentPage === 1 && (
                <div className="space-y-12">
                  <div className="border-b border-slate-900 pb-6">
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-slate-900">
                      Latest Updates
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-light uppercase tracking-wider">
                      The 20 newest stories in {category}
                    </p>
                  </div>
                  
                  {newestArticles.length === 0 ? (
                    <p className="text-slate-500 font-light py-8">No updates in this category.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                      {newestArticles.map((item) => (
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
              )}

              {/* Older news section displayed as a list of simple, small text lines with pagination */}
              <div id="older-news-section" className="pt-16 border-t border-slate-900 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-200 pb-6 gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-900">
                      News Archive
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-light uppercase tracking-wider">
                      Older articles in {category}
                    </p>
                  </div>
                  {totalPages > 1 && (
                    <span className="text-xs font-light text-slate-500 uppercase tracking-widest">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>

                {paginatedOlder.length === 0 ? (
                  <p className="text-slate-500 font-light py-8 text-sm">
                    {currentPage === 1 
                      ? "No older articles in this category." 
                      : "No more articles found."}
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {paginatedOlder.map((item) => (
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
                      disabled={currentPage === 1}
                      className="inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      ← Previous
                    </button>

                    <div className="hidden md:flex gap-1.5">
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
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center px-4 py-2 border border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      Next →
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
