import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Shell } from '../components/ui'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <Shell className="flex min-h-[60vh] flex-col justify-center py-24">
      <p className="eyebrow">{t('ui.error404')}</p>
      <h1 className="text-display-md mt-5 font-medium text-ink-950">{t('ui.notFoundTitle')}</h1>
      <p className="lede mt-6">
        {t('ui.notFoundBody')}
      </p>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/" className="btn-primary">
          {t('ui.backToHome')}
        </Link>
        <Link to="/research/project" className="btn-secondary">
          {t('research.projectsTitle')}
        </Link>
        <Link to="/contact" className="btn-secondary">
          {t('contact.title')}
        </Link>
      </div>
    </Shell>
  )
}
