import { PluginPatchClientParam } from "@w-hite/album/cli"
import { relative } from "path"

export function buildMainParams(param: PluginPatchClientParam) {
  const {
    status: { ssr },
    inputs: { dumpInput, clientInput },
    clientConfig: { router },
    ssrCompose
  } = param
  let ssr_hooks_registry = ""
  let RemoteAppLoader = ""

  if (ssr) {
    ssr_hooks_registry = 'import { useServer } from "./plugin-react/hooks/useServer"\nimport { useServerData } from "./plugin-react/hooks/useServerData"\nimport { useServerRouteData } from "./plugin-react/hooks/useServerRouteData"\nregistryHook("useServer", useServer)\nregistryHook("useServer", useServer)\nregistryHook("useServerData", useServerData)\nregistryHook("useServerRouteData", useServerRouteData)';
  }

  if (ssrCompose) {
    RemoteAppLoader = 'import { createRemoteAppLoader } from "./ssr-compose/components/RemoteAppLoader"\nregistryHook("createRemoteAppLoader", createRemoteAppLoader)'
  }

  return {
    mainPath: relative(dumpInput, clientInput),
    ssr_hooks_registry,
    RemoteAppLoader,
    basename: router.basename
  }
}
