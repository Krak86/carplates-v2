import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import SectionHeader from '@/components/SectionHeader'
import SectionInfo from '@/components/SectionInfo'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { scrollElementIntoView } from '@/lib/share-section'

type VerificationSite = {
  id: 'bdr' | 'mtsbu' | 'shtrafua'
  url: string
  icon: string
  /** The logo has white lettering — it needs a dark backdrop to be readable on the light card. */
  darkBg?: boolean
  /** Wide wordmark vs. square emblem. */
  iconClass: string
}

const VERIFICATION_SITES: VerificationSite[] = [
  { id: 'bdr', url: 'https://bdr.mvs.gov.ua/', icon: '/icons/bdr.svg', iconClass: 'size-8' },
  { id: 'mtsbu', url: 'https://policy.mtsbu.ua/', icon: '/icons/mtsbu.svg', darkBg: true, iconClass: 'h-5 w-auto' },
  { id: 'shtrafua', url: 'https://shtrafua.com', icon: '/icons/shtrafua.png', iconClass: 'h-5 w-auto' }
]

/**
 * Collapsed "Verification" section: links to official services for checking a vehicle (automated traffic-violation
 * search, MTSBU insurance policy check, parking-fine payment). External sites only — nothing is sent from here.
 */
export default function VerificationLinks(): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'verification'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="✅"
        title={t('verification.title')}
        info={<SectionInfo section="verification" title={t('verification.title')} />}
        actions={<ShareButton section="verification" label={t('share.button', { section: t('verification.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('verification.show')}
        hideLabel={t('verification.hide')}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-3 space-y-1.5">
            {VERIFICATION_SITES.map(site => (
              <li key={site.id}>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-base text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)]/40"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-28 shrink-0 items-center justify-center rounded-md px-2',
                        site.darkBg ? 'bg-[#1d2b3a]' : 'bg-white/70'
                      )}
                    >
                      <img src={site.icon} alt="" className={cn('max-w-full object-contain', site.iconClass)} />
                    </span>
                    <span className="min-w-0">
                      <span className="block underline">{t(`verification.${site.id}.title`)}</span>
                      <span className="block text-sm text-[var(--color-muted)]">
                        {t(`verification.${site.id}.desc`)}
                      </span>
                    </span>
                  </span>
                  <span aria-hidden>↗</span>
                  <span className="sr-only">{t('field.opensNewTab')}</span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('verification.source')}</p>
        </div>
      </div>
    </div>
  )
}
