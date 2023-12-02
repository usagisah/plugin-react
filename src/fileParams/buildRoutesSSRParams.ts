import { ServerRoute } from "../plugin.type.js"

export function buildRoutesSSRParams(serverRoutes: ServerRoute[], root: string) {
  const serverRoutesArray = serverRoutes.map(route => {
    const { name, reg, actionPath, fullPath } = route
    return "  { " + [`name: "${name}"`, `reg: ${reg}`, `fullPath: "${fullPath}"`, `actionPath: ${actionPath ? `"${actionPath}"` : null}`, `actionFactory: ${actionPath ? `() => import("${actionPath}")` : null}`].join(", ") + " }"
  })
  return {
    serverRoutesCode: serverRoutesArray.join(",\n")
  }
}
