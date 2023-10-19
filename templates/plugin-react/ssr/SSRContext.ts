import type { SSRProps } from "@w-hite/album"
import { createContext } from "react"

export type SSRContextValue = {
  serverRouteData: Record<string, string>
  serverDynamicData: Map<string, any>
  ssrSlideProps: SSRProps
}

export const SSRContext = createContext<SSRContextValue>({} as any)
