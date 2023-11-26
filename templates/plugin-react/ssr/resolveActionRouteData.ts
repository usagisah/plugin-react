import { AlbumSSRContext } from "@w-hite/album/ssr"
import { isPlainObject } from "@w-hite/album/utils/check/simple"
import { matchPath } from "react-router-dom"
import { serverRoutes } from "../router/routes.ssr"

export async function resolveActionRouteData(ssrContext: AlbumSSRContext) {
  const { params, albumOptions, logger } = ssrContext
  const { pathname } = albumOptions
  const actionData: any = {}
  const route = serverRoutes.find(route => route.reg.test(pathname))
  if (route) {
    const _params = matchPath(route.fullPath, pathname)?.params
    if (_params) Object.assign(params, _params)

    if (route.actionFactory) {
      try {
        const mod: any = await route.actionFactory()
        if (!mod || !(typeof mod.default === "function")) throw "router-action export default is not a function at " + route.actionPath

        const _actionData = await mod.default(ssrContext)
        if (isPlainObject(actionData)) Object.assign(actionData, _actionData)
      } catch (e) {
        logger.error(e, "ssr")
      }
    }
  }

  return actionData
}
