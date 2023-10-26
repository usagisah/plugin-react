import { SSRComposeRenderRemoteComponentOptions } from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { resolve } from "path"
import type { SSRComposeCache, SSRComposeManifest } from "./ssr-compose.type"
import { createHash } from "crypto"
import { SSRServerContext } from "../ssr/SSRServerContext"

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, ".cache")

export function checkCacheChange(cacheInfo: SSRComposeCache) {
  if (!cacheInfo) return true
  return statSync(cacheInfo.filePath).atimeMs > cacheInfo.lastChange
}

export async function loadCacheManifest(renderOptions: SSRComposeRenderRemoteComponentOptions) {
  const { mode } = renderOptions.ssrContextProps.ssrSlideProps
  const { moduleRoot, viteComponentBuild } = renderOptions.ssrComposeContextProps.ssrComposeOptions
  const { sourcePath } = renderOptions.renderProps

  if (mode === "production") {
    const { ssrComposeManifest } = SSRServerContext.ctx
    if (!ssrComposeManifest[sourcePath]) {
      throw "资源不存在"
    }
    return ssrComposeManifest
  }

  const input = resolve(moduleRoot, sourcePath)
  if (!existsSync(input)) {
    throw "资源不存在"
  }

  const cacheManifestPath = resolve(cachePath, "ssr-compose.json")
  if (!existsSync(cacheManifestPath)) return null

  let cacheManifest: SSRComposeManifest | null = null
  try {
    cacheManifest = JSON.parse(readFileSync(cacheManifestPath, "utf-8")) as SSRComposeManifest
  } catch {
    rmSync(cachePath, { force: true, recursive: true })
  }

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

  return cacheManifest
}

export async function transformCoordinate(ssrServerContext: SSRServerContext) {
  const { __dirname, manifest } = ssrServerContext
  const coordinate = JSON.parse(readFileSync(resolve(__dirname, "coordinate.json"), "utf-8"))
  const ssrComposeManifest: SSRComposeManifest = {}
  for (const key in coordinate) {
    const value = manifest[coordinate[key]]
    ssrComposeManifest[key] = {
      lastChange: 0,
      importPath: value.file,
      filePath: resolve(__dirname, value.file),
      assets: {
        css: []
      }
    }
  }
  return ssrComposeManifest
}

type FlushCacheManifestProps = {
  cacheManifest: null | SSRComposeManifest
  sourcePath: string
  input: string
  outDir: string
}
export async function flushCacheManifest(props: FlushCacheManifestProps) {
  const { cacheManifest, sourcePath, input, outDir } = props
  const manifest = JSON.parse(readFileSync(resolve(outDir, "manifest.json"), "utf-8"))
  const cwd = process.cwd()
  const cache: SSRComposeCache = {
    lastChange: statSync(input).atimeMs,
    filePath: input,
    importPath: input.slice(cwd.length),
    assets: {
      css: []
    }
  }
  for (const key of Object.getOwnPropertyNames(manifest)) {
    const value = manifest[key]
    if (value.file.endsWith(".css")) {
      cache.assets.css.push(resolve(outDir, value.file).slice(cwd.length))
    }
  }

  let _cacheManifest = cacheManifest
  if (_cacheManifest) _cacheManifest[sourcePath] = cache
  else _cacheManifest = { [sourcePath]: cache }
  writeFileSync(resolve(cachePath, "ssr-compose.json"), JSON.stringify(_cacheManifest, null, 2), "utf-8")
  return _cacheManifest
}
