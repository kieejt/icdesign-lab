import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function HomePage() {
  const [research, setResearch] = useState([])
  const [members, setMembers] = useState([])
  const [recruitments, setRecruitments] = useState([])
  const [worldNews, setWorldNews] = useState([])
  const [vietnamNews, setVietnamNews] = useState([])
  const [jobsNews, setJobsNews] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resResearch, resMembers, resRecruitment, resNews] = await Promise.all([
          api.get('/research'),
          api.get('/members'),
          api.get('/recruitment'),
          api.get('/news/published')
        ]);
        setResearch(resResearch.data.slice(0, 3));
        setMembers(resMembers.data.slice(0, 4));
        setRecruitments(resRecruitment.data.slice(0, 3));
        
        const approvedNews = resNews.data || [];
        const world = approvedNews.filter(item => item.category === 'World News');
        const vietnam = approvedNews.filter(item => item.category === 'Vietnam News');
        const jobs = approvedNews.filter(item => item.category === 'Jobs');
        setWorldNews(world.slice(0, 3));
        setVietnamNews(vietnam.slice(0, 3));
        setJobsNews(jobs.slice(0, 3));
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
              <p className="text-sm font-semibold tracking-widest uppercase text-white/60 mb-4">IC Design Lab</p>
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <p className="max-w-2xl text-2xl md:text-3xl text-white leading-relaxed font-light">
                  A premier research facility dedicated to advanced IC technology solutions, embedded systems, and computer engineering.
                </p>
                <div className="flex gap-4">
                  <a href="/research/project" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors">Explore Research</a>
                  <a href="/contact" className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white border border-white/30 hover:border-white hover:bg-white/10 transition-colors">Contact Us</a>
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
                <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-slate-900">World News</h2>
                <a href="/news/world-news" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">View All →</a>
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
                  <p className="text-sm font-light text-slate-400">No world news available.</p>
                )}
              </div>
            </div>

            {/* Vietnam News Column */}
            <div className="space-y-12">
              <div className="flex items-end justify-between border-b border-slate-900 pb-6">
                <h2 className="text-2xl md:text-4xl font-medium tracking-tight text-slate-900">Vietnam News</h2>
                <a href="/news/vietnam-news" className="text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors">View All →</a>
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
                  <p className="text-sm font-light text-slate-400">No Vietnam news available.</p>
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
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">Research Focus</h2>
              <a href="/research/project" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">Explore Projects →</a>
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
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">Featured Members</h2>
              <div className="flex flex-wrap gap-4 mt-6 md:mt-0 text-sm font-semibold uppercase tracking-widest text-slate-500">
                <a href="/people/professor" className="hover:text-slate-900 transition-colors">Professors</a>
                <span className="text-slate-300">|</span>
                <a href="/people/students" className="hover:text-slate-900 transition-colors">Students</a>
                <span className="text-slate-300">|</span>
                <a href="/people/alumni" className="hover:text-slate-900 transition-colors">Alumni</a>
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
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">Jobs & Internships</h2>
              <a href="/news/jobs" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">View All Opportunities →</a>
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
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jobs & Internships</span>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest text-slate-900 group-hover:text-blue-600 transition-colors">Details →</a>
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
              <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-slate-900">Lab Recruitment</h2>
              <a href="/lab-recruitment" className="text-sm font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors mt-6 md:mt-0">View All Positions →</a>
            </div>

            <div className="flex flex-col">
              {recruitments.map(item => {
                const isActive = item.status === 'active';
                return (
                  <article key={item._id} className={`group flex flex-col md:flex-row gap-6 md:gap-12 py-12 border-b border-slate-200 ${!isActive ? 'opacity-50' : 'hover:bg-slate-50 transition-colors -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8'}`}>
                    <div className="md:w-1/4 shrink-0">
                      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        {isActive ? <span className="w-2 h-2 rounded-full bg-emerald-500"></span> : null}
                        {item.status}
                      </span>
                      <p className="text-sm font-medium text-slate-500 mt-6">Deadline: {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="md:w-3/4 flex flex-col">
                      <h3 className="text-2xl md:text-3xl font-medium text-slate-900 leading-tight mb-6">{item.title}</h3>
                      <p className="text-slate-600 font-light leading-relaxed max-w-3xl mb-8">{item.description}</p>
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
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
