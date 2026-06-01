import React from 'react';

export default function ContactPage() {
  return (
    <div className="w-full flex flex-col items-center">
      <section className="w-full pt-16 pb-24 border-b border-slate-200">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900">Contact Us</h1>
          <p className="mt-6 md:mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed font-light">
            Get in touch with the IC Design Lab for research collaborations, admissions, and general inquiries.
          </p>
        </div>
      </section>

      <section className="w-full py-16 md:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-12 lg:gap-x-16">

            <div className="md:col-span-5 flex flex-col gap-12">
              <div>
                <h2 className="text-2xl font-medium tracking-tight text-slate-900 mb-8 border-b border-slate-200 pb-4">Lab Information</h2>
                <ul className="flex flex-col gap-8">
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Head of Laboratory</p>
                      <p className="text-lg text-slate-900">Dr. Nguyen Vu Thang</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Address</p>
                      <p className="text-lg text-slate-900 leading-relaxed max-w-xs">
                        IC design Lab, 824 C7, Hanoi University of Science and Technology, Hanoi, Vietnam.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Email</p>
                      <a href="mailto:thang.nguyenvu@hust.edu.vn" className="text-lg text-slate-900 hover:text-blue-600 transition-colors">
                        thang.nguyenvu@hust.edu.vn
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 group">
                    <svg className="w-6 h-6 text-slate-400 group-hover:text-slate-900 transition-colors mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Phone</p>
                      <a href="tel:+84916987468" className="text-lg text-slate-900 hover:text-blue-600 transition-colors">
                        (84) 916987468
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="md:col-span-7 h-full min-h-[400px] w-full bg-slate-100 overflow-hidden relative">



              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d575.1658787318516!2d105.84500795607735!3d21.005270151926574!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ad3592853133%3A0x20992b190671769b!2zTmjDoCBDNyAsIMSQ4bqhaSBI4buNYyBCw6FjaCBLaG9hIEjDoCBO4buZaQ!5e0!3m2!1svi!2s!4v1779210986072!5m2!1svi!2s"
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', top: 0, left: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                className="filter grayscale hover:grayscale-0 transition-all duration-700"
              ></iframe>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
