import type { PluginInitClientParam } from "@w-hite/album/cli"
import { relative, resolve } from "path"
import { buildMainParams } from "./buildParams/buildMainParams.js"
import { buildRoutesParams } from "./buildParams/buildRoutesParams.js"
import { buildRoutesSSRParams } from "./buildParams/buildRoutesSSRParams.js"
import type { ClientRoute, ServerRoute } from "./plugin.type.js"
import { renderTemplate } from "./template/renderTemplate.js"

export async function pluginInitFile(clientRoutes: ClientRoute[], serverRoutes: ServerRoute[], param: PluginInitClientParam) {
  const pendingPromises: Promise<any>[] = []
  const { fileManager, ssrCompose } = param
  const { dumpInput, ssrInput } = param.inputs
  const { ssr } = param.status
  const { router } = param.clientConfig

  pendingPromises.push(common(clientRoutes, param))

  if (ssr) {
    const ssrConfigs = [
      {
        type: "file",
        template: "main.ssr.tsx",
        params: {
          mainEntryPath: relative(process.cwd(), resolve(dumpInput, "main.tsx")),
          mainServerPath: relative(dumpInput, ssrInput)
        }
      },
      {
        type: "file",
        template: "plugin-react/router/routes.ssr.tsx",
        params: buildRoutesSSRParams(serverRoutes, dumpInput)
      },
      {
        type: "file",
        template: "plugin-react/router/createSSRRouter.tsx",
        params: { basename: router.basename, RemoteAppLoader: ssrCompose ? `import { createRemoteAppLoader } from "../../ssr-compose/components/RemoteAppLoader"\nregistryHook("createRemoteAppLoader", createRemoteAppLoader)` : "" }
      },
      { type: "file", template: "plugin-react/ssr/SSRContext.ts", params: {} },
      {
        type: "file",
        template: "plugin-react/ssr/buildStaticInfo.tsx",
        params: {}
      },
      {
        type: "file",
        template: "plugin-react/ssr/resolveActionRouteData.ts",
        params: {}
      },
      { type: "file", template: "plugin-react/hooks/useServer.ts", params: {} },
      {
        type: "file",
        template: "plugin-react/hooks/useServerData.ts",
        params: {}
      },
      {
        type: "file",
        template: "plugin-react/hooks/useServerRouteData.ts",
        params: {}
      }
    ]

    pendingPromises.push(...ssrConfigs.map(async f => fileManager.add(f.type as "file", f.template, await renderTemplate(f.template, f.params))))
  }

  if (ssrCompose) {
    const ssrComposeConfigs = [
      { type: "file", template: "main.ssr-compose.tsx", params: {} },
      { type: "file", template: "ssr-compose/components/RemoteAppLoader.tsx", params: {} },
      { type: "file", template: "ssr-compose/browser.ts", params: {} },
      { type: "file", template: "ssr-compose/cacheManifest.ts", params: {} },
      { type: "file", template: "ssr-compose/renderCompToString.tsx", params: {} },
      { type: "file", template: "ssr-compose/ssr-compose.type.ts", params: {} },
      { type: "file", template: "ssr-compose/SSRComposeContext.ts", params: {} }
    ]
    pendingPromises.push(...ssrComposeConfigs.map(async (f: any) => fileManager.add(f.type as "file", f.template, await renderTemplate(f.template, f.params))))
  }
}

async function common(clientRoutes: any[], param: PluginInitClientParam) {
  const { fileManager } = param
  const clientConfigs = [
    { type: "file", template: "plugin-react/hooks/useLoader.ts", params: {} },
    { type: "file", template: "plugin-react/hooks/useRouter.ts", params: {} },
    {
      type: "file",
      template: "plugin-react/utils/callWithCatch.ts",
      params: {}
    },
    {
      type: "file",
      template: "plugin-react/router/RouteContext.tsx",
      params: {}
    },
    {
      type: "file",
      template: "plugin-react/router/GuardRoute.tsx",
      params: {}
    },
    { type: "file", template: "plugin-react/router/lazyLoad.tsx", params: {} },
    {
      type: "file",
      template: "plugin-react/router/routes.tsx",
      params: buildRoutesParams(clientRoutes)
    },
    {
      type: "file",
      template: "main.tsx",
      params: buildMainParams(param)
    }
  ]

  await Promise.all(clientConfigs.map(async f => fileManager.add(f.type as "file", f.template, await renderTemplate(f.template, f.params))))
}
