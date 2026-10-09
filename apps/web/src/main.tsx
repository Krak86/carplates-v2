import { StrictMode } from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from '@/App'
import { i18nReady } from '@/i18n'
import { OFFLINE_MAX_AGE_MS, offlineGroup } from '@/lib/offline-cache'
import { queryPersister, reportOfflineUsage, syncDataVersion } from '@/lib/offline-storage'
import { queryClient } from '@/lib/query'
import { initTelemetry } from '@/lib/telemetry'
import '@/styles/global.css'

const telemetryReady = initTelemetry()

// Render only once the starting language is in (a failed fetch renders anyway: keys beat a blank page).
await i18nReady.catch(() => undefined)

const container = document.getElementById('root')
if (!container) throw new Error('#root not found')

createRoot(container).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: OFFLINE_MAX_AGE_MS,
        buster: __OFFLINE_CACHE_BUSTER__,
        dehydrateOptions: {
          shouldDehydrateQuery: query => query.state.status === 'success' && offlineGroup(query.queryKey) !== null,
          shouldDehydrateMutation: () => false
        }
      }}
      onSuccess={() => {
        void syncDataVersion(queryClient)
        void telemetryReady.then(() => reportOfflineUsage(queryClient))
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>
)
