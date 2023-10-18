import type { PluginPatchClientParam } from "@white/album/cli"
import type { ClientRoute, ServerRoute } from "./plugin.type.js"
import { renderTemplate } from "./template/renderTemplate.js"
import { buildRoutesParams } from "./buildParams/buildRoutesParams.js"
import { buildRoutesSSRParams } from "./buildParams/buildRoutesSSRParams.js"

export async function pluginPatchFile(
  clientRoutes: ClientRoute[],
  serverRoutes: ServerRoute[],
  params: PluginPatchClientParam
) {
  const {
    status: { ssr },
    fileManager,
    inputs: { dumpInput }
  } = params
  const configs: any[] = [
    {
      type: "file",
      file: "plugin-react/router/routes.tsx",
      params: buildRoutesParams(clientRoutes)
    }
  ]

  if (ssr) {
    configs.push({
      type: "file",
      file: "plugin-react/router/routes.ssr.tsx",
      params: buildRoutesSSRParams(serverRoutes, dumpInput)
    })
  }

  await Promise.all(
    configs.map(async f =>
      fileManager.get("file", f.file).update(await renderTemplate(f.file, f.params))
    )
  )
}
