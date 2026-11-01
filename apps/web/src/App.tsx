import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes, useLocation } from 'react-router'

import Layout from '@/components/Layout'
import LoadErrorBoundary from '@/components/LoadErrorBoundary'
import Spinner from '@/components/ui/Spinner'
import { ROUTE_TITLE_KEYS, useDocumentTitle } from '@/hooks/useDocumentTitle'
import PageShareButton from '@/components/PageShareButton'
import { NO_SHARE_PATHS } from '@/components/use-page-share-actions'
import SearchRoute from '@/routes/SearchRoute'
import { useUiStore } from '@/store/ui-store'

const AboutRoute = lazy(() => import('@/routes/AboutRoute'))
const LegalRoute = lazy(() => import('@/routes/LegalRoute'))
const ContactRoute = lazy(() => import('@/routes/ContactRoute'))
const InstallRoute = lazy(() => import('@/routes/install/InstallRoute'))
const HistoryRoute = lazy(() => import('@/routes/history/HistoryRoute'))
const FavoritesRoute = lazy(() => import('@/routes/favorites/FavoritesRoute'))
const StatsRoute = lazy(() => import('@/routes/stats/StatsRoute'))
const WantedStatsRoute = lazy(() => import('@/routes/wanted/WantedStatsRoute'))
const AuctionsRoute = lazy(() => import('@/routes/auctions/AuctionsRoute'))
const FuelStatsRoute = lazy(() => import('@/routes/fuel/FuelStatsRoute'))
const SafetyStatsRoute = lazy(() => import('@/routes/safety/SafetyStatsRoute'))
const RoadSafetyRoute = lazy(() => import('@/routes/road-safety/RoadSafetyRoute'))
const NewsRoute = lazy(() => import('@/routes/news/NewsRoute'))
const DiscussRoute = lazy(() => import('@/routes/DiscussRoute'))
const RelaxRoute = lazy(() => import('@/routes/RelaxRoute'))
const ReleasesRoute = lazy(() => import('@/routes/releases/ReleasesRoute'))
const ReadHubRoute = lazy(() => import('@/routes/read/ReadHubRoute'))
const BodyTypesRoute = lazy(() => import('@/routes/read/body-types/BodyTypesRoute'))
const SizesRoute = lazy(() => import('@/routes/read/sizes/SizesRoute'))
const FleetRoute = lazy(() => import('@/routes/read/fleet/FleetRoute'))
const PlatesRoute = lazy(() => import('@/routes/read/plates/PlatesRoute'))
const GenerationsRoute = lazy(() => import('@/routes/read/generations/GenerationsRoute'))
const ElectricRoute = lazy(() => import('@/routes/read/electric/ElectricRoute'))
const ImportsRoute = lazy(() => import('@/routes/read/imports/ImportsRoute'))
const SafetyRoute = lazy(() => import('@/routes/read/safety/SafetyRoute'))
const FuelRoute = lazy(() => import('@/routes/read/fuel/FuelRoute'))
const VinRoute = lazy(() => import('@/routes/read/vin/VinRoute'))
const ExtremesRoute = lazy(() => import('@/routes/read/extremes/ExtremesRoute'))
const RecallsRoute = lazy(() => import('@/routes/read/recalls/RecallsRoute'))
const AuctionsGuideRoute = lazy(() => import('@/routes/read/auctions/AuctionsGuideRoute'))
const CatalogIndexRoute = lazy(() => import('@/routes/catalog/CatalogIndexRoute'))
const CatalogMakeRoute = lazy(() => import('@/routes/catalog/CatalogMakeRoute'))
const CatalogModelRoute = lazy(() => import('@/routes/catalog/CatalogModelRoute'))
const CompareRoute = lazy(() => import('@/routes/compare/CompareRoute'))
const GoRoute = lazy(() => import('@/routes/go/GoRoute'))
const SitemapRoute = lazy(() => import('@/routes/sitemap/SitemapRoute'))
const DataStatusRoute = lazy(() => import('@/routes/data-status/DataStatusRoute'))
const ShareRoute = lazy(() => import('@/routes/share/ShareRoute'))
const FeaturesRoute = lazy(() => import('@/routes/features/FeaturesRoute'))
const SettingsRoute = lazy(() => import('@/routes/settings/SettingsRoute'))
const EmailLinkRoute = lazy(() => import('@/routes/auth/EmailLinkRoute'))
const UnsubscribeRoute = lazy(() => import('@/routes/auth/UnsubscribeRoute'))
const LoginRoute = lazy(() => import('@/routes/auth/LoginRoute'))
const LogoutRoute = lazy(() => import('@/routes/auth/LogoutRoute'))
const ProfileRoute =lazy(() => import('@/routes/profile/ProfileRoute'))
const AdminRoute = lazy(() => import('@/routes/admin/AdminRoute'))
const AdvancedSearchRoute = lazy(() => import('@/routes/advanced-search/AdvancedSearchRoute'))
const RaceRoute = lazy(() => import('@/routes/RaceRoute'))
const PlayRoute = lazy(() => import('@/routes/play/PlayRoute'))

