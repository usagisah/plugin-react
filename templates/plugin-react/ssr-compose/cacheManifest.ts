import { SSRComposeCoordinateValue, SSRComposeRenderRemoteComponentOptions } from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { createHash } from "crypto"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { resolve } from "path"
import { SSRServerShared } from "../ssr/SSRServerShared"
import type { SSRComposeCache, SSRComposeManifest } from "./ssr-compose.type"

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, ".cache")

export async function loadCacheManifest(prefix: string, coordinateMap: SSRComposeCoordinateValue, renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeManifest> {
  const { mode, inputs } = renderOptions.ssrRenderOptions.serverContext
  const { viteComponentBuild } = renderOptions.ssrRenderOptions.ssrComposeOptions
  const { sourcePath } = renderOptions.renderProps

  if (mode === "production") {
    const { startInput } = inputs
    const { ssrComposeManifest } = await SSRServerShared.resolveContext(null as any)
    if (!ssrComposeManifest[sourcePath]) {
      const { coordinate, manifest, ssrManifest } = coordinateMap
      for (const key in coordinate) {
        const _key = coordinate[key]
        const value = manifest[_key]
        const ssrValue = ssrManifest[_key]
        ssrComposeManifest[key] = {
          lastChange: 0,
          importPath: `/${prefix}/${value.file}`,
          filePath: resolve(startInput, prefix, "server", ssrValue[0].slice(prefix.length + 2)),
          assets: {
            css: (value.css ?? []).map((file: string) => `/${prefix}/${file}`)
          }
        }
      }
    }

    return ssrComposeManifest
  }

  const cacheManifestPath = resolve(cachePath, "ssr-compose.json")
  let cacheManifest: SSRComposeManifest | null = null

  if (existsSync(cacheManifestPath)) {
    try {
      cacheManifest = JSON.parse(readFileSync(cacheManifestPath, "utf-8")) as SSRComposeManifest
    } catch {
      rmSync(cachePath, { force: true, recursive: true })
    }
  }
  if (!cacheManifest || !cacheManifest[sourcePath] || checkCacheChange(cacheManifest[sourcePath])) {
    const input = coordinateMap.devFilepath!
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

export function checkCacheChange(cacheInfo: SSRComposeCache) {
  if (!cacheInfo) return true
  return statSync(cacheInfo.filePath).atimeMs > cacheInfo.lastChange
}

type FlushCacheManifestProps = {
  cacheManifest: SSRComposeManifest | null
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
