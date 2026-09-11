import React from 'react'
import { useTranslation } from 'react-i18next'

import MemberDirectory from '../components/MemberDirectory'

export default function StudentsPage() {
  const { t } = useTranslation()

  return (
    <MemberDirectory
      basePath="/people/students"
      category="Students"
      eyebrow={t('ui.eyebrowResearchers')}
      title={t('people.studentsTitle')}
      subtitle={t('people.studentsSubtitle')}
      emptyLabel={t('people.noStudents')}
    />
  )
}
