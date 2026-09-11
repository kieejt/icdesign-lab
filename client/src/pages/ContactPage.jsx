import React from 'react'
import { useTranslation } from 'react-i18next'

import useApiQuery from '../hooks/useApiQuery'
import {
  Badge,
  EmptyState,
  Icon,
  PageHeader,
  Section,
  Shell,
  Skeleton,
  formatDate,
} from '../components/ui'

const FALLBACK = {
  email: 'thang.nguyenvu@hust.edu.vn',
  phone: '(84) 916987468',
  mapUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d575.1658787318516!2d105.84500795607735!3d21.005270151926574!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ad3592853133%3A0x20992b190671769b!2zTmjDoCBDNyAsIMSQ4bqhaSBI4buNYyBCw6FjaCBLaG9hIEjDoCBO4buZaQ!5e0!3m2!1svi!2s!4v1779210986072!5m2!1svi!2s',
}

/** One labelled contact row. */
function ContactRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-4 border-t border-paper-border py-5">
      <Icon name={icon} className="mt-1 h-4 w-4 shrink-0 text-ink-300" />
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <div className="mt-1.5 text-[15px] leading-relaxed text-ink-800">{children}</div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  const settings = useApiQuery('/settings/contact_info', {
    select: (payload) => payload?.value ?? null,
    staleTime: 10 * 60_000,
  })

  const recruitment = useApiQuery('/recruitment', {
    select: (payload) => (Array.isArray(payload) ? payload.filter((r) => r.status === 'active') : []),
    staleTime: 5 * 60_000,
  })

  const info = settings.data
  const address = i18n.language === 'vi' ? info?.addressVi : info?.addressEn
  const openings = recruitment.data ?? []

  return (
    <>
      <PageHeader eyebrow={t('ui.eyebrowGetInTouch')} title={t('contact.title')} subtitle={t('contact.subtitle')} />

      {/* ----------------------------------------------------------------- */}
      {/* Contact details + map                                             */}
      {/* ----------------------------------------------------------------- */}
      <Section>
        <Shell>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 className="font-display text-xl font-semibold text-ink-950">
                {t('contact.labInfo')}
              </h2>

              <div className="mt-6">
                {settings.loading ? (
                  <div className="space-y-6">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="space-y-2 border-t border-paper-border py-5">
                        <Skeleton className="h-2.5 w-24" />
                        <Skeleton className="h-5 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <ContactRow icon="user" label={t('contact.headOfLab')}>
                      {info?.headName || t('contact.headName')}
                    </ContactRow>

                    <ContactRow icon="pin" label={t('contact.addressTitle')}>
                      {address || t('contact.addressDesc')}
                    </ContactRow>

                    <ContactRow icon="mail" label={t('contact.email')}>
                      <a
                        href={`mailto:${info?.email || FALLBACK.email}`}
                        className="link break-all"
                      >
                        {info?.email || FALLBACK.email}
                      </a>
                    </ContactRow>

                    <ContactRow icon="phone" label={t('contact.phone')}>
                      <a
                        href={`tel:${(info?.phone || FALLBACK.phone).replace(/[^\d+]/g, '')}`}
                        className="link"
                      >
                        {info?.phone || FALLBACK.phone}
                      </a>
                    </ContactRow>
                  </>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative h-full min-h-[380px] w-full border border-paper-border bg-paper-sunken">
                <iframe
                  title="Lab location"
                  src={info?.mapUrl || FALLBACK.mapUrl}
                  width="100%"
                  height="100%"
                  // The map is a third-party frame well below the fold on mobile;
                  // lazy-loading keeps it off the critical path entirely.
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ border: 0, position: 'absolute', inset: 0 }}
                />
              </div>
            </div>
          </div>
        </Shell>
      </Section>

      {/* ----------------------------------------------------------------- */}
      {/* Open positions                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Section tone="sunken" className="border-t border-paper-border">
        <Shell>
          <div className="max-w-measure">
            <h2 className="font-display text-2xl font-semibold text-ink-950">
              {t('nav.Join the Lab', 'Join the Lab')}
            </h2>
            <p className="lede mt-3">{t('contact.recruitmentSubtitle')}</p>
          </div>

          <div className="mt-10">
            {recruitment.loading ? (
              <div className="divide-hairline border-t border-paper-border">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className="space-y-3 py-6">
                    <Skeleton className="h-2.5 w-28" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : openings.length === 0 ? (
              <EmptyState
                icon={<Icon name="document" className="h-12 w-12" strokeWidth={1} />}
                title={t('contact.noRecruitments')}
              />
            ) : (
              <div className="divide-hairline border-t border-paper-border">
                {openings.map((job) => (
                  <article
                    key={job._id}
                    className="flex flex-col gap-4 py-7 lg:flex-row lg:items-start lg:gap-12"
                  >
                    <div className="flex shrink-0 flex-col gap-2 lg:w-56">
                      <Badge tone="ok">{t('home.openPosition', 'Open Position')}</Badge>
                      <span className="font-mono text-[11px] text-ink-400">
                        {t('home.deadline')}
                        <span className="text-ink-700">
                          {formatDate(job.deadline, 'short', locale)}
                        </span>
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-semibold leading-snug text-ink-950">
                        {job.title}
                      </h3>
                      <p className="prose-body mt-3 whitespace-pre-line">{job.description}</p>
                      <a
                        href={job.googleFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary btn-sm mt-5"
                      >
                        {t('home.applyNow')}
                        <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Shell>
      </Section>
    </>
  )
}
