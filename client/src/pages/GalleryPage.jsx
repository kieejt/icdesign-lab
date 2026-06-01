import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await api.get('/gallery');
        setImages(response.data);
      } catch (error) {
        console.error('Failed to fetch gallery', error);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Gallery</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light mx-auto">
            Visual memories from our lab activities, events, and milestones.
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
            {images.map(image => (
              <div key={image._id} className="group relative aspect-square md:aspect-[4/5] lg:aspect-square bg-slate-100 overflow-hidden cursor-pointer">
                <img 
                  src={image.imageUrl} 
                  alt={image.title} 
                  className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700 ease-in-out group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out flex flex-col justify-end p-8">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-2">{image.category}</span>
                  <h3 className="text-2xl font-medium text-white leading-tight">{image.title}</h3>
                </div>
              </div>
            ))}
            {images.length === 0 && (
              <div className="col-span-full text-center py-24 text-slate-500 font-light">
                No gallery images found.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
