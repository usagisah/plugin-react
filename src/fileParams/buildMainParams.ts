import { PluginPatchClientParam } from "@w-hite/album/server"
import { relative } from "path"

export function buildMainParams(param: PluginPatchClientParam) {
  const { appManager, info } = param
  const { ssr, ssrCompose, inputs } = info
  const { dumpInput } = inputs
  const { router, mainInput } = appManager
  let ssr_hooks_registry = ""
  let RemoteAppLoader = ""

  if (ssr) {
    ssr_hooks_registry = 'import { useServer } from "./plugin-react/hooks/useServer"\nimport { useServerData } from "./plugin-react/hooks/useServerData"\nimport { useServerRouteData } from "./plugin-react/hooks/useServerRouteData"\nregistryHook("useServer", useServer)\nregistryHook("useServer", useServer)\nregistryHook("useServerData", useServerData)\nregistryHook("useServerRouteData", useServerRouteData)'
  }

  if (ssrCompose) {
    RemoteAppLoader = 'import { createRemoteAppLoader } from "./plugin-react/ssr-compose/RemoteAppLoader"\nregistryHook("createRemoteAppLoader", createRemoteAppLoader)'
  }

  return {
    mainPath: relative(dumpInput, mainInput),
    ssr_hooks_registry,
    RemoteAppLoader,
    basename: router.basename
  }
}
