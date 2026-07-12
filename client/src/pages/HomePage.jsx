import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function HomePage() {
  const { t } = useTranslation();
  const [research, setResearch] = useState([])
  const [members, setMembers] = useState([])
  const [recruitments, setRecruitments] = useState([])
  const [worldNews, setWorldNews] = useState([])
  const [vietnamNews, setVietnamNews] = useState([])
  const [jobsNews, setJobsNews] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Each request asks the server for only the handful of rows this page actually
        // renders, instead of downloading full collections and slicing them client-side.
        const [resResearch, resProfessors, resStudents, resAlumni, resRecruitment, resWorld, resVietnam, resJobs] = await Promise.all([
          api.get('/research', { params: { category: 'Project', limit: 3 } }),
          api.get('/members', { params: { category: 'Professors', limit: 4 } }),
          api.get('/members', { params: { category: 'Students', limit: 4 } }),
          api.get('/members', { params: { category: 'Alumni', limit: 4 } }),
          api.get('/recruitment', { params: { limit: 3 } }),
          api.get('/news/published', { params: { category: 'World News', limit: 3 } }),
          api.get('/news/published', { params: { category: 'Vietnam News', limit: 3 } }),
          api.get('/news/published', { params: { category: 'Jobs', limit: 3 } }),
        ]);
        setResearch(resResearch.data.data);
        // Professors first, then Students, then Alumni — so a lab with a single
        // professor still fills the remaining slots instead of showing just one card.
        const orderedMembers = [
          ...(resProfessors.data.data || []),
          ...(resStudents.data.data || []),
          ...(resAlumni.data.data || []),
        ].slice(0, 4);
        setMembers(orderedMembers);
        setRecruitments(resRecruitment.data.slice(0, 3));
        setWorldNews(resWorld.data.data || []);
        setVietnamNews(resVietnam.data.data || []);
        setJobsNews(resJobs.data.data || []);
      } catch (error) {
        console.error('Failed to fetch homepage data', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full flex flex-col items-center selection:bg-slate-900 selection:text-white">
      {/* Hero Section - Immersive Full Bleed Image */}
      <section className="w-full border-b border-slate-200">
        <div className="w-full h-[60vh] md:h-[80vh] bg-slate-900 relative group overflow-hidden">
          <img 
            src="/lab-hero.png" 
            alt="IC Design Laboratory" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end pointer-events-none">
            <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16 md:pb-24 pointer-events-auto">
              <p className="text-sm font-semibold tracking-widest uppercase text-white/60 mb-4">{t('home.heroSubtitle')}</p>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <p className="max-w-2xl text-2xl md:text-3xl text-white leading-relaxed font-light">
                  {t('home.heroDesc')}
                </p>
                <div className="flex gap-4">
                  <a href="/research/project" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors">{t('home.exploreResearch')}</a>
                  <a href="/contact" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white border border-white/30 hover:border-white hover:bg-white/10 transition-colors">{t('home.contactUs')}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* News Sections (World News & Vietnam News Side-by-Side) */}
      <section className="w-full py-24 md:py-32">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            
            {/* World News Column */}
            <div className="space-y-12">
              <div className="flex items-end justify-between border-b border-slate-900 pb-6">
                <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-slate-900">{t('home.worldNews')}</h2>
                <a href="/news/world-news" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">{t('home.viewAll')}</a>
              </div>
              
              <div className="space-y-8">
                {worldNews.length > 0 ? (
                  worldNews.map(item => (
                    <article key={item._id} className="group flex gap-6 hover:bg-slate-50 transition-colors -mx-4 p-4 rounded-lg">
                      {item.thumbnail && (
                        <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-slate-100 overflow-hidden border border-slate-200">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                            {item.source}
                          </span>
                          <span className="text-xs font-light text-slate-400">
                            {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.title}
                          </a>
                        </h3>
                        <p className="text-slate-500 text-xs font-light leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm font-light text-slate-400">{t('home.noWorldNews')}</p>
                )}
              </div>
            </div>

            {/* Vietnam News Column */}
            <div className="space-y-12">
              <div className="flex items-end justify-between border-b border-slate-900 pb-6">
                <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-slate-900">{t('home.vietnamNews')}</h2>
                <a href="/news/vietnam-news" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">{t('home.viewAll')}</a>
              </div>
              
              <div className="space-y-8">
                {vietnamNews.length > 0 ? (
                  vietnamNews.map(item => (
                    <article key={item._id} className="group flex gap-6 hover:bg-slate-50 transition-colors -mx-4 p-4 rounded-lg">
                      {item.thumbnail && (
                        <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-slate-100 overflow-hidden border border-slate-200">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                            {item.source}
                          </span>
                          <span className="text-xs font-light text-slate-400">
                            {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.title}
                          </a>
                        </h3>
                        <p className="text-slate-500 text-xs font-light leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm font-light text-slate-400">{t('home.noVietnamNews')}</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Research Section - Asymmetric / Split Layout */}
      {research.length > 0 && (
        <section className="w-full py-24 md:py-32 bg-slate-50">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-24 border-b border-slate-900 pb-6">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">{t('home.researchFocus')}</h2>
              <a href="/research/project" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">{t('home.exploreProjects')}</a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12 lg:gap-x-16">
              {research.map((item, index) => (
                <article key={item._id} className={`flex flex-col ${index === 0 ? 'md:col-span-8' : index === 1 ? 'md:col-span-4' : 'md:col-span-6'} group cursor-default`}>
                  <div className="w-full aspect-[4/3] bg-slate-200 mb-8 overflow-hidden relative">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-slate-800 group-hover:scale-105 transition-transform duration-1000 ease-out flex items-center justify-center opacity-10"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 mix-blend-multiply">
                          <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">{item.category}</span>
                  <h3 className="text-3xl md:text-4xl font-medium text-slate-900 leading-tight mb-4 group-hover:opacity-70 transition-opacity">{item.title}</h3>
                  <p className="text-slate-600 font-light leading-relaxed line-clamp-3 md:line-clamp-none max-w-2xl">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Members Section */}
      {members.length > 0 && (
        <section className="w-full py-24 md:py-32">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-slate-900 pb-6">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">{t('home.featuredMembers')}</h2>
              <div className="flex flex-wrap gap-4 mt-6 md:mt-0 text-sm font-semibold uppercase tracking-widest text-slate-500">
                <a href="/people/professor" className="hover:text-slate-900 transition-colors">{t('home.professors')}</a>
                <span className="text-slate-300">|</span>
                <a href="/people/students" className="hover:text-slate-900 transition-colors">{t('home.students')}</a>
                <span className="text-slate-300">|</span>
                <a href="/people/alumni" className="hover:text-slate-900 transition-colors">{t('home.alumni')}</a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-16 lg:gap-x-10">
              {members.map((member, index) => (
                <article key={member._id} className={`group flex flex-col ${index % 2 === 1 ? 'md:mt-16' : ''}`}>
                  <div className="w-full aspect-[3/4] bg-slate-100 mb-6 overflow-hidden">
                    {member.image ? (
                      <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-all duration-700 ease-in-out group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-medium text-slate-900">{member.name}</h3>
                  <p className="text-sm font-light text-slate-500 mt-1">{member.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Jobs & Internships Section */}
      {jobsNews.length > 0 && (
        <section className="w-full py-24 md:py-32 bg-slate-50 border-t border-slate-200">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-slate-900 pb-6">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">{t('home.jobsAndInternships')}</h2>
              <a href="/news/jobs" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">{t('home.viewAllOpportunities')}</a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {jobsNews.map(item => (
                <article key={item._id} className="group bg-white p-6 border border-slate-200 hover:border-slate-900 transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-200">
                        {item.source}
                      </span>
                      <span className="text-xs font-light text-slate-400">
                        {new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h3>
                    <p className="text-slate-500 text-xs font-light leading-relaxed line-clamp-3">
                      {item.summary}
                    </p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 mt-6 flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('home.jobsAndInternships')}</span>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest text-slate-900 group-hover:text-blue-600 transition-colors">{t('home.details')}</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recruitments Section */}
      {recruitments.length > 0 && (
        <section className="w-full py-24 md:py-32 border-t border-slate-150">
          <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-slate-900 pb-6">
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">{t('home.labRecruitment')}</h2>
              <a href="/lab-recruitment" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">{t('home.viewAllPositions')}</a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recruitments.map(item => {
                const isActive = item.status === 'active';
                return (
                  <article key={item._id} className="bg-white p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group">
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-4 ${isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isActive ? t('home.openPosition', 'Open Position') : t('home.closedPosition', 'Closed')}
                      </span>
                      <h3 className="text-2xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {item.title}
                      </h3>
                    </div>

                    <p className="text-slate-600 font-light text-sm flex-1 whitespace-pre-line leading-relaxed mb-6 line-clamp-4">
                      {item.description}
                    </p>

                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-medium">
                        {t('home.deadline')}<span className="text-slate-900">{new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <a
                        href={item.googleFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center text-sm font-semibold transition-colors group/link ${isActive ? 'text-blue-600 hover:text-blue-800' : 'cursor-not-allowed text-slate-400'}`}
                        onClick={(e) => { if (!isActive) e.preventDefault() }}
                      >
                        {t('home.applyNow')}
                        <svg className="w-4 h-4 ml-1 transform group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
