import React from 'react';
import { useTranslation } from 'react-i18next';
import NewsFeedLayout from '../components/NewsFeedLayout';

export default function VietnamNewsPage() {
  const { t } = useTranslation();
  return (
    <NewsFeedLayout
      eyebrow={t('media.newsEyebrow')}
      title={t('media.vnTitle')}
      subtitle={t('media.vnSubtitle')}
      category="Vietnam News"
    />
  );
}
