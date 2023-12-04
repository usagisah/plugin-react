import viteReactPlugin from "@vitejs/plugin-react-swc"
import { AlbumDevContext, AlbumUserPlugin, mergeConfig } from "@w-hite/album/cli"
import { resolveDirPath, resolveFilePath } from "@w-hite/album/utils/path/resolvePath"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { build as viteBuild } from "vite"
import { pluginInitFile } from "./initFile.js"
import { pluginPatchFile } from "./patchFile.js"
import { buildReactRoutes } from "./routes.js"

type PluginProps<T> = T extends (props: infer P) => any ? P : never

export type PluginReact = {
  pluginReact?: PluginProps<typeof viteReactPlugin>
}

export default function pluginReact(props?: PluginReact): AlbumUserPlugin {
  const { pluginReact } = props ?? {}
  let albumContext: AlbumDevContext

  return {
    name: "album:plugin-react",
    config(param) {
      if (!param.config.ssrCompose) return
      param.config = mergeConfig(param.config, {
        ssrCompose: {
          dependencies: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"]
        }
      })
    },
    async findEntries(param) {
      const { result, inputs } = param
      const { cwd } = inputs
      const { main, mainSSR, module } = result
      const [_main, _mainSSR, _modulePath] = await Promise.all([
        resolveFilePath({
          root: cwd,
          name: main ?? "main",
          exts: [".tsx", ".ts"]
        }),
        resolveFilePath({
          root: cwd,
          name: mainSSR ?? "main.ssr",
          exts: [".tsx", ".ts"]
        }),
        module.path
          ? resolve(cwd, module.path)
          : resolveDirPath({
              root: cwd,
              name: module?.name ?? "modules"
            })
      ])
      result.main = _main
      result.mainSSR = _mainSSR
      result.module = {
        path: _modulePath,
        name: module?.name ?? "modules"
      }
    },
    context(param) {
      albumContext = param.albumContext
      const file = albumContext.appFileManager.get("file", "album-env.d.ts")
      file.write(f => {
        const typePlugin = `/// <reference types="@w-hite/plugin-react/album" />`
        return f.includes(typePlugin) ? f : `${f}\n${typePlugin}`
      })
    },
    async initClient(param) {
      const { result, info, specialModules } = param
      const { ssr, inputs } = info
      const { clientRoutes, serverRoutes } = await buildReactRoutes(inputs.dumpInput, specialModules)
      await pluginInitFile(clientRoutes, serverRoutes, param)
      result.realClientInput = resolve(inputs.dumpInput, "main.tsx")
      if (ssr) result.realSSRInput = resolve(inputs.dumpInput, "main.ssr.tsx")
    },
    async patchClient(param) {
      const { info, specialModules } = param
      const { inputs } = info
      const { clientRoutes, serverRoutes } = await buildReactRoutes(inputs.dumpInput, specialModules)
      await pluginPatchFile(clientRoutes, serverRoutes, param)
    },
    async serverConfig(params) {
      params.viteConfigs.push({
        name: "plugin-react",
        config: {
          build: {
            emptyOutDir: false
          },
          plugins: [viteReactPlugin(pluginReact) as any]
        }
      })
    },
    async buildEnd() {
      const { info, clientConfig, logger } = albumContext
      const { ssr, ssrCompose, inputs, outputs } = info

      if (ssr && ssrCompose) {
        const { module } = clientConfig
        const { cwd, dumpInput } = inputs
        if (!module || !module.modulePath) return

        const { clientOutDir } = outputs
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
        logger.log("生成 ssr-compose 坐标文件成功", "plugin-react")

        logger.log("正在打包 ssr-compose 前置文件，请耐心等待...", "plugin-react")
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
        logger.log("生成 ssr-compose 前置文件成功", "plugin-react")
      }
    }
  }
}
