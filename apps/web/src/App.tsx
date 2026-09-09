import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router'

import Layout from '@/components/Layout'
import Spinner from '@/components/ui/Spinner'
import SearchRoute from '@/routes/SearchRoute'

const AboutRoute = lazy(() => import('@/routes/AboutRoute'))

export default function App(): ReactNode {
  return (
    <Layout>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<SearchRoute />} />
          <Route path="/about" element={<AboutRoute />} />
          <Route path="/:query" element={<SearchRoute />} />
          <Route path="*" element={<SearchRoute />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
