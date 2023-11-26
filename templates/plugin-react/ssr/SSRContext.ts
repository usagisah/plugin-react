import { AlbumSSRContext } from "@w-hite/album/ssr"
import { createContext } from "react"

export const SSRContext = createContext<AlbumSSRContext>({} as any)
