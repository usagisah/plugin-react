import { useContext } from "react"
import { SSRContext } from "../ssr/SSRContext"

const map = new Map<string, any>()

export function useServerData(id: string, fn: any) {
  if (import.meta.env.SSR) {
    const ctx = useContext(SSRContext)
    const { serverDynamicData, logger } = ctx

    if (!(typeof fn === "function")) {
      const msg = "fn must be Function"
      logger.error(msg, "useServerData")
      throw new Error(msg)
    }

    if (serverDynamicData.has(id)) {
      return serverDynamicData.get(id)
    }

    throw new Promise(async resolve => {
      let res: any = null
      try {
        res = await fn({
          serverRouteData: ctx.serverRouteData,
          serverDynamicData: ctx.serverDynamicData,
          req: ctx.req,
          cwd: ctx.cwd,
          dumpName: ctx.dumpName,
          dumpRoot: ctx.dumpRoot,
          mode: ctx.mode
        })
      } catch (e) {
        logger.error(e, "useServerData")
      } finally {
        serverDynamicData.set(id, res)
        resolve(null)
      }
    })
  }

  if (map.has(id)) return map.get(id)

  const elem = document.getElementById("server-data-" + id)
  if (!elem) {
    map.set(id, null)
    return null
  }

  let data: any
  try {
    data = JSON.parse(elem.textContent!)
  } catch {
    data = {}
  }
  map.set(id, data)
  return data
}
