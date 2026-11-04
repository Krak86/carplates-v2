import { useEffect, useState } from 'react'

/** `value`, but only after it has stopped changing for `delayMs` (a search box that should not fire a request per key). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}
