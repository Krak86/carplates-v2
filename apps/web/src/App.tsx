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
const HistoryRoute = lazy(() => import('@/routes/history/HistoryRoute'))
const FavoritesRoute = lazy(() => import('@/routes/favorites/FavoritesRoute'))
const StatsRoute = lazy(() => import('@/routes/stats/StatsRoute'))
const FuelStatsRoute = lazy(() => import('@/routes/fuel/FuelStatsRoute'))
const SafetyStatsRoute = lazy(() => import('@/routes/safety/SafetyStatsRoute'))
const NewsRoute = lazy(() => import('@/routes/news/NewsRoute'))
const DiscussRoute = lazy(() => import('@/routes/DiscussRoute'))
const FeaturesRoute = lazy(() => import('@/routes/features/FeaturesRoute'))
const SettingsRoute = lazy(() => import('@/routes/settings/SettingsRoute'))
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
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/favorites" element={<FavoritesRoute />} />
            <Route path="/stats" element={<StatsRoute />} />
            <Route path="/fuel" element={<FuelStatsRoute />} />
            <Route path="/safety" element={<SafetyStatsRoute />} />
            <Route path="/news" element={<NewsRoute />} />
            <Route path="/discuss" element={<DiscussRoute />} />
            <Route path="/advanced-search" element={<AdvancedSearchRoute />} />
            <Route path="/race" element={<RaceRoute />} />
            <Route path="/features" element={<FeaturesRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/:query" element={<SearchRoute />} />
            <Route path="*" element={<SearchRoute />} />
          </Routes>
        </Suspense>
      </LoadErrorBoundary>
    </Layout>
  )
}
