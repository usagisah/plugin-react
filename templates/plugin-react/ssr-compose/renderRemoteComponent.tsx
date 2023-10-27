import type { SSRComposeRenderRemoteComponentOptions, SSRComposeRenderRemoteComponentReturn, SSRComposeRenderProps } from "@w-hite/album/ssr"
import { existsSync } from "fs"
import { resolve } from "path"
import { loadCacheManifest } from "./cacheManifest"
import { renderComponentToString } from "./renderCompToString"
import { SSRServerShared } from "../ssr/SSRServerShared"

export async function renderRemoteComponent(renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrContextProps, ssrComposeContextProps } = renderOptions
  const { sourcePath } = normalizeRenderProps(renderProps)
  const { moduleRoot } = ssrComposeContextProps.ssrComposeOptions
  const { inputs, serverMode } = ssrContextProps.ssrSlideProps
  await SSRServerShared.resolveContext({ inputs, serverMode })

  const input = resolve(moduleRoot, sourcePath)
  if (!existsSync(input)) {
    throw "资源不存在"
  }

  const cacheManifest = await loadCacheManifest(renderOptions)
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