import { PluginPatchClientParam } from "@w-hite/album/cli"
import { relative } from "path"

export function buildMainParams(param: PluginPatchClientParam) {
  const {
    status: { ssr },
    inputs: { dumpInput, clientInput },
    clientConfig: { router }
  } = param
  let ssr_hooks_import = ""
  let ssr_hooks_registry = ""

  if (ssr) {
    ssr_hooks_import = `import { useServer } from "./plugin-react/hooks/useServer"\nimport { useServerData } from "./plugin-react/hooks/useServerData"\nimport { useServerRouteData } from "./plugin-react/hooks/useServerRouteData"`
    ssr_hooks_registry = `registryHook("useServer", useServer)\nregistryHook("useServerData", useServerData)\nregistryHook("useServerRouteData", useServerRouteData)`
  }

  return {
    mainPath: relative(dumpInput, clientInput),
    ssr_hooks_import,
    ssr_hooks_registry,
    basename: router.basename
  }
}
