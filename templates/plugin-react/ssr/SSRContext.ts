import type { AlbumSSRContextProps } from "@w-hite/album/ssr"
import { createContext } from "react"

export const SSRContext = createContext<AlbumSSRContextProps>({} as any)
