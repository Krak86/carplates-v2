import { Component } from 'react'
import type { ReactNode } from 'react'

import LoadErrorMessage from '@/components/LoadErrorMessage'
import { capture } from '@/lib/telemetry'

type Props = {
  children: ReactNode
  /** Clears a caught error when it changes (e.g. the route pathname), so navigating away recovers. */
  resetKey?: string
  compact?: boolean
}

type State = { error: Error | null }

// Chromium / Firefox / Safari wording for a failed `import()` of a lazy chunk.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload CSS/i

/** Keeps a failed lazy chunk (offline before it was ever cached, or a stale deploy) from unmounting the whole app. */
export default class LoadErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error): void {
    capture('load_error', { chunk: CHUNK_ERROR.test(error.message), message: error.message })
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return <LoadErrorMessage isChunkError={CHUNK_ERROR.test(error.message)} compact={this.props.compact} />
  }
}
