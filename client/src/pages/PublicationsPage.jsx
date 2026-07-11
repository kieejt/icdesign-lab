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
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleAbstract = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            <div className="mx-auto flex max-w-4xl flex-col">
              {sortedYears.map((year) => (
                <div key={year} className="mb-10">
                  <h2 className="mb-4 border-b border-slate-300 pb-2 text-2xl font-semibold text-slate-900">
                    {year}
                  </h2>
                  <ul className="list-disc space-y-5 pl-5 marker:text-slate-400">
                    {publicationsByYear[year].map((pub) => (
                      <li key={pub._id} className="text-[15px] leading-relaxed text-slate-800">
                        {pub.authors && <span>{pub.authors}, </span>}
                        {pub.link ? (
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-400"
                          >
                            &ldquo;{pub.title},&rdquo;
                          </a>
                        ) : (
                          <span>&ldquo;{pub.title},&rdquo;</span>
                        )}{' '}
                        {pub.journal && <span className="italic">{pub.journal}, </span>}
                        {new Date(pub.date || pub.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                        {pub.description && (
                          <>
                            {' '}
                            <button
                              type="button"
                              onClick={() => toggleAbstract(pub._id)}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              [{expandedIds.has(pub._id) ? 'Hide abstract' : 'Abstract'}]
                            </button>
                            {expandedIds.has(pub._id) && (
                              <p className="mt-2 whitespace-pre-wrap border-l-2 border-slate-200 pl-3 text-sm font-light text-slate-600">
                                {pub.description}
                              </p>
                            )}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
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
