import type { AlbumSSRContext, AlbumSSRContextProps } from "@w-hite/album/ssr"
import { queryString } from "@w-hite/album/utils/common/queryString"
import { isPlainObject } from "@w-hite/album/utils/utils"
import { matchPath } from "react-router-dom"
import { serverRoutes } from "../router/routes.ssr"

export async function resolveActionRouteData({ ssrSlideProps }: AlbumSSRContextProps, { logger }: AlbumSSRContext) {
  let actionData: any = {}

  const url = ssrSlideProps.req.originalUrl
  const index = url.indexOf("?")
  let pathname = url
  let search = ""
  if (index !== -1) {
    pathname = url.slice(0, index)
    search = url.slice(index)
  }
  const route = serverRoutes.find(route => route.reg.test(pathname))
  if (route) {
    ssrSlideProps.query = queryString.parse(search)
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
