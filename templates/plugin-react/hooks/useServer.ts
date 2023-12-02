import { useContext } from "react"
import { SSRContext } from "../ssr/SSRContext"

export async function useServer(fn: any) {
  if (import.meta.env.SSR) {
    const ctx = useContext(SSRContext)
    try {
      if (!(typeof fn === "function")) throw "fn must be Function"
      await fn(ctx)
    } catch (e: any) {
      ctx.logger.error(e, "useServer")
    }
    return
  }
}
