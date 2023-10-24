import type { SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn, SSRComposeRenderProps } from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { registryHook } from "@w-hite/album"
import { createHash } from "crypto"
import { existsSync } from "fs"
import { resolve } from "path"
import { checkCacheChange, flushCacheManifest, loadCacheManifest } from "./ssr-compose/cacheManifest"
import { renderComponentToString } from "./ssr-compose/renderCompToString"

import { useServer } from "./plugin-react/hooks/useServer"
import { useServerData } from "./plugin-react/hooks/useServerData"
import { useServerRouteData } from "./plugin-react/hooks/useServerRouteData"
import { RemoteAppLoader } from "./ssr-compose/components/RemoteAppLoader"
registryHook("useServer", useServer)
registryHook("useServerData", useServerData)
registryHook("useServerRouteData", useServerRouteData)
registryHook("RemoteAppLoader", RemoteAppLoader)
registryHook("useRoutes", () => [])
registryHook("useRoutesMap", () => new Map())

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, "ssr-compose/.cache")

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrComposeContextProps } = renderOptions
  const { sourcePath } = normalizeRenderProps(renderProps)
  const { moduleRoot, viteComponentBuild } = ssrComposeContextProps.ssrComposeOptions

  const input = resolve(moduleRoot, sourcePath)
  if (!existsSync(input)) {
    throw "资源不存在"
  }

  let cacheManifest = await loadCacheManifest()
  if (!cacheManifest || !cacheManifest[sourcePath] || checkCacheChange(cacheManifest[sourcePath])) {
    const outDirName = createHash("md5").update(sourcePath).digest("hex")
    const outDir = resolve(cachePath, outDirName)
    await viteComponentBuild({ input, outDir })
    cacheManifest = await flushCacheManifest({
      cacheManifest,
      sourcePath,
      input,
      outDir
    })
  }

  const cache = cacheManifest[sourcePath]
  const res = await renderComponentToString(cache.filePath, renderOptions)
  return {
    html: res.html,
    serverDynamicData: res.serverDynamicData,
    assets: cache.assets,
    importPath: cache.importPath
  }
}

function normalizeRenderProps(renderProps: SSRComposeRenderProps): SSRComposeRenderProps {
  const { sourcePath } = renderProps
  if (sourcePath.startsWith("/")) {
    renderProps.sourcePath = sourcePath.slice(1)
  }
  return renderProps
}