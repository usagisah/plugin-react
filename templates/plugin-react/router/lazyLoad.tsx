// @ts-nocheck
import type { ReactNode } from "react"
import { Suspense, lazy } from "react"

export function lazyLoad(
  factory: () => Promise<{
    default: any
  }>,
  fallback?: ReactNode
) {
  const Component = lazy(factory)
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  )
}
