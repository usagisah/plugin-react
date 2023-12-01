import { PluginPatchClientParam } from "@w-hite/album/cli"
import { buildRoutesParams } from "./fileParams/buildRoutesParams.js"
import { buildRoutesSSRParams } from "./fileParams/buildRoutesSSRParams.js"
import { ClientRoute, ServerRoute } from "./plugin.type.js"
import { renderTemplate } from "./renderTemplate.js"

export async function pluginPatchFile(clientRoutes: ClientRoute[], serverRoutes: ServerRoute[], params: PluginPatchClientParam) {
  const { info, dumpFileManager } = params
  const { ssr, inputs } = info
  const { dumpInput } = inputs
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

  await Promise.all(configs.map(async f => dumpFileManager.get("file", f.file).update(await renderTemplate(f.file, f.params))))
}
