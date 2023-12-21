import { AlbumSSRComposeContext } from "@w-hite/album/server"
import { createContext } from "react"

export const SSRComposeContext = createContext<AlbumSSRComposeContext>({} as any)
