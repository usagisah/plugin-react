import { registryHook } from "@white/album"
import { StaticRouter } from "react-router-dom/server"
import { AppRoutes, routes, routesMap } from "./routes"
import { Fragment } from "react"
import { useRouter } from "../hooks/useRouter"
import { useLoader } from "../hooks/useLoader"
import { useServer } from "../hooks/useServer"
import { useServerRouteData } from "../hooks/useServerRouteData"
import { useServerData } from "../hooks/useServerData"

registryHook("useRoutes", () => routes)
registryHook("useRoutesMap", () => routesMap)
registryHook("useRouter", useRouter)
registryHook("useLoader", useLoader)
registryHook("useServer", useServer)
registryHook("useServerData", useServerData)
registryHook("useServerRouteData", useServerRouteData)


export function createSSRRouter(location: string) {
  const AppRouterComponent: any = ({ Layout = Fragment, ...props }) => (
    <StaticRouter location={location}>
      <Layout>
        <AppRoutes {...props} />
      </Layout>
    </StaticRouter>
  )
  return AppRouterComponent
}