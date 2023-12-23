import { SSRComposeCoordinate as DevCoordinate, SSRComposeRenderRemoteComponentOptions } from "@w-hite/album/server"
import { SSRComposeCoordinate as StartCoordinate, SSRComposeProject as StartProject } from "@w-hite/album/start"
import { createHash } from "crypto"
import { existsSync, readFileSync, rmSync } from "fs"
import { writeFile } from "fs/promises"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { SSRServerShared } from "../ssr/SSRServerShared"
import { SSRComposeCache, SSRComposeManifest } from "./ssr-compose.type"

const __dirname = dirname(fileURLToPath(import.meta.url))
const cachePath = resolve(__dirname, ".cache")

export async function loadCacheManifest(prefix: string, sourcePath: string, renderOptions: SSRComposeRenderRemoteComponentOptions) {
  const { ssrContext, ssrComposeContext } = renderOptions
  const { inputs } = ssrContext
  const { root } = inputs
  const { ssrComposeBuild, projectMap, ssrComposeRoot } = ssrComposeContext!
  const project = projectMap.get(prefix)
  if (!project) throw "资源不存在"

  if (import.meta.env.PROD) {
    const coordinateMap = project.coordinate as StartCoordinate
    if (!coordinateMap[sourcePath]) throw "资源不存在"

    const composeManifest = (await SSRServerShared.resolveContext(null as any)).ssrComposeManifest!
    if (!composeManifest[sourcePath]) {
      const { clientManifest, ssrManifest } = project as StartProject
      for (const key in coordinateMap) {
        const _key = coordinateMap[key]
        const value = clientManifest[_key]
        const ssrValue = ssrManifest[_key]
        composeManifest[key] = {
          importPath: `/${prefix}/${value.file}`,
          css: (value.css ?? []).map((file: string) => `/${prefix}/${file}`),
          filePath: resolve(root, prefix, "ssr", ssrValue.file)
        }
      }
    }

    return composeManifest
  }

  if (!import.meta.env.PROD) {
    const coordinateMap = project.coordinate
    const cacheManifestPath = resolve(cachePath, "ssr-compose.json")
    let cacheManifest: SSRComposeManifest | null = null
    if (existsSync(cacheManifestPath)) {
      try {
        cacheManifest = JSON.parse(readFileSync(cacheManifestPath, "utf-8")) as SSRComposeManifest
      } catch {
        rmSync(cachePath, { force: true, recursive: true })
      }
    }

    const coordinate = (coordinateMap as DevCoordinate)[sourcePath]
    if ("local" in project) {
      const { filepath, changed } = coordinate
      if (!filepath) throw "资源不存在"
      if (!cacheManifest || !cacheManifest[sourcePath] || changed) {
        const outDirName = createHash("md5").update(sourcePath).digest("hex")
        const outDir = resolve(cachePath, outDirName)
        await ssrComposeBuild({ coordinate, input: filepath, outDir })
        cacheManifest = await flushCacheManifest({
          start: false,
          cacheManifest,
          sourcePath,
          input: filepath,
          outDir
        })
      }
    } else {
      if (!coordinateMap[sourcePath]) throw "资源不存在"
      if (!cacheManifest || !cacheManifest[sourcePath]) {
        const { clientManifest, ssrManifest } = project
        const _key = coordinateMap[sourcePath]
        const value = clientManifest[_key]
        const ssrValue = ssrManifest[_key]
        const filePath = resolve(ssrComposeRoot, prefix, "ssr", ssrValue.file)
        if (!existsSync(filePath)) throw "资源不存在"
        cacheManifest = await flushCacheManifest({
          start: true,
          cacheManifest,
          sourcePath,
          cache: {
            importPath: `${ssrComposeRoot}/${prefix}/client/${value.file}`,
            css: (value.css ?? []).map((file: string) => `/${prefix}/${file}`),
            filePath
          }
        })
      }
    }
    return cacheManifest
  }
}

type FlushCacheManifestProps =
  | {
      start: false
      cacheManifest: SSRComposeManifest | null
      sourcePath: string
      input: string
      outDir: string
    }
  | {
      start: true
      cacheManifest: SSRComposeManifest | null
      sourcePath: string
      cache: SSRComposeCache
    }
export async function flushCacheManifest(props: FlushCacheManifestProps) {
  const { start, cacheManifest, sourcePath } = props
  let _cacheManifest = cacheManifest
  let _cache: SSRComposeCache
  if (start) {
    const { cache } = props
    _cache = cache
  } else {
    const cwd = process.cwd()
    const { input, outDir } = props
    const manifest = JSON.parse(readFileSync(resolve(outDir, ".vite/manifest.json"), "utf-8"))
    const cache: SSRComposeCache = (_cache = { filePath: input, importPath: "", css: [] })
    for (const key in manifest) {
      const v = manifest[key]
      if (v.isEntry) cache.importPath = resolve(outDir, v.file).slice(cwd.length)
      if (v.file.endsWith(".css")) cache.css.push(resolve(outDir, v.file).slice(cwd.length))
    }
  }

  if (_cacheManifest) _cacheManifest[sourcePath] = _cache!
  else _cacheManifest = { [sourcePath]: _cache! }
  await writeFile(resolve(cachePath, "ssr-compose.json"), JSON.stringify(_cacheManifest, null, 2), "utf-8")
  return _cacheManifest
}
