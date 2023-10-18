import type {
  ClientRoute,
  ParseRouteContext,
  ServerRoute
} from "./plugin.type.js"
import type { SpecialModule } from "@white/album/cli"
import { pathToRegexp } from "path-to-regexp"
import { relative, resolve } from "path"

export async function buildReactRoutes(
  dumpInput: string,
  specialModule: SpecialModule[]
) {
  let clientRoutes: ClientRoute[] = []
  let serverRoutes: ServerRoute[] = []

  await walkModule(specialModule, {
    dumpInput,
    parentClientPath: "",
    parentServerPath: "",
    clientRoutes,
    serverRoutes
  })

  clientRoutes = orderRoutes(clientRoutes)
  clientRoutes = moveErrorToLast(clientRoutes)

  serverRoutes = orderRoutes(serverRoutes)
  serverRoutes = moveErrorToLast(serverRoutes)

  return { clientRoutes, serverRoutes }
}

async function walkModule(mods: SpecialModule[], ctx: ParseRouteContext) {
  await Promise.all(mods.map(mod => moduleToClientRoute(mod, ctx)))
}

async function moduleToClientRoute(mod: SpecialModule, ctx: ParseRouteContext) {
  const {
    dumpInput,
    parentClientPath,
    parentServerPath,
    clientRoutes,
    serverRoutes
  } = ctx

  const clientCompPath = mod.routePath.replaceAll("$", ":")
  const clientRoute: ClientRoute = {
    name: "Route_" + mod.fileName,
    path: clientCompPath,
    fullPath: connectPath(parentClientPath, clientCompPath),
    component: `lazyLoad(() => import("${relative(
      resolve(dumpInput, "plugin-react/router"),
      mod.routeFilePath
    )}"))`,
    router: mod.router
      ? relative(resolve(dumpInput, "plugin-react/router"), mod.router.filePath)
      : null,
    children: []
  }

  const serverCompPath = clientCompPath === "/*" ? "/(.*)" : clientCompPath
  const serverFullPath = connectPath(parentServerPath, serverCompPath)
  const serverRoute: ServerRoute = {
    name: "Route_" + mod.fileName,
    reg: pathToRegexp(serverFullPath, null, { sensitive: false }),
    path: serverCompPath,
    fullPath: serverFullPath,
    actionPath: mod.action?.filePath,
    children: []
  }

  clientRoutes.push(clientRoute)
  serverRoutes.push(serverRoute)

  if (mod.children.length > 0) {
    await walkModule(mod.children, {
      dumpInput,
      parentClientPath: clientRoute.fullPath,
      parentServerPath: serverRoute.fullPath,
      clientRoutes: clientRoute.children,
      serverRoutes: serverRoute.children
    })
  }

  clientRoute.children = orderRoutes(clientRoute.children)
  serverRoute.children = orderRoutes(serverRoute.children)
  serverRoutes.push(...serverRoute.children)
}

function connectPath(p1: string, p2: string) {
  if (p2.endsWith("/")) p2 = p2.slice(0, -1)
  if (!p2.startsWith("/")) p2 = "/" + p2
  p1 = p1 + p2
  return p1.startsWith("//") ? p1.slice(1) : p1
}

function orderRoutes<T = ClientRoute | ServerRoute>(routes: T[]): T[] {
  const staticItems = []
  const dynamicItems = []
  for (let index = 0; index < routes.length; index++) {
    const r: any = routes[index]
    r.path.includes(":") ? dynamicItems.push(r) : staticItems.push(r)
  }
  return staticItems.concat(
    dynamicItems.sort((a, b) => {
      return b.path.indexOf(":") - a.path.indexOf(":")
    })
  )
}

function moveErrorToLast<T = ClientRoute | ServerRoute>(routes: T[]) {
  const errorRoutes: T[] = []
  const normalRoutes: T[] = []
  routes.forEach((r: any) => {
    r.fullPath.startsWith("/(.*)") || r.fullPath.startsWith("/*")
      ? errorRoutes.push(r)
      : normalRoutes.push(r)
  })
  return [...normalRoutes, ...errorRoutes]
}
