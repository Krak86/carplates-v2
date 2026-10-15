import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes, useLocation } from 'react-router'

import Layout from '@/components/Layout'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Spinner from '@/components/ui/Spinner'
import { ROUTE_TITLE_KEYS, useDocumentTitle } from '@/hooks/useDocumentTitle'
import SearchRoute from '@/routes/SearchRoute'

const AboutRoute = lazy(() => import('@/routes/AboutRoute'))
const LegalRoute = lazy(() => import('@/routes/LegalRoute'))
const InstallRoute = lazy(() => import('@/routes/install/InstallRoute'))
const HistoryRoute = lazy(() => import('@/routes/history/HistoryRoute'))
const FavoritesRoute = lazy(() => import('@/routes/favorites/FavoritesRoute'))
const StatsRoute = lazy(() => import('@/routes/stats/StatsRoute'))
const FuelStatsRoute = lazy(() => import('@/routes/fuel/FuelStatsRoute'))
const SafetyStatsRoute = lazy(() => import('@/routes/safety/SafetyStatsRoute'))
const NewsRoute = lazy(() => import('@/routes/news/NewsRoute'))
const DiscussRoute = lazy(() => import('@/routes/DiscussRoute'))
const RelaxRoute = lazy(() => import('@/routes/RelaxRoute'))
const ReleasesRoute = lazy(() => import('@/routes/releases/ReleasesRoute'))
const FeaturesRoute = lazy(() => import('@/routes/features/FeaturesRoute'))
const SettingsRoute = lazy(() => import('@/routes/settings/SettingsRoute'))
const EmailLinkRoute = lazy(() => import('@/routes/auth/EmailLinkRoute'))
const ProfileRoute = lazy(() => import('@/routes/profile/ProfileRoute'))
const AdminRoute = lazy(() => import('@/routes/admin/AdminRoute'))
const AdvancedSearchRoute = lazy(() => import('@/routes/advanced-search/AdvancedSearchRoute'))
const RaceRoute = lazy(() => import('@/routes/RaceRoute'))

export default function App(): ReactNode {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const titleKey = ROUTE_TITLE_KEYS[pathname]
  useDocumentTitle(titleKey ? t(titleKey) : undefined)

  return (
    <Layout>
      <LoadErrorBoundary resetKey={pathname}>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<SearchRoute />} />
            <Route path="/about" element={<AboutRoute />} />
            <Route path="/install" element={<InstallRoute />} />
            <Route path="/privacy" element={<LegalRoute doc="privacy" />} />
            <Route path="/terms" element={<LegalRoute doc="terms" />} />
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/favorites" element={<FavoritesRoute />} />
            <Route path="/stats" element={<StatsRoute />} />
            <Route path="/fuel" element={<FuelStatsRoute />} />
            <Route path="/safety" element={<SafetyStatsRoute />} />
            <Route path="/news" element={<NewsRoute />} />
            <Route path="/discuss" element={<DiscussRoute />} />
            <Route path="/advanced-search" element={<AdvancedSearchRoute />} />
            <Route path="/race" element={<RaceRoute />} />
            <Route path="/relax" element={<RelaxRoute />} />
            <Route path="/releases" element={<ReleasesRoute />} />
            <Route path="/features" element={<FeaturesRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/auth/email" element={<EmailLinkRoute />} />
            <Route path="/profile" element={<ProfileRoute />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/:query" element={<SearchRoute />} />
            <Route path="*" element={<SearchRoute />} />
          </Routes>
        </Suspense>
      </LoadErrorBoundary>
    </Layout>
  )
}
