import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import Pagination from '../components/Pagination';

export default function GalleryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/gallery?page=${page}&limit=12`);
        setAlbums(response.data.data);
        setTotalPages(response.data.totalPages);
      } catch (error) {
        console.error('Failed to fetch gallery', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlbums();
  }, [page]);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">{t('media.galleryTitle')}</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light mx-auto">
            {t('media.gallerySubtitle')}
          </p>
        </div>
      </section>

      <section className="w-full pb-24">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-2 lg:gap-4 px-1 md:px-2 lg:px-4">
            {albums.map(album => (
              <div 
                key={album._id} 
                onClick={() => navigate(`/lab-event/gallery/${album._id}`)}
                className="group relative aspect-square md:aspect-[4/5] lg:aspect-square bg-slate-100 overflow-hidden cursor-pointer"
              >
                {album.coverImage ? (
                  <img 
                    src={album.coverImage} 
                    alt={album.title} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-light text-sm uppercase tracking-widest">No Cover</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent flex flex-col justify-end p-8">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-2">{album.category}</span>
                  <h3 className="text-2xl font-medium text-white leading-tight">{album.title}</h3>
                  <p className="text-xs text-white/60 mt-2 font-light">{album.images?.length || 0} photos</p>
                </div>
              </div>
            ))}
            {albums.length === 0 && (
              <div className="col-span-full text-center py-24 text-slate-500 font-light">
                {t('media.noGallery')}
              </div>
            )}
          </div>
        )}
        <div className="pt-8 px-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
        </div>
      </section>
    </div>
  )
}
