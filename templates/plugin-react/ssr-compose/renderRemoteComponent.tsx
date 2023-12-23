import { SSRComposeRenderProps, SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/server"
import { SSRComposeProject as StartProject } from "@w-hite/album/start"
import { SSRServerShared } from "../ssr/SSRServerShared"
import { loadCacheManifest } from "./cacheManifest"
import { renderComponentToString } from "./renderCompToString"

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions) {
  const { renderProps, ssrContext, ssrComposeContext } = renderOptions
  const { serverMode } = ssrContext
  const { projectMap, sources } = ssrComposeContext!
  const { prefix, sourcePath } = normalizeSourcePath(renderProps)
  await SSRServerShared.resolveContext(renderOptions)

  const cacheManifest = await loadCacheManifest(prefix, sourcePath, renderOptions)
  const cache = cacheManifest![sourcePath]
  // ssr-compose 下会使用 useContext 会出现不同实例
  const renderToString = serverMode === "start" ? (await import(/* @vite-ignore */ (projectMap as any as StartProject).get(prefix)!.mainServerInput)).renderComponentToString : renderComponentToString
  const value: SSRComposeRenderRemoteComponentReturn = {
    sources,
    importPath: cache.importPath,
    css: cache.css,
    ...(await renderToString(cache.importPath, renderOptions))
  }
  return value
}

function normalizeSourcePath(renderProps: SSRComposeRenderProps) {
  let { sourcePath } = renderProps
  if (sourcePath.startsWith("/")) sourcePath = sourcePath.slice(1)
  if (sourcePath.endsWith("/")) sourcePath = sourcePath.slice(0, -1)
  renderProps.sourcePath = sourcePath
  return { prefix: sourcePath.split("/")[0], sourcePath }
}
