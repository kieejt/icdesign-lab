import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function ProfessorPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get('/members?category=Professors');
        setMembers(response.data);
      } catch (error) {
        console.error('Failed to fetch professors', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Professors</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            Meet the esteemed faculty leading research and innovation at IC Design Lab.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-20 lg:gap-x-16">
              {members.map(member => (
                <article key={member._id} className="group flex flex-col">
                  <div className="w-full aspect-[3/4] bg-slate-100 mb-8 overflow-hidden">
                    {member.image ? (
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-2xl font-medium text-slate-900 mb-2">{member.name}</h3>
                  <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4">{member.role}</p>
                  
                  <div className="space-y-3 mt-auto pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-600 flex items-center gap-3">
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      <a href={`mailto:${member.email}`} className="hover:text-slate-900 transition-colors">{member.email}</a>
                    </p>
                    {member.research && (
                      <p className="text-sm text-slate-600 flex items-start gap-3">
                        <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                        <span className="font-light leading-relaxed">{member.research}</span>
                      </p>
                    )}
                  </div>
                </article>
              ))}
              {members.length === 0 && (
                <div className="col-span-full text-center py-24 text-slate-500 font-light">
                  No professors found.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
