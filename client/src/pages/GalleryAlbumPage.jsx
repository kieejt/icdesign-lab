import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import api from '../lib/api';
import ErrorText from '../components/ErrorText';

export default function GalleryAlbumPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const response = await api.get(`/gallery/${id}`);
        setAlbum(response.data);
      } catch (err) {
        console.error('Failed to fetch album', err);
        setError('Album not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchAlbum();
  }, [id]);

  const toggleSelectImage = (idx) => {
    setSelectedImages(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || 'download.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleDownload = async (indices) => {
    if (indices.length === 0) return;
    setIsDownloading(true);
    try {
      if (indices.length === 1) {
        // Download single image directly
        const idx = indices[0];
        const url = album.images[idx];
        const filename = `${album.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${idx + 1}.jpg`;
        await downloadImage(url, filename);
      } else {
        // Create a ZIP for multiple images
        const zip = new JSZip();
        const folderName = album.title.replace(/[^a-zA-Z0-9_-]/g, '_');
        const imgFolder = zip.folder(folderName);
        
        for (const idx of indices) {
          const url = album.images[idx];
          const filename = `photo_${idx + 1}.jpg`;
          const response = await fetch(url);
          const blob = await response.blob();
          imgFolder.file(filename, blob);
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${folderName}.zip`);
      }
    } catch (err) {
      console.error('Failed to prepare download', err);
    } finally {
      setIsDownloading(false);
      setSelectedImages([]);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex < album.images.length - 1) setLightboxIndex(lightboxIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, album]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ErrorText message={error} />
        <Link to="/lab-event/gallery" className="text-blue-600 hover:underline">{t('media.prev', '← Back to Gallery')}</Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-12 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <Link to="/lab-event/gallery" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mb-8">
            {t('media.prev', '← Back to Gallery')}
          </Link>
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-2 block">
            {album.category}
          </span>
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900 leading-tight">
            {album.title}
          </h1>
          <p className="mt-4 text-sm text-slate-500 font-light">
            {new Date(album.createdAt).toLocaleDateString()} • {album.images?.length || 0} photos
          </p>
        </div>
      </section>

      <section className="w-full py-16 pb-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {(!album.images || album.images.length === 0) ? (
            <div className="text-center py-24 text-slate-500 font-light">
              No images in this album.
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div className="text-sm text-slate-500 font-medium">
                  {t('media.selectToDownload', 'Select images to download, or download the entire album.')}
                </div>
                <div className="flex gap-3">
                  {selectedImages.length > 0 && (
                    <button 
                      onClick={() => handleDownload(selectedImages)}
                      disabled={isDownloading}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded shadow-sm text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isDownloading ? 'Downloading...' : `Download Selected (${selectedImages.length})`}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDownload(album.images.map((_, i) => i))}
                    disabled={isDownloading}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 bg-white rounded shadow-sm text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? 'Downloading...' : `Download All (${album.images.length})`}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {album.images.map((imgUrl, idx) => {
                  const isSelected = selectedImages.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`group relative aspect-square bg-slate-100 overflow-hidden border-2 transition-all ${isSelected ? 'border-blue-500 scale-[0.98] opacity-90 rounded' : 'border-transparent'}`}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`${album.title} - ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out cursor-zoom-in" 
                        onClick={() => setLightboxIndex(idx)}
                      />
                      <div 
                        className={`absolute top-3 right-3 w-7 h-7 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-black/30 border-white/80 hover:bg-black/50 opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => { e.stopPropagation(); toggleSelectImage(idx); }}
                        title="Select image"
                      >
                        {isSelected && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && album.images && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-sm animate-fadeIn">
          <button 
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white/70 hover:text-white transition-colors p-2 z-10"
            title="Close (Esc)"
          >
            <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center">
            <div className="relative w-full flex-1 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
              <img 
                src={album.images[lightboxIndex]} 
                alt={`Album photo ${lightboxIndex + 1}`} 
                className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              />
              
              {lightboxIndex > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                  className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all border border-white/10"
                  title="Previous (Left Arrow)"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              
              {lightboxIndex < album.images.length - 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                  className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all border border-white/10"
                  title="Next (Right Arrow)"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
            
            <div className="text-white/60 mt-6 font-light tracking-widest text-sm flex items-center gap-4">
              <span>{lightboxIndex + 1} / {album.images.length}</span>
              <button 
                onClick={() => handleDownload([lightboxIndex])}
                className="text-blue-400 hover:text-blue-300 transition-colors uppercase text-xs font-bold"
              >
                Download this photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
