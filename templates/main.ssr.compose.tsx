import {} from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { resolve } from "path"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { renderComponentToString } from "./ssr-compose/renderCompToString"
import { createHash } from "crypto"

/* 
    sourcePath,
    moduleRoot,
    viteComponentBuild,

    props,
    sources,
    serverRouteData
    albumSSROptions,
    albumSSRContext,

    ssrContextProps?
*/

const { __dirname } = createModulePath(import.meta.url)
const cachePath = resolve(__dirname, "ssr-compose/.cache")

export async function renderRemoteComponent(options: any) {
  const { sourcePath, moduleRoot, viteComponentBuild } = options

  try {
    const filePath = resolve(moduleRoot, sourcePath)
    if (!existsSync(filePath)) {
      throw "资源不存在"
    }

    let cacheManifest = await loadCacheManifest()
    if (
      !cacheManifest ||
      !cacheManifest[sourcePath] ||
      isChange(cacheManifest[sourcePath])
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
    const renderRes = await renderComponentToString(cacheInfo.filePath, options)
    return {
      status: "success",
      httpPath: cacheInfo.httpPath,
      preLoads: [
        ...renderRes.preloads,
        ...cacheInfo.preloads.map(value => ({ type: "css", value }))
      ],
      html: renderRes.html
    }
  } catch (error) {
    return { status: "fail", error }
  }
}

function isChange(cacheInfo: any) {
  if (!cacheInfo) return true
  return statSync(cacheInfo.originPath).atimeMs > cacheInfo.lastChange
}

async function loadCacheManifest() {
  const cacheManifestPath = resolve(cachePath, "ssr.compose.json")
  if (!existsSync(cacheManifestPath)) return null

  try {
    return JSON.parse(readFileSync(cacheManifestPath, "utf-8"))
  } catch {
    rmSync(cachePath, { force: true, recursive: true })
    return null
  }
}

async function flushCacheManifest(
  cacheManifest: any,
  sourcePath: string,
  input: string,
  outDir: string
) {
  const manifest = JSON.parse(
    readFileSync(resolve(outDir, "manifest.json"), "utf-8")
  )
  const cache: any = {
    lastChange: statSync(input).atimeMs,
    originPath: input,
    filePath: "",
    httpPath: "",
    preloads: []
  }
  for (const key of Object.getOwnPropertyNames(manifest)) {
    const value = manifest[key]
    if (value.isEntry) {
      cache.filePath = resolve(outDir, value.file)
      cache.httpPath = cache.filePath.slice(process.cwd().length)
    } else if (value.file.endsWith(".css")) {
      cache.preloads.push(
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
