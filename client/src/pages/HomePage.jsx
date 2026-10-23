import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import heroAvif1024 from '../assets/hero/hero-1024.avif'
import heroAvif480 from '../assets/hero/hero-480.avif'
import heroAvif800 from '../assets/hero/hero-800.avif'
import hero480 from '../assets/hero/hero-480.webp'
import hero800 from '../assets/hero/hero-800.webp'
import hero1024 from '../assets/hero/hero-1024.webp'
import { CONTACT_FALLBACK } from '../constants/contact'
import EventCard from '../components/EventCard'
import useApiQuery from '../hooks/useApiQuery'
import {
  Badge,
  Icon,
  Media,
  QuietLink,
  Section,
  SectionHeading,
  Shell,
  Skeleton,
  SkeletonCard,
  formatDate,
} from '../components/ui'

/*
 * Homepage.
 *
 * Ordered the way research-lab front pages conventionally are, because that
 * order answers the questions visitors actually arrive with:
 *
 *   1. Banner        — who this lab is, in one line.
 *   2. Overview      — what it works on, plus the standing figures.
 *   3. News          — a dated list. The most-read block on any lab site, so it
 *                      sits above research rather than below it.
 *   4. Research      — current projects.
 *   5. People        — an orderly portrait grid, no decorative offsets.
 *   6. Join us       — open positions and opportunities, last.
 */

/**
 * Which people list a member belongs to.
 *
 * The homepage mixes all three groups into one row, so each card has to work
 * out its own profile URL from the member's category.
 */
const PEOPLE_PATHS = {
  Professors: '/people/professor',
  Students: '/people/students',
  Alumni: '/people/alumni',
}

/** A dated one-line news entry. Academic news sections are lists, not card walls. */
function NewsItem({ item, locale }) {
  return (
    <article className="group flex gap-5 py-4">
      <time
        className="hidden w-24 shrink-0 pt-0.5 font-mono text-[12.5px] uppercase tracking-label text-ink-400 sm:block"
        dateTime={item.publishedAt}
      >
        {formatDate(item.publishedAt, 'short', locale)}
      </time>

      <div className="min-w-0 flex-1">
        <h3 className="text-[16.5px] font-medium leading-snug text-ink-800 transition-colors group-hover:text-accent-600">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-relaxed text-ink-500">
          {item.summary}
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="font-mono text-[12px] uppercase tracking-label text-ink-400">
            {item.source}
          </span>
          <time
            className="font-mono text-[12px] text-ink-300 sm:hidden"
            dateTime={item.publishedAt}
          >
            {formatDate(item.publishedAt, 'short', locale)}
          </time>
        </div>
      </div>
    </article>
  )
}

