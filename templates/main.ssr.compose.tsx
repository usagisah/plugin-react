import {  } from "@w-hite/album/ssr"
import { createModulePath } from "@w-hite/album/utils/modules/createModulePath"
import { resolve } from "path"
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { renderComponentToString } from "./ssr-compose/renderCompToString"
import { createHash } from "crypto"
import { createElement } from "react"

const { __dirname } = createModulePath(import.meta.url)

export async function renderRemoteComponent(options: any) {
  const {
    sourcePath,
    props,
    inputs,
    mountContext,
    sources,
    viteComponentBuild,
    albumSSROptions,
    albumSSRContext,
    moduleRoot
  } = options
  const { cwd } = inputs
  // sourcePath props inputs.cwd  mountContext? 渲染主函数
  // filePath
  // 算哈希，改变要重新编译，不变直接使用
  // 返回 { html, preloads(css js image...) }
  // 外层注册信息
  // controller 直接返回；本地注册 source，继续往下
  //

  try {
    const filePath = resolve(moduleRoot, sourcePath)
    if (!existsSync(filePath)) {
      throw "资源不存在"
    }

    let cacheInfo = await loadCacheInfo()
    if (!cacheInfo || (cacheInfo && !isChange(cacheInfo, filePath))) {
      const outDirName = createHash("md5").update(sourcePath).digest("hex")
      const outDir = resolve(__dirname, "ssr-compose/.cache", outDirName)
      await viteComponentBuild({ input: filePath, outDir })
      cacheInfo = flushCacheInfo(cacheInfo, sourcePath, filePath, outDir)
    }

    const sourceCache = cacheInfo[sourcePath]
    const app = await buildRootComponent(mountContext, sourceCache.filePath)
    const html = await renderComponentToString(app)
    return {
      status: "success",
      httpPath: sourceCache.httpPath,
      preLoads: sourceCache.preloads,
      html
    }
  } catch (error) {
    return { status: "fail", error }
  }
}

function isChange(cacheTime: number, filePath: string) {
  return statSync(filePath).mtime.getTime() === cacheTime
}

async function buildRootComponent(mountContext: boolean, fileEntry: string) {
  return import(/*@vite-ignore*/fileEntry).then(m => createElement(m.default, null))
}

function loadCacheInfo() {
  const output = resolve(__dirname, "ssr-compose/.cache/ssr-compose.json")
  if (!existsSync(output)) {
    return null
  }

  try {
    const fileText = readFileSync(output, "utf-8")
    return JSON.parse(fileText)
  } catch {
    rmSync(resolve(__dirname, ".cache"), { force: true, recursive: true })
    return null
  }
}

function flushCacheInfo(cacheInfo: any, sourcePath: string, input: string, outDir: string) {
  if (cacheInfo) {
    return
  }

  const cache: any = {
    [sourcePath]: {
      lastTime: statSync(input).mtime.getTime(),
      filePath: "",
      httpPath: input.slice(process.cwd().length),
      preloads: [] 
    }
  }
  const manifest = JSON.parse(readFileSync(resolve(outDir, "manifest.json"), "utf-8"))
  for (const key of Object.getOwnPropertyNames(manifest)) {
    const value = manifest[key]
    if (value.isEntry) {
      cache[sourcePath].filePath = resolve(outDir, value.file)
    }
    else if (value.file.endsWith(".css")) {
      cache[sourcePath].preloads.push(resolve(outDir, value.file).slice(process.cwd().length))
    }
  }
  writeFileSync(resolve(outDir, "../ssr-compose.json"), JSON.stringify(cache, null, 2), "utf-8")
  return cache
}
