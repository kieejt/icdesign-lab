import React from 'react';
import NewsFeedLayout from '../components/NewsFeedLayout';

export default function WorldNewsPage() {
  return (
    <NewsFeedLayout
      eyebrow="News"
      title="Global Semiconductor News"
      subtitle="Breaking news, market trends, and supply chain updates from around the world."
      category="World News"
    />
  );
}
