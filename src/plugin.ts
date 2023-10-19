import type { UserPlugins } from "@w-hite/album/cli"
import { buildReactRoutes } from "./buildReactRoutes.js"
import { pluginInitFile } from "./plugin_initFile.js"
import { pluginPatchFile } from "./plugin_patchFile.js"
import { basename, extname, resolve } from "path"
import { existsSync } from "fs"
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
      const { result } = param
      const { main, mainSSR, module } = result

      const cwd = process.cwd()
      const exts = [".tsx", ".ts"]
      const prefixes = ["src", "client", "./"]

      const _main = main && extname(main).length > 1 ? main : "main"
      mainFile: for (const ext of exts) {
        for (const prefix of prefixes) {
          const filePath = resolve(cwd, prefix, _main + ext)
          if (existsSync(filePath)) {
            result.main = filePath
            break mainFile
          }
        }
      }

      const _module = module ?? "modules"
      for (const prefix of prefixes) {
        const filePath = resolve(cwd, prefix, _module)
        if (existsSync(filePath)) {
          result.module = filePath
          break
        }
      }

      if (mainSSR) {
        const _mainSSR =
          mainSSR && extname(mainSSR).length > 1 ? mainSSR : "main.ssr"
        mainSSRFile: for (const ext of exts) {
          for (const prefix of prefixes) {
            const filePath = resolve(cwd, prefix, _mainSSR + ext)
            if (existsSync(filePath)) {
              result.mainSSR = filePath
              break mainSSRFile
            }
          }
        }
      }
    },
    async initClient(param) {
      const { result, inputs, status, specialModules } = param
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