/** One of the two side-by-side news columns. */
function NewsColumn({ title, items, viewAllTo, emptyLabel, loading, locale, viewAllLabel }) {
  return (
    <div className="space-y-6">
      <SectionHeading
        size="sm"
        title={title}
        action={<QuietLink to={viewAllTo}>{viewAllLabel}</QuietLink>}
      />
      <div className="divide-hairline">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2.5 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))
        ) : items.length > 0 ? (
          items.map((item) => <NewsItem key={item._id} item={item} locale={locale} />)
        ) : (
          <p className="py-6 text-sm text-ink-400">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

/** A labelled figure in the overview strip. */
function Stat({ value, label, loading }) {
  return (
    <div className="border-l border-paper-border pl-5">
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <p className="font-display text-3xl font-semibold tabular-nums text-ink-950">{value}</p>
      )}
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  /*
   * One request for the whole page.
   *
   * This used to be nine parallel calls (research x2, members x3, recruitment,
   * news x3). The server now assembles the same data in a single cached response,
   * so a visit costs one round trip instead of nine, and a returning visitor is
   * served from the shared SWR cache. Each section below still reads only its own
   * slice, so a section with no content simply doesn't render.
   */
  const home = useApiQuery('/home', { staleTime: 5 * 60_000 })

  // Editable in the admin area; the built-in values show until it loads.
  const contactSetting = useApiQuery('/settings/contact_info', {
    select: (payload) => payload?.value ?? null,
    staleTime: 10 * 60_000,
  })
  const contact = contactSetting.data
  const contactEmail = contact?.email || CONTACT_FALLBACK.email
  const contactPhone = contact?.phone || CONTACT_FALLBACK.phone
  const contactAddress =
    (i18n.language === 'vi' ? contact?.addressVi : contact?.addressEn) || t('contact.addressDesc')
  const slice = (key) => ({ data: home.data?.[key], loading: home.loading })

  const research = slice('projects')
  const publications = slice('publications')
  const professors = slice('professors')
  const students = slice('students')
  const alumni = slice('alumni')
  const recruitment = slice('recruitment')
  const worldNews = slice('worldNews')
  const vietnamNews = slice('vietnamNews')
  const jobsNews = slice('jobsNews')
  const events = slice('events')

  const projects = research.data?.data ?? []

  // Professors first, then students, then alumni — a lab with a single professor
  // still fills all four slots instead of showing one lonely card.
  const members = [
    ...(professors.data?.data ?? []),
    ...(students.data?.data ?? []),
    ...(alumni.data?.data ?? []),
  ].slice(0, 4)
  const membersLoading = professors.loading && students.loading && alumni.loading

  // `total` comes back with every paginated response, so the headline figures
  // cost nothing beyond the requests the page already makes.
  const stats = {
    people:
      (professors.data?.total ?? 0) + (students.data?.total ?? 0) + (alumni.data?.total ?? 0),
    projects: research.data?.total ?? 0,
    publications: publications.data?.total ?? 0,
  }
  const statsLoading = professors.loading || research.loading || publications.loading

  return (
    <>
      {/* ================================================================= */}
      {/* Banner                                                            */}
      {/* ================================================================= */}
      <section className="w-full border-b border-paper-border">
        {/* Full-width, one-screen-tall photograph (viewport minus the header), washed out under a light veil so the two lines of
            text read on top of it. The photo is square, so the band shows a wide
            slice of it (object-position favours the people and the benches). */}
        <div className="relative h-[calc(100svh-6rem)] min-h-[420px] w-full overflow-hidden bg-paper lg:h-[calc(100svh-10.6rem)]">
          {/* AVIF is about half the size of the WebP (800 px: 55 kB vs 80 kB), which
              matters here: the photo is the LCP element. Browsers without AVIF take
              the WebP. */}
          <picture>
            <source
              type="image/avif"
              srcSet={`${heroAvif480} 480w, ${heroAvif800} 800w, ${heroAvif1024} 1024w`}
              sizes="100vw"
            />
            <img
              src={hero1024}
              srcSet={`${hero480} 480w, ${hero800} 800w, ${hero1024} 1024w`}
              width="1024"
              height="1024"
              sizes="100vw"
              alt={t('home.heroAlt')}
              // The LCP element: fetched eagerly and decoded synchronously so it
              // is not queued behind lazy images further down the page.
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              className="h-full w-full object-cover object-[50%_58%]"
            />
          </picture>
          <div className="absolute inset-0 bg-paper/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/75 via-paper/25 to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <Shell>
              <div className="animate-fade-up">
                <h1 className="font-display text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl lg:text-6xl">
                  {t('home.heroSubtitle')}
                </h1>
                <p className="eyebrow mt-4 text-ink-800">{t('home.heroUniversity')}</p>
              </div>
            </Shell>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Overview                                                          */}
      {/* ================================================================= */}
      <Section className="border-b border-paper-border bg-paper-raised">
        <Shell>
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="eyebrow">{t('home.aboutEyebrow')}</p>
              <p className="prose-body mt-5 text-[18px] leading-[1.7] text-ink-700">
                {t('home.aboutBody1')}
              </p>
              <p className="prose-body mt-4">{t('home.aboutBody2')}</p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <QuietLink to="/people/professor">{t('home.facultyAndMembers')}</QuietLink>
                <QuietLink to="/research/publications">{t('nav.Publications')}</QuietLink>
                <QuietLink to="/documents">{t('home.teachingMaterials')}</QuietLink>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="grid grid-cols-3 gap-4">
                <Stat value={stats.people} label={t('home.statMembers')} loading={statsLoading} />
                <Stat value={stats.projects} label={t('home.statProjects')} loading={statsLoading} />
                <Stat value={stats.publications} label={t('home.statPublications')} loading={statsLoading} />
              </div>

              <div className="mt-8 border border-paper-border bg-paper-sunken p-6">
                <p className="eyebrow">{t('home.locationEyebrow')}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">
                  {t('home.addressLine1')}
                  <br />
                  {t('home.addressLine2')}
                  <br />
                  {t('home.addressLine3')}
                </p>
                <a
                  href="mailto:thang.nguyenvu@hust.edu.vn"
                  className="link mt-4 inline-block text-sm"
                >
                  thang.nguyenvu@hust.edu.vn
                </a>
              </div>
            </div>
          </div>
        </Shell>
      </Section>

      {/* ================================================================= */}
      {/* Events                                                            */}
      {/* ================================================================= */}
      {((events.data || []).length > 0 || events.loading) && (
        <Section className="border-b border-paper-border">
          <Shell>
            <SectionHeading
              title={t('home.events')}
              action={
                <QuietLink to="/lab-event/event">
                  {t('home.viewAll').replace('→', '').trim()}
                </QuietLink>
              }
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.loading
                ? Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="surface space-y-4 p-6" aria-hidden="true">
                      <Skeleton className="h-14 w-14" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-6 w-4/5" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))
                : events.data.map((event) => <EventCard key={event._id} event={event} locale={locale} />)}
            </div>
          </Shell>
        </Section>
      )}

      {/* ================================================================= */}
      {/* News                                                              */}
      {/* ================================================================= */}
      <Section>
        <Shell>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <NewsColumn
              title={t('home.worldNews')}
              items={worldNews.data || []}
              loading={worldNews.loading}
              viewAllTo="/news/world-news"
              viewAllLabel={t('home.viewAll').replace('→', '').trim()}
              emptyLabel={t('home.noWorldNews')}
              locale={locale}
            />
            <NewsColumn
              title={t('home.vietnamNews')}
              items={vietnamNews.data || []}
              loading={vietnamNews.loading}
              viewAllTo="/news/vietnam-news"
              viewAllLabel={t('home.viewAll').replace('→', '').trim()}
              emptyLabel={t('home.noVietnamNews')}
              locale={locale}
            />
          </div>
        </Shell>
      </Section>

      {/* ================================================================= */}
      {/* Research                                                          */}
      {/* ================================================================= */}
      {(research.loading || projects.length > 0) && (
        <Section tone="sunken" className="border-y border-paper-border">
          <Shell>
            <SectionHeading
              size="lg"
              title={t('home.researchFocus')}
              action={
                <QuietLink to="/research/project">
                  {t('home.exploreProjects').replace('→', '').trim()}
                </QuietLink>
              }
            />

            {/* An even grid. Research areas are peers; sizing one larger than
                the others implies a hierarchy the lab has not stated. */}
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {research.loading
                ? Array.from({ length: 4 }, (_, i) => (
                    <div key={i}>
                      <Skeleton className="mb-4 aspect-[4/3] w-full" />
                      <Skeleton className="mb-2 h-3 w-20" />
                      <Skeleton className="mb-2 h-5 w-4/5" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))
                : projects.map((item) => (
                    <Link
                      key={item._id}
                      to={`/research/project/${item._id}`}
                      className="group flex flex-col"
                    >
                      <Media
                        src={item.image}
                        alt={item.title}
                        ratio="aspect-[4/3]"
                        className="mb-4 border border-paper-border"
                        fallback={<Icon name="chip" className="h-10 w-10" strokeWidth={1} />}
                      />
                      <p className="eyebrow">{item.category}</p>
                      <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink-950 transition-colors group-hover:text-accent-700">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed text-ink-500">
                        {item.description}
                      </p>
                    </Link>
                  ))}
            </div>
          </Shell>
        </Section>
      )}

      {/* ================================================================= */}
      {/* People                                                            */}
      {/* ================================================================= */}
      {(membersLoading || members.length > 0) && (
        <Section>
          <Shell>
            <SectionHeading
              size="lg"
              title={t('home.featuredMembers')}
              action={
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <QuietLink to="/people/professor">{t('home.professors')}</QuietLink>
                  <span aria-hidden="true" className="text-ink-200">
                    ·
                  </span>
                  <QuietLink to="/people/students">{t('home.students')}</QuietLink>
                  <span aria-hidden="true" className="text-ink-200">
                    ·
                  </span>
                  <QuietLink to="/people/alumni">{t('home.alumni')}</QuietLink>
                </div>
              }
            />

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:gap-x-8">
              {membersLoading
                ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} variant="person" />)
                : members.map((member) => (
                    <Link
                      key={member._id}
                      to={`${PEOPLE_PATHS[member.category] ?? '/people/students'}/${member._id}`}
                      className="group flex flex-col"
                    >
                      <Media
                        src={member.image}
                        alt={member.name}
                        ratio="aspect-[3/4]"
                        className="mb-4 border border-paper-border"
                        fallback={<Icon name="user" className="h-9 w-9" strokeWidth={1} />}
                      />
                      <h3 className="font-display text-base font-semibold text-ink-950">
                        {member.name}
                      </h3>
                      <p className="mt-0.5 text-[14.5px] text-ink-500">{member.role}</p>
                    </Link>
                  ))}
            </div>
          </Shell>
        </Section>
      )}

      {/* ================================================================= */}
      {/* Join us — openings and external opportunities                     */}
      {/* ================================================================= */}
      {((recruitment.data || []).length > 0 || (jobsNews.data || []).length > 0) && (
        <Section tone="sunken" className="border-t border-paper-border">
          <Shell>
            <SectionHeading
              size="lg"
              title={t('home.labRecruitment')}
              description={t('home.recruitmentDescription')}
            />

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
              {/* Lab openings */}
              {(recruitment.data || []).length > 0 && (
                <div className="lg:col-span-7">
                  <p className="eyebrow mb-5">{t('home.openInThisLab')}</p>
                  <div className="divide-hairline border-t border-paper-border">
                    {recruitment.data.map((item) => {
                      const isActive = item.status === 'active'
                      return (
                        <article key={item._id} className="flex flex-col gap-3 py-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge tone={isActive ? 'ok' : 'neutral'}>
                              {isActive
                                ? t('home.openPosition', 'Open Position')
                                : t('home.closedPosition', 'Closed')}
                            </Badge>
                            <span className="font-mono text-[12.5px] text-ink-400">
                              {t('home.deadline')}
                              <span className="text-ink-700">
                                {formatDate(item.deadline, 'short', locale)}
                              </span>
                            </span>
                          </div>

                          <h3 className="font-display text-lg font-semibold leading-snug text-ink-950">
                            {item.title}
                          </h3>

                          <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-500">
                            {item.description}
                          </p>

                          {isActive && (
                            <a
                              href={item.googleFormUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-quiet w-fit text-accent-600 hover:text-accent-700"
                            >
                              {t('home.applyNow')} →
                            </a>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Industry openings */}
              {(jobsNews.data || []).length > 0 && (
                <div className="lg:col-span-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <p className="eyebrow">{t('home.jobsAndInternships')}</p>
                    <QuietLink to="/news/jobs">
                      {t('home.viewAllOpportunities').replace('→', '').trim()}
                    </QuietLink>
                  </div>

                  <div className="divide-hairline border-t border-paper-border">
                    {jobsNews.data.map((item) => (
                      <article key={item._id} className="group py-4">
                        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink-800 transition-colors group-hover:text-accent-600">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.title}
                          </a>
                        </h3>
                        <div className="mt-2 flex items-center gap-2.5">
                          <span className="font-mono text-[12px] uppercase tracking-label text-ink-400">
                            {item.source}
                          </span>
                          <time
                            className="font-mono text-[12px] text-ink-300"
                            dateTime={item.publishedAt}
                          >
                            {formatDate(item.publishedAt, 'short', locale)}
                          </time>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Shell>
        </Section>
      )}

      {/* ================================================================= */}
      {/* Contact                                                           */}
      {/* ================================================================= */}
      <Section className="border-t border-paper-border">
        <Shell>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
            <div className="lg:col-span-5">
              <p className="eyebrow">{t('ui.eyebrowGetInTouch')}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
                {t('contact.title')}
              </h2>
              <p className="mt-3 max-w-md text-[16.5px] leading-relaxed text-ink-600">
                {t('contact.subtitle')}
              </p>
              <QuietLink to="/contact" className="mt-5 inline-flex">
                {t('home.contactMore')}
              </QuietLink>
            </div>

            <dl className="grid gap-6 sm:grid-cols-3 lg:col-span-7">
              <div className="border-t border-paper-border pt-4">
                <dt className="eyebrow">{t('contact.addressTitle')}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-700">{contactAddress}</dd>
              </div>
              <div className="border-t border-paper-border pt-4">
                <dt className="eyebrow">{t('contact.email')}</dt>
                <dd className="mt-2 text-sm">
                  <a href={`mailto:${contactEmail}`} className="link break-all">
                    {contactEmail}
                  </a>
                </dd>
              </div>
              <div className="border-t border-paper-border pt-4">
                <dt className="eyebrow">{t('contact.phone')}</dt>
                <dd className="mt-2 text-sm">
                  <a href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`} className="link">
                    {contactPhone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </Shell>
      </Section>
    </>
  )
}
