import React from 'react'
import { useTranslation } from 'react-i18next'

import MemberDirectory from '../components/MemberDirectory'

export default function AlumniPage() {
  const { t } = useTranslation()

  return (
    <MemberDirectory
      basePath="/people/alumni"
      category="Alumni"
      eyebrow={t('ui.eyebrowGraduates')}
      title={t('people.alumniTitle')}
      subtitle={t('people.alumniSubtitle')}
      emptyLabel={t('people.noAlumni')}
    />
  )
}
