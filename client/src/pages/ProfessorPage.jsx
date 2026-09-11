import React from 'react'
import { useTranslation } from 'react-i18next'

import MemberDirectory from '../components/MemberDirectory'

export default function ProfessorPage() {
  const { t } = useTranslation()

  return (
    <MemberDirectory
      basePath="/people/professor"
      category="Professors"
      eyebrow={t('ui.eyebrowFaculty')}
      title={t('people.profTitle')}
      subtitle={t('people.profSubtitle')}
      emptyLabel={t('people.noProfessors')}
      cardSize="lg"
    />
  )
}
