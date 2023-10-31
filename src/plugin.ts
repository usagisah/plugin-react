import type { AlbumContext, PluginViteConfig, UserPlugins } from "@w-hite/album/cli"

import viteReactPlugin from "@vitejs/plugin-react-swc"
import { findEntryPath } from "@w-hite/album/utils/utils"
import { readFileSync, writeFileSync } from "fs"
import { basename, resolve } from "path"
import { build as viteBuild } from "vite"
import { IgnoreModules, buildIgnoreModules } from "./buildIgnoreModules.js"
import { buildReactRoutes } from "./buildReactRoutes.js"
import { pluginInitFile } from "./plugin_initFile.js"
import { pluginPatchFile } from "./plugin_patchFile.js"

type PluginProps<T> = T extends (props: infer P) => any ? P : never

export type PluginReact = {
  pluginReact?: PluginProps<typeof viteReactPlugin>
  ignoreModules?: IgnoreModules
}

export default function pluginReact(props?: PluginReact): UserPlugins {
  const { pluginReact, ignoreModules } = props ?? {}
  const _ignoreModules = buildIgnoreModules(ignoreModules)
  let albumContext: AlbumContext

  return {
    config(param) {
      const { ssrCompose } = param
      if (!ssrCompose) return

      const reactDependencies = [{ react: { "jsx-runtime": {} } }, "react", "react-dom", { "react-dom": { client: {} } }]
      const { dependencies } = ssrCompose
      if (!dependencies) ssrCompose.dependencies = reactDependencies
      if (Array.isArray(dependencies)) dependencies.concat(reactDependencies)
    },
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
    context(param) {
      albumContext = param.albumContext
    },
    async initClient(param) {
      const { result, inputs, status, specialModules } = param
      const { clientRoutes, serverRoutes } = await buildReactRoutes(inputs.dumpInput, specialModules, _ignoreModules)
      await pluginInitFile(clientRoutes, serverRoutes, param)
      result.realClientInput = resolve(inputs.dumpInput, "main.tsx")
      if (status.ssr) {
        result.realSSRInput = resolve(inputs.dumpInput, "main.ssr.tsx")
      }
    },
    async patchClient(param) {
      const { inputs, specialModules } = param
      const { clientRoutes, serverRoutes } = await buildReactRoutes(inputs.dumpInput, specialModules, _ignoreModules)
      await pluginPatchFile(clientRoutes, serverRoutes, param)
    },
    async serverConfig(props) {
      const config: PluginViteConfig = {
        name: "plugin-react",
        options: {
          build: {
            emptyOutDir: false
          },
          plugins: [viteReactPlugin(pluginReact) as any]
        }
      }
      props.viteConfigs.push(config)
    },
    async buildEnd() {
      if (albumContext.status.ssr && albumContext.configs.ssrCompose) {
        const { module } = albumContext.configs.clientConfig
        const { cwd, dumpInput } = albumContext.inputs
        if (!module || !module.modulePath) return

        const { clientOutDir } = albumContext.outputs
        const ssrComposeModuleRootInput = resolve(module.modulePath, "../")
        const manifest = JSON.parse(readFileSync(resolve(clientOutDir, "manifest.json"), "utf-8"))
        const moduleRoot = ssrComposeModuleRootInput.slice(cwd.length + 1)
        const _coordinate: Record<string, string> = {}
        for (const key of Object.getOwnPropertyNames(manifest)) {
          if (key.startsWith(moduleRoot) && (key.endsWith(".tsx") || key.endsWith(".ts"))) {
            _coordinate[key.slice(moduleRoot.length + 1)] = key
          }
        }

        writeFileSync(resolve(clientOutDir, "../coordinate.json"), JSON.stringify(_coordinate), "utf-8")
        albumContext.logger.log("生成 ssr-compose 坐标文件成功", "plugin-react")

        albumContext.logger.log("正在打包 ssr-compose 前置文件，请耐心等待...", "plugin-react")
        await viteBuild({
          plugins: [viteReactPlugin(pluginReact)],
          logLevel: "error",
          build: {
            reportCompressedSize: false,
            rollupOptions: {
              input: resolve(dumpInput, "plugin-react/ssr-compose/browser.ts"),
              output: {
                entryFileNames: `[name].js`
              }
            },
            emptyOutDir: false,
            outDir: clientOutDir
          }
        })
        albumContext.logger.log("生成 ssr-compose 前置文件成功", "plugin-react")
      }
    }
  }
}
