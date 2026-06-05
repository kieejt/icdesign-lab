import React from 'react';
import { useTranslation } from 'react-i18next';
import JobsFeedLayout from '../components/JobsFeedLayout';

export default function JobsInternshipPage() {
  const { t } = useTranslation();
  return (
    <JobsFeedLayout
      eyebrow={t('jobs.eyebrow')}
      title={t('jobs.title')}
      subtitle={t('jobs.subtitle')}
      category="Jobs"
    />
  );
}
