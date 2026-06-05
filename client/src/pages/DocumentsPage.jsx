import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All'); // All, Free, Paid
  const [filterOwned, setFilterOwned] = useState('All'); // All, Lab Owned

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await api.get('/documents');
        setBooks(response.data);
      } catch (error) {
        console.error('Failed to fetch books', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const handleDownload = async (book) => {
    try {
      const response = await api.post(`/documents/${book._id}/download`);
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to register download', error);
      if (book.downloadUrl) {
        window.open(book.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Filter books based on search query, access type, and lab ownership
  const filteredBooks = books.filter(book => {
    const title = book.title || '';
    const subject = book.subject || 'General';
    const type = book.type || 'Free';
    const isLabOwned = !!book.isLabOwned;

    const matchesSearch =
      title.toLowerCase().includes(search.toLowerCase()) ||
      subject.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'All' || type === filterType;

    const matchesOwned =
      filterOwned === 'All' ||
      (filterOwned === 'Owned' && isLabOwned) ||
      (filterOwned === 'External' && !isLabOwned);

    return matchesSearch && matchesType && matchesOwned;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
        <p className="text-slate-500 font-light tracking-wide animate-pulse">{t('education.loadingDocs')}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center selection:bg-slate-900 selection:text-white">

      {/* Editorial Minimal Header */}
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">{t('education.docsTitle')}</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            {t('education.docsSubtitle')}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="w-full py-12 md:py-20 bg-white">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">

          {/* Controls bar */}
          <div className="flex flex-col gap-6 py-6 border-b border-slate-200 md:flex-row md:items-center md:justify-between">

            {/* Search Input Box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                className="block w-full border border-slate-200 py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 sm:text-sm bg-transparent"
                placeholder={t('education.searchDocs')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>


            {/* Selection Filters */}
            <div className="flex flex-wrap items-center gap-4 text-sm">

              {/* Access Type Filter */}
              <div className="flex border border-slate-200 p-0.5" role="group">
                {['All', 'Free', 'Paid'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${filterType === type
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    {type === 'All' ? t('education.allAccess') : type === 'Free' ? t('education.free') : t('education.paid')}
                  </button>
                ))}
              </div>

              {/* GDrive Ownership Filter */}
              <div className="flex border border-slate-200 p-0.5" role="group">
                {[
                  { key: 'All', label: t('education.allSources') },
                  { key: 'Owned', label: t('education.labOwned') }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setFilterOwned(opt.key)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${filterOwned === opt.key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Catalog Listing */}
          <div className="w-full overflow-x-auto border-t border-slate-900 mt-10">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th scope="col" className="py-5 pl-4 pr-4 text-xs font-semibold uppercase tracking-widest text-slate-500 w-1/2">
                    {t('education.bookTitleInfo')}
                  </th>
                  <th scope="col" className="px-4 py-5 text-xs font-semibold uppercase tracking-widest text-slate-500 w-1/4">
                    {t('education.subject')}
                  </th>
                  <th scope="col" className="px-4 py-5 text-xs font-semibold uppercase tracking-widest text-slate-500 w-1/8">
                    {t('education.reference')}
                  </th>
                  <th scope="col" className="py-5 pl-4 pr-4 text-right text-xs font-semibold uppercase tracking-widest text-slate-500 w-1/8">
                    {t('education.download')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBooks.map((book) => (
                  <tr key={book._id} className="group hover:bg-slate-50/50 transition-colors">

                    {/* Document Info & Type Tags */}
                    <td className="py-6 pl-4 pr-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-slate-900 leading-snug group-hover:text-slate-600 transition-colors">
                          {book.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {book.type === 'Free' ? (
                            <span className="inline-flex items-center border border-emerald-200 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50/10">
                              {t('education.freeAccess')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center border border-amber-200 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50/10">
                              {t('education.purchaseReq')}
                            </span>
                          )}

                          {book.isLabOwned && (
                            <span className="inline-flex items-center border border-slate-900 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-900 bg-slate-900/5">
                              {t('education.labOwnedEd')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>


                    {/* Subject */}
                    <td className="px-4 py-6 whitespace-nowrap">
                      <span className="text-sm font-light text-slate-650">
                        {book.subject || t('education.general')}
                      </span>
                    </td>

                    {/* Reference Link */}
                    <td className="px-4 py-6 whitespace-nowrap">
                      <a
                        href={book.link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold uppercase tracking-wider text-slate-800 hover:text-slate-600 transition-colors underline decoration-slate-200 underline-offset-4"
                      >
                        {t('education.details')}
                      </a>
                    </td>


                    {/* Google Drive Download Button */}
                    <td className="py-6 pl-4 pr-4 text-right whitespace-nowrap">
                      {book.isLabOwned && book.downloadUrl ? (
                        <button
                          onClick={() => handleDownload(book)}
                          className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                        >
                          {t('education.downloadGDrive')}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-light">-</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty Catalog State */}
          {filteredBooks.length === 0 && (
            <div className="text-center py-20 px-4">
              <h3 className="text-lg font-medium text-slate-900 mb-1">{t('education.noBooksTitle')}</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto font-light">
                {t('education.noBooksDesc')}
              </p>
            </div>
          )}


        </div>
      </section>

    </div>
  );
}