export default function App(): ReactNode {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const zen = useUiStore(s => s.zen)
  const titleKey = ROUTE_TITLE_KEYS[pathname]
  useDocumentTitle(titleKey ? t(titleKey) : undefined)
  // A plate / VIN result page is a single segment that is not a static route; the floating share button is hidden on mobile.
  const isResultRoute = pathname !== '/' && pathname.split('/').filter(Boolean).length === 1 && !titleKey
  const shareTitle = NO_SHARE_PATHS.has(pathname)
    ? undefined
    : titleKey
      ? t(titleKey)
      : isResultRoute
        ? decodeURIComponent(pathname.slice(1))
        : pathname === '/'
          ? t('app.title')
          : undefined

  return (
    <Layout>
      <LoadErrorBoundary resetKey={pathname}>
        {/* Viewport-tall: a bare spinner leaves QuickLinks inside the first screen, and it is pushed out
            (CLS 0.22 on /fuel) when the route chunk renders. */}
        <Suspense
          fallback={
            <div className="min-h-svh">
              <Spinner />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<SearchRoute />} />
            <Route path="/about" element={<AboutRoute />} />
            <Route path="/install" element={<InstallRoute />} />
            <Route path="/privacy" element={<LegalRoute doc="privacy" />} />
            <Route path="/terms" element={<LegalRoute doc="terms" />} />
            <Route path="/contact" element={<ContactRoute />} />
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/favorites" element={<FavoritesRoute />} />
            <Route path="/stats" element={<StatsRoute />} />
            <Route path="/wanted" element={<WantedStatsRoute />} />
            <Route path="/auctions" element={<AuctionsRoute />} />
            <Route path="/fuel" element={<FuelStatsRoute />} />
            <Route path="/safety" element={<SafetyStatsRoute />} />
            <Route path="/road-safety" element={<RoadSafetyRoute />} />
            <Route path="/news" element={<NewsRoute />} />
            <Route path="/discuss" element={<DiscussRoute />} />
            <Route path="/advanced-search" element={<AdvancedSearchRoute />} />
            <Route path="/play" element={<PlayRoute />} />
            <Route path="/race" element={<RaceRoute />} />
            <Route path="/relax" element={<RelaxRoute />} />
            <Route path="/releases" element={<ReleasesRoute />} />
            <Route path="/read" element={<ReadHubRoute />} />
            <Route path="/read/body-types" element={<BodyTypesRoute />} />
            <Route path="/read/sizes" element={<SizesRoute />} />
            <Route path="/read/fleet" element={<FleetRoute />} />
            <Route path="/read/plates" element={<PlatesRoute />} />
            <Route path="/read/generations" element={<GenerationsRoute />} />
            <Route path="/read/electric" element={<ElectricRoute />} />
            <Route path="/read/imports" element={<ImportsRoute />} />
            <Route path="/read/safety" element={<SafetyRoute />} />
            <Route path="/read/fuel" element={<FuelRoute />} />
            <Route path="/read/vin" element={<VinRoute />} />
            <Route path="/read/extremes" element={<ExtremesRoute />} />
            <Route path="/read/recalls" element={<RecallsRoute />} />
            <Route path="/read/auctions" element={<AuctionsGuideRoute />} />
            <Route path="/cars" element={<CatalogIndexRoute />} />
            <Route path="/cars/:make" element={<CatalogMakeRoute />} />
            <Route path="/cars/:make/:model" element={<CatalogModelRoute />} />
            <Route path="/compare" element={<CompareRoute />} />
            <Route path="/sitemap" element={<SitemapRoute />} />
            <Route path="/data-status" element={<DataStatusRoute />} />
            <Route path="/share" element={<ShareRoute />} />
            <Route path="/go/:alias" element={<GoRoute />} />
            <Route path="/features" element={<FeaturesRoute />} />
            <Route path="/settings" element={<SettingsRoute />} />
            <Route path="/auth/email" element={<EmailLinkRoute />} />
            <Route path="/unsubscribe" element={<UnsubscribeRoute />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/logout" element={<LogoutRoute />} />
            <Route path="/profile"element={<ProfileRoute />} />
            <Route path="/admin" element={<AdminRoute />} />
            <Route path="/:query" element={<SearchRoute />} />
            <Route path="*" element={<SearchRoute />} />
          </Routes>
        </Suspense>
        {shareTitle && !zen && (
          <div className="mt-6 flex justify-center">
            <PageShareButton title={shareTitle} />
          </div>
        )}
      </LoadErrorBoundary>
    </Layout>
  )
}
