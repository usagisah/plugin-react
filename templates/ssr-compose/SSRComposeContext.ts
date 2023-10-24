import type { SSRComposeContextProps } from "@w-hite/album/ssr"
import { createContext } from "react"

export const SSRComposeContext = createContext<SSRComposeContextProps>({} as any)
