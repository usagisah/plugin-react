import { SSRComposeCoordinate as DevCoordinate, SSRComposeRenderRemoteComponentOptions } from "@w-hite/album/server"
import { SSRComposeCoordinate as StartCoordinate } from "@w-hite/album/start"
import { createHash } from "crypto"
import { existsSync, readFileSync, rmSync } from "fs"
import { writeFile } from "fs/promises"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { SSRServerShared } from "../ssr/SSRServerShared"
import { SSRComposeCache, SSRComposeManifest } from "./ssr-compose.type"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cachePath = resolve(__dirname, ".cache")

export async function loadCacheManifest(prefix: string, sourcePath: string, renderOptions: SSRComposeRenderRemoteComponentOptions): Promise<SSRComposeManifest> {
  const { ssrContext, ssrComposeContext } = renderOptions
  const { env, inputs } = ssrContext
  const { ssrComposeBuild, projectMap } = ssrComposeContext!
  const project = projectMap.get(prefix)
  if (!project) throw "资源不存在"

  if (env.mode === "production") {
    const coordinateMap = project.coordinate as StartCoordinate
    const { root } = inputs
    const composeManifest = (await SSRServerShared.resolveContext(null as any)).ssrComposeManifest!
    if (!composeManifest[sourcePath]) {
      const { coordinate, manifest, ssrManifest } = coordinateMap[sourcePath]
      for (const key in coordinate) {
        const _key = coordinate[key]
        const value = manifest[_key]
        const ssrValue = ssrManifest[_key]
        composeManifest[key] = {
          importPath: `/${prefix}/${value.file}`,
          filePath: resolve(root, prefix, "ssr", ssrValue[0].slice(prefix.length + 2)),
          assets: {
            css: (value.css ?? []).map((file: string) => `/${prefix}/${file}`)
          }
        }
      }
    }

    return composeManifest
  }

  const coordinateMap = project.coordinate as DevCoordinate
  const cacheManifestPath = resolve(cachePath, "ssr-compose.json")
  let cacheManifest: SSRComposeManifest | null = null
  if (existsSync(cacheManifestPath)) {
    try {
      cacheManifest = JSON.parse(readFileSync(cacheManifestPath, "utf-8")) as SSRComposeManifest
    } catch {
      rmSync(cachePath, { force: true, recursive: true })
    }
  }

  const coordinate = coordinateMap[sourcePath]
  const { filepath, changed } = coordinate
  console.log( coordinate )
  if (!filepath) throw "资源不存在"
  if (!cacheManifest || !cacheManifest[sourcePath] || changed) {
    const outDirName = createHash("md5").update(sourcePath).digest("hex")
    const outDir = resolve(cachePath, outDirName)
    await ssrComposeBuild({ coordinate, input: filepath, outDir })
    cacheManifest = await flushCacheManifest({
      cacheManifest,
      sourcePath,
      input: filepath,
      outDir
    })
  }
  return cacheManifest
}

type FlushCacheManifestProps = {
  cacheManifest: SSRComposeManifest | null
  sourcePath: string
  input: string
  outDir: string
}
export async function flushCacheManifest(props: FlushCacheManifestProps) {
  const { cacheManifest, sourcePath, input, outDir } = props
  const manifest = JSON.parse(readFileSync(resolve(outDir, ".vite/manifest.json"), "utf-8"))
  const cwd = process.cwd()
  const cache: SSRComposeCache = {
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
  await writeFile(resolve(cachePath, "ssr-compose.json"), JSON.stringify(_cacheManifest, null, 2), "utf-8")
  return _cacheManifest
}
