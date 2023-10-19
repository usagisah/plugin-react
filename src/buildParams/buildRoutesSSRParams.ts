import { relative, resolve } from "path"
import { ServerRoute } from "../plugin.type.js"

export function buildRoutesSSRParams(
  serverRoutes: ServerRoute[],
  root: string
) {
  const serverRoutesArray = serverRoutes.map(route => {
    const { name, reg, actionPath, fullPath } = route
    const _actionPath = actionPath
      ? `"${relative(resolve(root, "plugin-react/router"), actionPath)}"`
      : null
    return (
      "  { " +
      [
        `name: "${name}"`,
        `reg: ${reg}`,
        `fullPath: "${fullPath}"`,
        `actionPath: ${actionPath ? `"${actionPath}"` : null}`,
        `actionFactory: ${_actionPath ? `() => import(${_actionPath})` : null}`
      ].join(", ") +
      " }"
    )
  })
  return {
    serverRoutesCode: serverRoutesArray.join(",\n")
  }
}
