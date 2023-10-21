import type { AppRouterFC } from "@w-hite/album"
import { registryHook } from "@w-hite/album"
import { Fragment } from "react"
import { BrowserRouter } from "react-router-dom"
import { AppRoutes, routes, routesMap } from "./plugin-react/router/routes"
import mainFactory from "$mainPath$"

import { useLoader } from "./plugin-react/hooks/useLoader"
import { useRouter } from "./plugin-react/hooks/useRouter"
$ssr_hooks_import$
registryHook("useRoutes", () => routes)
registryHook("useRoutesMap", () => routesMap)
registryHook("useRouter", useRouter)
registryHook("useLoader", useLoader)
$ssr_hooks_registry$

const AppRouterComponent: AppRouterFC = ({ Layout = Fragment, ...props }) => (
  <BrowserRouter basename="$basename$">
    <Layout>
      <AppRoutes {...props} />
    </Layout>
  </BrowserRouter>
)

mainFactory(AppRouterComponent)
