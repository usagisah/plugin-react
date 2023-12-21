import { SSRComposeRenderProps, SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/server"
import { SSRServerShared } from "../ssr/SSRServerShared"
import { loadCacheManifest } from "./cacheManifest"
import { renderComponentToString } from "./renderCompToString"

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrContext, ssrComposeContext } = renderOptions
  const { serverMode } = ssrContext
  const { projectMap } = ssrComposeContext!
  const { prefix, sourcePath } = normalizeSourcePath(renderProps)
  await SSRServerShared.resolveContext(renderOptions)

  const cacheManifest = await loadCacheManifest(prefix, sourcePath, renderOptions)
  const cache = cacheManifest[sourcePath]
  // ssr-compose 下会使用 useContext 会出现不同实例
  const renderToString = serverMode === "start" ? (await import(/* @vite-ignore */ projectMap.get(prefix)!.mainServerInput)).renderComponentToString : renderComponentToString
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
