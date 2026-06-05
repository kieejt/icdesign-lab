import React from 'react';
import { useTranslation } from 'react-i18next';
import NewsFeedLayout from '../components/NewsFeedLayout';

export default function WorldNewsPage() {
  const { t } = useTranslation();
  return (
    <NewsFeedLayout
      eyebrow={t('media.newsEyebrow')}
      title={t('media.worldTitle')}
      subtitle={t('media.worldSubtitle')}
      category="World News"
    />
  );
}
