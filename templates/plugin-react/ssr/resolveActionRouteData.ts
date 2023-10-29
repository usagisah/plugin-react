import type { AlbumSSRContextOptions, AlbumContext } from "@w-hite/album/ssr"
import { isPlainObject } from "@w-hite/album/utils/utils"
import { matchPath } from "react-router-dom"
import { serverRoutes } from "../router/routes.ssr"

export async function resolveActionRouteData({ ssrSlideProps }: AlbumSSRContextOptions, { logger }: AlbumContext) {
  let actionData: any = {}

  const { query } = ssrSlideProps.req
  const { pathname } = ssrSlideProps.req.albumOptions
  const route = serverRoutes.find(route => route.reg.test(pathname))
  if (route) {
    ssrSlideProps.query = query as any
    ssrSlideProps.params = (matchPath(route.fullPath, pathname)?.params ?? {}) as any

    if (route.actionFactory) {
      try {
        const mod: any = await route.actionFactory()
        if (!mod || !(typeof mod.default === "function")) {
          throw "router-action export default is not a function at " + route.actionPath
        }

        actionData = await mod.default(ssrSlideProps)
        if (!isPlainObject(actionData)) actionData = {}
      } catch (e) {
        logger.error(e, "ssr")
      }
    }
  }

  return actionData
}
