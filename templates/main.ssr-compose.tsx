import type { SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { createHash } from "crypto"
import { existsSync } from "fs"
import { resolve } from "path"
import { checkCacheChange, flushCacheManifest, loadCacheManifest } from "./ssr-compose/cacheManifest"
import { renderComponentToString } from "./ssr-compose/renderCompToString"

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, "ssr-compose/.cache")

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrComposeContextProps } = renderOptions
  const { sourcePath } = renderProps
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
