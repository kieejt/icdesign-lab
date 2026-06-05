import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInTime = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInTime / (1000 * 3600 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JobsFeedLayout({ title, subtitle, category, eyebrow }) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await api.get('/news/published', { params: { category } });
        // Sort jobs by date descending
        const sortedJobs = response.data.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        setJobs(sortedJobs);
      } catch (error) {
        console.error('Failed to fetch jobs', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [category]);

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 min-h-screen">
      <section className="w-full pt-16 pb-20 bg-white border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-4">
              {eyebrow}
            </p>
          )}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 font-light">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="w-full py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="mx-auto h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p className="text-slate-500 text-lg">
                {t('jobs.noActiveJobs')}
              </p>
            </div>
          ) : (
            <>
              {(() => {
                const hanoiJobs = jobs.filter(job => {
                  const text = (job.title + ' ' + job.summary + ' ' + (job.tags || []).join(' ')).toLowerCase();
                  return text.includes('hanoi') || text.includes('hà nội') || text.includes('ha noi') || /\bhn\b/.test(text);
                });
                const otherJobs = jobs.filter(job => !hanoiJobs.includes(job));

                const renderJobList = (jobList, sectionTitle) => (
                  <div className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">{sectionTitle}</h2>
                    {jobList.length === 0 ? (
                      <p className="text-slate-500 text-lg">{t('jobs.noActiveJobs')}</p>
                    ) : (
                      <div className="flex flex-col gap-6">
                        {jobList.map((job) => (
                          <article
                            key={job._id}
                            className="group relative bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col sm:flex-row gap-6 items-start"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                  {job.source || t('jobs.company')}
                                </span>
                                <span className="text-sm text-slate-400 flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                  {formatDate(job.publishedAt)}
                                </span>
                              </div>
                              
                              <h2 className="text-2xl font-bold text-slate-900 mt-2 mb-3 group-hover:text-blue-600 transition-colors">
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
                                  <span className="absolute inset-0" aria-hidden="true" />
                                  {job.title}
                                </a>
                              </h2>
                              
                              <p className="text-slate-600 line-clamp-2 md:line-clamp-3 font-light mb-4 text-base">
                                {job.summary}
                              </p>
                            </div>
                            
                            <div className="w-full sm:w-auto flex-shrink-0 mt-4 sm:mt-0 flex flex-col items-center sm:items-end justify-center">
                              {job.thumbnail && (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 hidden sm:block rounded-xl border border-slate-100 overflow-hidden mb-4 bg-white p-2">
                                  <img 
                                    src={job.thumbnail} 
                                    alt={`${job.source} logo`} 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors relative z-10"
                              >
                                {t('jobs.applyNow')}
                                <svg className="ml-2 -mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                </svg>
                              </a>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                );

                return (
                  <>
                    {renderJobList(hanoiJobs, t('jobs.hanoiJobs'))}
                    {renderJobList(otherJobs, t('jobs.otherCityJobs'))}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
