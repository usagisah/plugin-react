import type { UserPlugins } from "@w-hite/album/cli"
import { findEntryPath } from "@w-hite/album/utils/utils"
import { buildReactRoutes } from "./buildReactRoutes.js"
import { pluginInitFile } from "./plugin_initFile.js"
import { pluginPatchFile } from "./plugin_patchFile.js"
import { basename, resolve, parse as pathParse } from "path"
import { UserConfig } from "vite"
import { IgnoreModules, buildIgnoreModules } from "./buildIgnoreModules.js"
import viteReactPlugin from "@vitejs/plugin-react-swc"

type PluginProps<T> = T extends (props: infer P) => any ? P : never

export type PluginReact = {
  pluginReact?: PluginProps<typeof viteReactPlugin>
  ignoreModules?: IgnoreModules
}

export default function pluginReact(props?: PluginReact): UserPlugins {
  const { pluginReact, ignoreModules } = props ?? {}
  const _ignoreModules = buildIgnoreModules(ignoreModules)

  return {
    async findEntries(param) {
      const { result, inputs } = param
      const { main, mainSSR, module } = result

      const [_main, _modulePath] = await Promise.all([
        findEntryPath({
          cwd: inputs.cwd,
          name: main ?? "main",
          exts: [".tsx", ".ts"]
        }),
        findEntryPath({
          cwd: inputs.cwd,
          name: module.modulePath ?? "modules",
          exts: []
        })
      ])
      result.main = _main
      result.module = {
        modulePath: _modulePath,
        moduleName: module.moduleName ?? basename(_modulePath)
      }

      if (mainSSR) {
        const _mainSSR = await findEntryPath({
          cwd: inputs.cwd,
          name: mainSSR ?? "main.ssr",
          exts: [".tsx", ".ts"]
        })
        result.mainSSR = _mainSSR
      }


    },
    async initClient(param) {
      const { result, inputs, status, specialModules, ssrCompose } = param
      const { clientRoutes, serverRoutes } = await buildReactRoutes(
        inputs.dumpInput,
        specialModules,
        _ignoreModules
      )
      await pluginInitFile(clientRoutes, serverRoutes, param)
      result.realClientInput = resolve(
        inputs.dumpInput,
        basename(inputs.clientInput)
      )
      if (status.ssr) {
        result.realSSRInput = resolve(
          inputs.dumpInput,
          basename(inputs.ssrInput)
        )
      }
      if (ssrCompose) {
        result.realSSRComposeInput = resolve(inputs.dumpInput, "main.ssr.compose.tsx")
      }
    },
    async patchClient(param) {
      const { inputs, specialModules } = param
      const { clientRoutes, serverRoutes } = await buildReactRoutes(
        inputs.dumpInput,
        specialModules,
        _ignoreModules
      )
      await pluginPatchFile(clientRoutes, serverRoutes, param)
    },
    async serverConfig(props) {
      const options: UserConfig = {
        plugins: [viteReactPlugin(pluginReact)]
      }
      props.viteConfigs.push({
        name: "plugin-react",
        options
      } as any)
    }
  }
}
