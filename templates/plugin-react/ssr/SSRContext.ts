import type { AlbumSSRContextOptions } from "@w-hite/album/ssr"
import { createContext } from "react"

export const SSRContext = createContext<AlbumSSRContextOptions>({} as any)
