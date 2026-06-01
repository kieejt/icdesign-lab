import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function LabRecruitmentPage() {
  const [recruitments, setRecruitments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecruitments = async () => {
      try {
        const response = await api.get('/recruitment');
        setRecruitments(response.data);
      } catch (error) {
        console.error('Failed to fetch recruitments', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecruitments();
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Join the Lab</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            Become a part of our research team. We are always looking for passionate individuals to join us in advancing IC design.
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 min-h-[50vh]">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="flex flex-col">
              {recruitments.map(item => {
                const isActive = item.status === 'active';
                return (
                  <article key={item._id} className={`group flex flex-col md:flex-row gap-6 md:gap-12 py-12 border-b border-slate-200 ${!isActive ? 'opacity-50' : 'hover:bg-slate-50 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'}`}>
                    <div className="md:w-1/4 shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        {isActive ? <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> : null}
                        {item.status}
                      </span>
                      <p className="text-sm font-medium text-slate-500 mt-6">Deadline: {new Date(item.deadline).toLocaleDateString()}</p>
                    </div>
                    <div className="md:w-3/4 flex flex-col">
                      <h3 className="text-3xl md:text-4xl font-medium text-slate-900 leading-tight mb-6">{item.title}</h3>
                      <p className="text-slate-600 font-light leading-relaxed whitespace-pre-wrap max-w-4xl mb-8">{item.description}</p>
                      <a
                        href={item.googleFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex w-fit items-center text-sm font-semibold uppercase tracking-widest ${isActive ? 'text-blue-600 hover:text-blue-800' : 'cursor-not-allowed text-slate-400'} transition-colors`}
                        onClick={(e) => { if (!isActive) e.preventDefault() }}
                      >
                        Apply Now →
                      </a>
                    </div>
                  </article>
                );
              })}
              {recruitments.length === 0 && (
                <div className="text-center py-24 text-slate-500 font-light">
                  No open positions at the moment.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
