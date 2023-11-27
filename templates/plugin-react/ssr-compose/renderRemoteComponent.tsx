import type { SSRComposeRenderProps, SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/ssr"
import { SSRServerShared } from "../ssr/SSRServerShared"
import { loadCacheManifest } from "./cacheManifest"
import { renderComponentToString } from "./renderCompToString"

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrContext, ssrComposeContext } = renderOptions
  const { serverMode } = ssrContext
  const { existsProject, projectInputs } = ssrComposeContext
  const { prefix, sourcePath } = normalizeSourcePath(renderProps)
  await SSRServerShared.resolveContext(renderOptions)

  const coordinateMap = existsProject(prefix, sourcePath)
  if (!coordinateMap) throw "资源不存在"

  const cacheManifest = await loadCacheManifest(prefix, coordinateMap, renderOptions)
  const cache = cacheManifest[sourcePath]
  // ssr-compose 下会使用 useContext 会出现不同实例
  const renderToString = serverMode === "start" ? (await import(/* @vite-ignore */ projectInputs.get(prefix).mainServerInput)).renderComponentToString : renderComponentToString
  const res = await renderToString(cache.filePath, renderOptions)
  return {
    html: res.html,
    serverDynamicData: res.serverDynamicData,
    assets: cache.assets,
    importPath: cache.importPath
  }
}

function normalizeSourcePath(renderProps: SSRComposeRenderProps) {
  let { sourcePath } = renderProps
  if (sourcePath.startsWith("/")) sourcePath = renderProps.sourcePath = sourcePath.slice(1)
  return { prefix: sourcePath.split("/")[0], sourcePath }
}
