import { SpecialModule } from "@w-hite/album/cli"
import { relative, resolve } from "path"
import { pathToRegexp } from "path-to-regexp"
import { ClientRoute, ParseRouteContext, ServerRoute } from "./plugin.type.js"

export async function buildReactRoutes(dumpInput: string, specialModule: SpecialModule[]) {
  const { clientRoutes, serverRoutes } = await walkModule(specialModule, {
    dumpInput,
    parentClientPath: "",
    parentServerPath: ""
  })
  return { clientRoutes: moveErrorToLast(clientRoutes), serverRoutes: moveErrorToLast(serverRoutes) }
}

async function walkModule(mods: SpecialModule[], ctx: ParseRouteContext) {
  let clientRoutes: ClientRoute[] = []
  let serverRoutes: ServerRoute[] = []
  for (const mod of mods) {
    const _res = await moduleToRoute(mod, ctx)
    clientRoutes.push(_res.clientRoute)
    serverRoutes.push(_res.serverRoute, ..._res.serverRoute.children)
  }
  return { clientRoutes: orderRoutes(clientRoutes), serverRoutes: orderRoutes(serverRoutes) }
}

async function moduleToRoute(mod: SpecialModule, ctx: ParseRouteContext) {
  const { dumpInput, parentClientPath, parentServerPath } = ctx
  const routeRecordName = mod.filename
  const clientCompPath = mod.routePath.replaceAll("$", ":")
  const clientRoute: ClientRoute = {
    name: routeRecordName,
    path: clientCompPath,
    fullPath: connectPath(parentClientPath, clientCompPath),
    component: `lazyLoad(() => import("${relative(resolve(dumpInput, "plugin-react/router"), mod.pageFile.filepath)}"))`,
    router: mod.routerFile ? relative(resolve(dumpInput, "plugin-react/router"), mod.routerFile.filepath) : null,
    children: []
  }

  const serverCompPath = clientCompPath === "/*" ? "/(.*)" : clientCompPath
  const serverFullPath = connectPath(parentServerPath, serverCompPath)
  const serverRoute: ServerRoute = {
    name: routeRecordName,
    reg: pathToRegexp(serverFullPath, null, { sensitive: false }),
    path: serverCompPath,
    fullPath: serverFullPath,
    actionPath: mod.actionFile ? relative(resolve(dumpInput, "plugin-react/ssr"), mod.actionFile.filepath) : null,
    children: []
  }

  if (mod.children.length > 0) {
    const _res = await walkModule(mod.children, {
      dumpInput,
      parentClientPath: clientRoute.fullPath,
      parentServerPath: serverRoute.fullPath
    })
    clientRoute.children = _res.clientRoutes
    serverRoute.children = _res.serverRoutes
  }

  return { clientRoute, serverRoute }
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
    if (r.fullPath.startsWith("/(.*)") || r.fullPath.startsWith("/*")) errorRoutes.push(r)
    else normalRoutes.push(r)
  })
  return [...normalRoutes, ...errorRoutes]
}
