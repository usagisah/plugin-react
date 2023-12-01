import { PluginInitClientParam } from "@w-hite/album/cli"
import { relative, resolve } from "path"
import { buildMainParams } from "./fileParams/buildMainParams.js"
import { buildRoutesParams } from "./fileParams/buildRoutesParams.js"
import { buildRoutesSSRParams } from "./fileParams/buildRoutesSSRParams.js"
import { ClientRoute, ServerRoute } from "./plugin.type.js"
import { renderTemplate } from "./renderTemplate.js"

export async function pluginInitFile(clientRoutes: ClientRoute[], serverRoutes: ServerRoute[], param: PluginInitClientParam) {
  const pendingPromises: Promise<any>[] = []
  const { info, clientConfig, dumpFileManager } = param
  const { ssr, ssrCompose, inputs } = info
  const { dumpInput } = inputs
  const { mainSSRInput } = clientConfig
  const { router } = clientConfig

  pendingPromises.push(...common(clientRoutes, param))

  if (ssr) {
    const ssrConfigs = [
      { type: "file", template: "main.ssr.tsx", params: {} },
      { type: "file", template: "plugin-react/hooks/useServer.ts", params: {} },
      { type: "file", template: "plugin-react/hooks/useServerData.ts", params: {} },
      { type: "file", template: "plugin-react/hooks/useServerRouteData.ts", params: {} },
      {
        type: "file",
        template: "plugin-react/router/createSSRRouter.tsx",
        params: {
          basename: router.basename,
          RemoteAppLoader: ssrCompose ? `import { createRemoteAppLoader } from "../ssr-compose/RemoteAppLoader"\nregistryHook("createRemoteAppLoader", createRemoteAppLoader)` : ""
        }
      },
      { type: "file", template: "plugin-react/router/routes.ssr.tsx", params: buildRoutesSSRParams(serverRoutes, dumpInput) },
      { type: "file", template: "plugin-react/ssr/resolveActionRouteData.ts", params: {} },
      { type: "file", template: "plugin-react/ssr/SSRContext.ts", params: {} },
      {
        type: "file",
        template: "plugin-react/ssr/ssrRender.tsx",
        params: {
          mainServerPath: relative(resolve(dumpInput, "plugin-react/ssr"), mainSSRInput)
        }
      },
      { type: "file", template: "plugin-react/ssr/SSRServerShared.tsx", params: {} },

      { type: "file", template: "plugin-react/ssr-compose/browser.ts", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/cacheManifest.ts", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/RemoteAppLoader.tsx", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/renderCompToString.tsx", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/renderRemoteComponent.tsx", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/ssr-compose.type.ts", params: {} },
      { type: "file", template: "plugin-react/ssr-compose/SSRComposeContext.ts", params: {} }
    ]

    pendingPromises.push(...ssrConfigs.map(async f => dumpFileManager.add(f.type as "file", f.template, await renderTemplate(f.template, f.params))))
  }

  await Promise.all(pendingPromises)
}

function common(clientRoutes: any[], param: PluginInitClientParam) {
  const { dumpFileManager } = param
  const clientConfigs = [
    { type: "file", template: "plugin-react/hooks/useLoader.ts", params: {} },
    { type: "file", template: "plugin-react/hooks/useRouter.ts", params: {} },
    { type: "file", template: "plugin-react/utils/callWithCatch.ts", params: {} },
    { type: "file", template: "plugin-react/router/GuardRoute.tsx", params: {} },
    { type: "file", template: "plugin-react/router/lazyLoad.tsx", params: {} },
    { type: "file", template: "plugin-react/router/RouteContext.tsx", params: {} },
    { type: "file", template: "plugin-react/router/routes.tsx", params: buildRoutesParams(clientRoutes) },
    { type: "file", template: "main.tsx", params: buildMainParams(param) }
  ]
  return clientConfigs.map(async f => dumpFileManager.add(f.type as "file", f.template, await renderTemplate(f.template, f.params)))
}
