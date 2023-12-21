import { AlbumSSRContext } from "@w-hite/album/server"
import { createContext } from "react"

export const SSRContext = createContext<AlbumSSRContext>({} as any)
