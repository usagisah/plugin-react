import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { resolve } from "path"
import type { SSRComposeCache, SSRComposeManifest } from "./ssr-compose.type"

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, ".cache")

export function checkCacheChange(cacheInfo: SSRComposeCache) {
  if (!cacheInfo) return true
  return statSync(cacheInfo.originFilePath).atimeMs > cacheInfo.lastChange
}

export async function loadCacheManifest() {
  const cacheManifestPath = resolve(cachePath, "ssr.compose.json")
  if (!existsSync(cacheManifestPath)) return null

  try {
    return JSON.parse(readFileSync(cacheManifestPath, "utf-8")) as SSRComposeManifest
  } catch {
    rmSync(cachePath, { force: true, recursive: true })
    return null
  }
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
  const cache: SSRComposeCache = {
    lastChange: statSync(input).atimeMs,
    originFilePath: input,
    filePath: "",
    importPath: "",
    assets: {
      css: []
    }
  }
  const cwd = process.cwd()
  for (const key of Object.getOwnPropertyNames(manifest)) {
    const value = manifest[key]
    if (value.isEntry) {
      cache.filePath = resolve(outDir, value.file)
      cache.importPath = cache.filePath.slice(cwd.length)
    } else if (value.file.endsWith(".css")) {
      cache.assets.css.push(resolve(outDir, value.file).slice(cwd.length))
    }
  }

  let _cacheManifest = cacheManifest
  if (_cacheManifest) _cacheManifest[sourcePath] = cache
  else _cacheManifest = { [sourcePath]: cache }
  writeFileSync(resolve(cachePath, "ssr.compose.json"), JSON.stringify(_cacheManifest, null, 2), "utf-8")
  return _cacheManifest
}
