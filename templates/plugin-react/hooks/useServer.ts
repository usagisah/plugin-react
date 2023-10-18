import { useContext } from "react"
import { SSRContext } from "../ssr/SSRContext"

export async function useServer(fn: any) {
  if (import.meta.env.SSR) {
    const ctx = useContext(SSRContext)
    try {
      if (!(typeof fn === "function")) {
        throw "fn must be Function"
      }

      await fn({
        serverRouteData: ctx.serverRouteData,
        serverDynamicData: ctx.serverDynamicData,
        req: ctx.req,
        cwd: ctx.cwd,
        dumpName: ctx.dumpName,
        dumpRoot: ctx.dumpRoot,
        mode: ctx.mode
      })
    } catch (e) {
      ctx.logger.error(e, "useServer")
    }
    return
  }
}
