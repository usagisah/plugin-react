import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { resolve } from "path"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { renderComponentToString } from "./ssr-compose/renderCompToString"
import { createHash } from "crypto"
import {
  SSRComposeCache,
  SSRComposeManifest,
  SSRComposeRenderRemoteComponentOptions,
  SSRComposeRenderRemoteComponentReturn
} from "./ssr-compose/ssr-compose.type"

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, "ssr-compose/.cache")

export async function renderRemoteComponent(
  renderOptions: SSRComposeRenderRemoteComponentOptions
): Promise<SSRComposeRenderRemoteComponentReturn> {
  const { renderProps, ssrComposeContextProps } = renderOptions
  const { sourcePath } = renderProps
  const { moduleRoot, viteComponentBuild } =
    ssrComposeContextProps.ssrComposeOptions

  const filePath = resolve(moduleRoot, sourcePath)
  if (!existsSync(filePath)) {
    throw "资源不存在"
  }

  let cacheManifest = await loadCacheManifest()
  if (
    !cacheManifest ||
    !cacheManifest[sourcePath] ||
    checkCacheChange(cacheManifest[sourcePath])
  ) {
    const outDirName = createHash("md5").update(sourcePath).digest("hex")
    const outDir = resolve(cachePath, outDirName)
    await viteComponentBuild({ input: filePath, outDir })
    cacheManifest = await flushCacheManifest(
      cacheManifest,
      sourcePath,
      filePath,
      outDir
    )
  }

  const cacheInfo = cacheManifest[sourcePath]
  const { html, serverDynamicData } = await renderComponentToString(
    cacheInfo.filePath,
    renderOptions
  )
  return {
    html,
    serverDynamicData,
    httpPath: cacheInfo.httpPath,
    assets: cacheInfo.assets
  }
}

function checkCacheChange(cacheInfo: any) {
  if (!cacheInfo) return true
  return statSync(cacheInfo.originPath).atimeMs > cacheInfo.lastChange
}

async function loadCacheManifest() {
  const cacheManifestPath = resolve(cachePath, "ssr.compose.json")
  if (!existsSync(cacheManifestPath)) return null

  try {
    return JSON.parse(
      readFileSync(cacheManifestPath, "utf-8")
    ) as SSRComposeManifest
  } catch {
    rmSync(cachePath, { force: true, recursive: true })
    return null
  }
}

async function flushCacheManifest(
  cacheManifest: null | SSRComposeManifest,
  sourcePath: string,
  input: string,
  outDir: string
) {
  const manifest = JSON.parse(
    readFileSync(resolve(outDir, "manifest.json"), "utf-8")
  )
  const cache: SSRComposeCache = {
    lastChange: statSync(input).atimeMs,
    originFilePath: input,
    filePath: "",
    httpPath: "",
    assets: {
      css: []
    }
  }
  for (const key of Object.getOwnPropertyNames(manifest)) {
    const value = manifest[key]
    if (value.isEntry) {
      cache.filePath = resolve(outDir, value.file)
      cache.httpPath = cache.filePath.slice(process.cwd().length)
    } else if (value.file.endsWith(".css")) {
      cache.assets.css.push(
        resolve(outDir, value.file).slice(process.cwd().length)
      )
    }
  }

  if (cacheManifest) cacheManifest[sourcePath] = cache
  else cacheManifest = { [sourcePath]: cache }

  writeFileSync(
    resolve(cachePath, "ssr.compose.json"),
    JSON.stringify(cacheManifest, null, 2),
    "utf-8"
  )

  return cacheManifest
}
