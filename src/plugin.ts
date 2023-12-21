import viteReactPlugin from "@vitejs/plugin-react-swc"
import { AlbumContext, AlbumUserPlugin, mergeConfig } from "@w-hite/album/server"
import { cjsImporterToEsm } from "@w-hite/album/utils/modules/cjs/transformImporters"
import { resolveDirPath, resolveFilePath } from "@w-hite/album/utils/path/resolvePath"
import { readFileSync, writeFileSync } from "fs"
import { readFile, writeFile } from "fs/promises"
import { resolve, sep } from "path"
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
  let albumContext: AlbumContext

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
      const { main, mainSSR, module = {} } = result
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
              name: module.name ?? "modules"
            })
      ])
      result.main = _main
      result.mainSSR = _mainSSR
      result.module = {
        path: _modulePath,
        name: module.name ?? "modules"
      }
    },
    context(param) {
      albumContext = param.albumContext
    },
    async initClient(param) {
      const { result, info, appManager, appFileManager } = param
      const { ssr, inputs } = info
      const { specialModules } = appManager
      const { clientRoutes, serverRoutes } = await buildReactRoutes(inputs.dumpInput, specialModules)
      await pluginInitFile(clientRoutes, serverRoutes, param)
      result.realClientInput = resolve(inputs.dumpInput, "main.tsx")
      if (ssr) result.realSSRInput = resolve(inputs.dumpInput, "main.ssr.tsx")

      const file = appFileManager.get("file", "album-env.d.ts")
      file.write(f => {
        const typePlugin = `/// <reference types="@w-hite/plugin-react/album" />`
        return f.includes(typePlugin) ? f : `${f}\n${typePlugin}`
      })
    },
    async patchClient(param) {
      const { info, appManager } = param
      const { inputs } = info
      const { specialModules } = appManager
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
      const { ssr, ssrCompose, inputs, outputs, appManager, ssrComposeManager, logger } = albumContext
      if (ssr && ssrCompose) {
        const { module } = appManager
        if (!module || !module.modulePath) return
        
        logger.log("正在打包 ssr-compose 前置文件，请耐心等待...", "plugin-react")
        const { dumpInput } = inputs
        const { clientOutDir } = outputs
        const { dependencies } = ssrComposeManager
        await viteBuild({
          plugins: [viteReactPlugin(pluginReact)],
          logLevel: "error",
          build: {
            reportCompressedSize: false,
            rollupOptions: {
              external: dependencies,
              input: resolve(dumpInput, "plugin-react/ssr-compose/browser.ts"),
              output: {
                entryFileNames: `browser.js`
              }
            },
            emptyOutDir: false,
            outDir: clientOutDir
          }
        })
        const browserFilePath = `${clientOutDir}${sep}browser.js`
        const newCode = cjsImporterToEsm(await readFile(browserFilePath, "utf-8"), dependencies)
        await writeFile(browserFilePath, newCode, "utf-8")
        logger.log("生成 ssr-compose 前置文件成功", "plugin-react")
      }
    }
  }
}
