import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function EventPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/lab-events');
        setEvents(response.data);
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Lab Events</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            Stay updated with our latest workshops, conferences, and lab activities.
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="flex flex-col">
              {events.map((event) => {
                const isUpcoming = event.status === 'Upcoming';
                return (
                  <article key={event._id} className={`group flex flex-col md:flex-row gap-6 md:gap-12 py-12 border-b border-slate-200 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${isUpcoming ? 'hover:bg-slate-50' : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100'}`}>
                    <div className="md:w-1/4 shrink-0 flex flex-col">
                      <span className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                        {isUpcoming && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                        {event.status}
                      </span>
                      <p className="text-3xl font-light tracking-tight text-slate-900">{event.date}</p>
                      <p className="text-sm font-medium text-slate-500 mt-4 flex items-center gap-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        {event.location}
                      </p>
                    </div>
                    <div className="md:w-3/4 flex flex-col">
                      <h3 className="text-2xl md:text-4xl font-medium text-slate-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                      <p className="text-slate-600 font-light leading-relaxed whitespace-pre-wrap max-w-4xl">{event.description}</p>
                    </div>
                  </article>
                );
              })}
              {events.length === 0 && (
                <div className="text-center py-24 text-slate-500 font-light">
                  No events found.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
