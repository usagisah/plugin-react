import { AlbumSSRComposeContext } from "@w-hite/album/ssr"
import { createContext } from "react"

export const SSRComposeContext = createContext<AlbumSSRComposeContext>({} as any)
