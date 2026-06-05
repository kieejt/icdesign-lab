import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [contactInfo, setContactInfo] = useState(null);
  const [recruitments, setRecruitments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactRes, recRes] = await Promise.all([
          api.get('/settings/contact_info'),
          api.get('/recruitment')
        ]);
        if (contactRes.data && contactRes.data.value) setContactInfo(contactRes.data.value);
        if (recRes.data) setRecruitments(recRes.data.filter(r => r.status === 'active'));
      } catch (err) {
        console.error('Failed to fetch contact/recruitment info', err);
      }
    };
    fetchData();
  }, []);

  const address = i18n.language === 'vi' ? contactInfo?.addressVi : contactInfo?.addressEn;
  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">{t('contact.title')}</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12 lg:gap-x-16">

            <div className="md:col-span-5 flex flex-col gap-12">
              <div>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 mb-8 border-b border-slate-200 pb-4">{t('contact.labInfo')}</h2>
                <ul className="flex flex-col gap-8">
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{t('contact.headOfLab')}</p>
                      <p className="text-lg text-slate-900">{contactInfo?.headName || t('contact.headName')}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{t('contact.addressTitle')}</p>
                      <p className="text-lg text-slate-900 leading-relaxed max-w-xs">
                        {address || t('contact.addressDesc')}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{t('contact.email')}</p>
                      <a href={`mailto:${contactInfo?.email || 'thang.nguyenvu@hust.edu.vn'}`} className="text-lg text-slate-900 hover:text-blue-600 transition-colors break-all">
                        {contactInfo?.email || 'thang.nguyenvu@hust.edu.vn'}
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{t('contact.phone')}</p>
                      <a href={`tel:${contactInfo?.phone?.replace(/\s+/g, '')}`} className="text-lg text-slate-900 hover:text-blue-600 transition-colors">
                        {contactInfo?.phone || '(84) 916987468'}
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="md:col-span-7 h-full min-h-[400px] w-full bg-slate-100 overflow-hidden relative">



              <iframe src={contactInfo?.mapUrl || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d575.1658787318516!2d105.84500795607735!3d21.005270151926574!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ad3592853133%3A0x20992b190671769b!2zTmjDoCBDNyAsIMSQ4bqhaSBI4buNYyBCw6FjaCBLaG9hIEjDoCBO4buZaQ!5e0!3m2!1svi!2s!4v1779210986072!5m2!1svi!2s"}
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>

          </div>
        </div>
      </section>

      {/* Join the Lab Section */}
      <section className="w-full bg-slate-50 py-16 md:py-24 border-t border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 mb-4">{t('nav.Join the Lab', 'Join the Lab')}</h2>
            <p className="max-w-2xl text-lg text-slate-600 font-light">
              {t('contact.recruitmentSubtitle', 'We are always looking for talented and motivated students to join our research team. Check out the open positions below.')}
            </p>
          </div>

          {recruitments.length === 0 ? (
            <div className="text-center text-slate-500 font-light py-12">
              {t('contact.noRecruitments', 'There are currently no open positions. Please check back later.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recruitments.map((job) => (
                <div key={job._id} className="bg-white p-8 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest mb-4">
                      Open Position
                    </span>
                    <h3 className="text-2xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                      {job.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-600 font-light text-sm flex-1 whitespace-pre-line leading-relaxed mb-6">
                    {job.description}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-medium">
                      Deadline: <span className="text-slate-900">{new Date(job.deadline).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={job.googleFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors group/link"
                    >
                      Apply Now
                      <svg className="w-4 h-4 ml-1 transform group-hover/link:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
