import type { ReactNode } from 'react'

export default function Spinner(): ReactNode {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      role="status"
      aria-label="loading"
    />
  )
}
