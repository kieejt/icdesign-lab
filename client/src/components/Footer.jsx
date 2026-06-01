import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white pt-16 pb-8 shadow-sm">
      <div className="w-full px-4 md:px-12 lg:px-24 xl:px-32">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">IC Design Lab</h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Integrated Circuit Design Laboratory - A place for training and research in advanced IC technology solutions, embedded systems, and computer engineering.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                <span>Dr. Nguyen Vu Thang</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>IC design Lab, 824 C7, Hanoi University of Science and Technology, Hanoi, Vietnam.</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span>thang.nguyenvu@hust.edu.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <span>Phone: (84) 916987468</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quick Links</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-500 font-medium">
              <li><a href="/research" className="hover:text-blue-600 transition-colors">Research Projects</a></li>
              <li><a href="/documents" className="hover:text-blue-600 transition-colors">Academic Documents</a></li>
              <li><a href="/jobs" className="hover:text-blue-600 transition-colors">Recruitment Info</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} ICDesign Lab. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Designed with modern aesthetics.</p>
        </div>
      </div>
    </footer>
  );
}
