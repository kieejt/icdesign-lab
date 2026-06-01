import React, { useEffect, useState } from 'react';
import api from '../lib/api';

export default function ProjectPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/research?category=Project');
        setProjects(response.data);
      } catch (error) {
        console.error('Failed to fetch projects', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200 bg-slate-50">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Research Projects</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            Pushing the boundaries of IC design, embedded systems, and computer engineering.
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-slate-50">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-slate-900"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12 lg:gap-x-16">
              {projects.map((project, index) => (
                <article key={project._id} className={`flex flex-col ${index % 3 === 0 ? 'md:col-span-8' : 'md:col-span-4'} group cursor-default`}>
                  <div className="w-full aspect-[4/3] bg-slate-200 mb-8 overflow-hidden relative">
                    {project.image ? (
                      <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-slate-800 group-hover:scale-105 transition-transform duration-1000 ease-out flex items-center justify-center opacity-10"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 mix-blend-multiply">
                          <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">{project.category}</span>
                  <h3 className="text-3xl md:text-4xl font-medium text-slate-900 leading-tight mb-4 group-hover:opacity-70 transition-opacity">{project.title}</h3>
                  <p className="text-slate-600 font-light leading-relaxed whitespace-pre-wrap max-w-3xl">{project.description}</p>
                </article>
              ))}
              {projects.length === 0 && (
                <div className="col-span-full text-center py-24 text-slate-500 font-light">
                  No projects found.
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
