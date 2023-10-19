import { AlbumSSRContext } from "@w-hite/album/ssr"
import { matchPath } from "react-router-dom"
import { SSRContextValue } from "./SSRContext"
import { serverRoutes } from "../router/routes.ssr"
import { queryString } from "../utils/queryString"
import { isPlainObject } from "../utils/type"

export async function resolveActionRouteData(
  { ssrSlideProps }: SSRContextValue,
  { logger }: AlbumSSRContext
) {
  let actionData: any = {}

  const { url } = ssrSlideProps.req
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
    ssrSlideProps.params = matchPath(route.fullPath, pathname)?.params ?? {}

    if (route.actionFactory) {
      try {
        const mod: any = await route.actionFactory()
        if (!mod || !(typeof mod.default === "function")) {
          throw (
            "router-action export default is not a function at " +
            route.actionPath
          )
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