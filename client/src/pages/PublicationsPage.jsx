import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import Pagination from '../components/Pagination';

export default function PublicationsPage() {
  const { t } = useTranslation();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const response = await api.get(`/research?category=Publications&page=${page}&limit=15`);
        setPublications(response.data.data);
        setTotalPages(response.data.totalPages);
      } catch (error) {
        console.error('Failed to fetch publications', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublications();
  }, [page]);

  // Group publications by year using the new 'date' field, fallback to createdAt
  const publicationsByYear = publications.reduce((acc, pub) => {
    const pubDate = pub.date || pub.createdAt;
    const year = pubDate ? new Date(pubDate).getFullYear() : new Date().getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(pub);
    return acc;
  }, {});

  const sortedYears = Object.keys(publicationsByYear).sort((a, b) => b - a);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">{t('research.pubsTitle')}</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            {t('research.pubsSubtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-8 md:py-16">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="flex flex-col">
              {sortedYears.map((year, index) => (
                <div key={year} className={`flex flex-col md:flex-row gap-8 md:gap-16 py-16 ${index !== sortedYears.length - 1 ? 'border-b border-slate-200' : ''}`}>
                  <div className="md:w-1/5 shrink-0">
                    <h2 className="text-4xl md:text-5xl font-light text-slate-300 md:sticky md:top-32 tracking-tighter">
                      {year}
                    </h2>
                  </div>
                  <div className="md:w-4/5 flex flex-col gap-16">
                    {publicationsByYear[year].map(pub => (
                      <article key={pub._id} className="group relative flex flex-col xl:flex-row gap-8 lg:gap-12 items-start">
                        <div className="flex-1 order-2 xl:order-1">
                          <h3 className="text-xl md:text-2xl font-medium text-slate-900 leading-snug group-hover:text-slate-600 transition-colors">
                            {pub.link ? (
                              <a href={pub.link} target="_blank" rel="noopener noreferrer" className="underline decoration-slate-200 underline-offset-4 group-hover:decoration-slate-400 transition-colors">
                                {pub.title}
                              </a>
                            ) : (
                              <span className="underline decoration-slate-200 underline-offset-4 transition-colors">
                                {pub.title}
                              </span>
                            )}
                          </h3>
                          {pub.authors && (
                            <p className="mt-4 text-slate-800 font-medium">
                              {pub.authors}
                            </p>
                          )}
                          <p className={`text-slate-700 leading-relaxed font-light whitespace-pre-wrap ${pub.authors ? 'mt-2' : 'mt-4'}`}>
                            {pub.description}
                          </p>
                          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-500 font-serif">
                            <span className="italic">{pub.journal || 'IC Design Lab Archive'}</span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span>{new Date(pub.date || pub.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                          </div>
                        </div>
                        
                        {/* Optional Journal/Book Cover - Will render only if pub.image exists */}
                        {pub.image && (
                          <div className="order-1 xl:order-2 w-full max-w-xs xl:w-48 shrink-0">
                            <div className="aspect-[3/4] bg-slate-100 overflow-hidden shadow-sm border border-slate-100">
                              <img 
                                src={pub.image} 
                                alt={`Cover for ${pub.title}`} 
                                className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700"
                              />
                            </div>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
              
              {sortedYears.length === 0 && (
                <div className="text-center py-24 text-slate-500 font-light">
                  {t('research.noPubs')}
                </div>
              )}
            </div>
          )}
          <div className="mt-16">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
          </div>
        </div>
      </section>
    </div>
  )
}
