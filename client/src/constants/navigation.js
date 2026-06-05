export const publicNavItems = [
  { to: '/', label: 'Home' },
  {
    label: 'People',
    children: [
      { to: '/people/professor', label: 'Professor' },
      { to: '/people/students', label: 'Students' },
      { to: '/people/alumni', label: 'Alumni' },
    ]
  },
  {
    label: 'Research and Teaching',
    children: [
      { to: '/research/project', label: 'Project' },
      { to: '/research/publications', label: 'Publications' },
      { to: '/lectures', label: 'Lectures' },
    ]
  },
  {
    label: 'Lab Event',
    children: [
      { to: '/lab-event/event', label: 'Event' },
      { to: '/lab-event/gallery', label: 'Gallery' },
    ]
  },
  { to: '/documents', label: 'Documents' },
  {
    label: 'News',
    children: [
      { to: '/news/world-news', label: 'World News' },
      { to: '/news/vietnam-news', label: 'Vietnam News' },
    ]
  },
  { to: '/news/jobs', label: 'Jobs & Internship' },
  { to: '/contact', label: 'Contact' },
]

export const adminNavItems = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/people', label: 'People' },
  { to: '/admin/research', label: 'Research' },
  { to: '/admin/lab-event', label: 'Lab Event' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/news', label: 'News' },
  { to: '/admin/contact', label: 'Contact' },
  { to: '/admin/lectures', label: 'Upload Lectures' },
  { to: '/admin/accounts', label: 'Manage Accounts' },
]
