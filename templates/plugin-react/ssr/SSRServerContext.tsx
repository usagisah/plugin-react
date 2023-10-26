import { AlbumContext } from "@w-hite/album/server"
import { readFileSync } from "fs"
import { dirname, relative, resolve } from "path"
import { fileURLToPath } from "url"
import { SSRComposeManifest } from "../ssr-compose/ssr-compose.type"
import { transformCoordinate } from "../ssr-compose/cacheManifest"

export class SSRServerContext {
  PreRender: any
  manifest: Record<string, any>
  mainEntryPath: string

  __dirname?: string
  root?: string
  browserScript?: string

  ssrComposeManifest?: SSRComposeManifest

  constructor(public ctx: AlbumContext) {}

  static ctx: SSRServerContext
  static async setContext(ctx: AlbumContext) {
    if (SSRServerContext.ctx) return
    const _c = (SSRServerContext.ctx = new SSRServerContext(ctx))
    await _c.init()
  }

  async init() {
    const { serverMode, inputs } = this.ctx
    const { cwd, dumpInput } = inputs

    if (serverMode === "start") {
      this.root = inputs.startInput
      this.browserScript = resolve(this.__dirname, "browser.js")
      this.__dirname = dirname(fileURLToPath(import.meta.url))
      this.buildStartStaticInfo()
      this.ssrComposeManifest = await transformCoordinate(this)
    } else {
      this.browserScript = relative(cwd, resolve(dumpInput, "plugin-react/ssr-compose/browser.ts"))
      this.buildDevStaticInfo()
    }
  }

  buildStartStaticInfo() {
    const file = readFileSync(resolve(this.__dirname, "../client/manifest.json"), "utf-8")
    const manifest = (this.manifest = JSON.parse(file))

    const { preLinks, entryFile } = renderPreLinks(manifest)
    this.mainEntryPath = "/" + entryFile.file
    this.PreRender = () => (
      <>
        {preLinks.map((attrs: any, index: number) => (
          <link key={index} {...attrs} />
        ))}
      </>
    )
  }

  buildDevStaticInfo() {
    this.manifest = {}
    this.mainEntryPath = "/.album/main.tsx"
    this.PreRender = () => (
      <>
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: 'import { injectIntoGlobalHook } from "/@react-refresh";injectIntoGlobalHook(window);window.$RefreshReg$ = () => {};window.$RefreshSig$ = () => (type) => type;'
          }}
        ></script>
        <script type="module" src="/@vite/client"></script>
      </>
    )
  }
}

export function renderPreLinks(manifest: Record<string, any>) {
  let preLinks: any[] = []
  let entryFile: any = {}
  for (const key in manifest) {
    const value = manifest[key]
    entryFile = value
    if (value.isEntry) {
      const preloadFiles = [...(value.assets ?? []), ...(value.css ?? [])]
      for (const path of preloadFiles) {
        const attr = renderLinkAttr(path)
        if (attr) preLinks.push(attr)
      }

      for (const filePath of value.imports ?? []) {
        const attr = renderLinkAttr(manifest[filePath].file)
        preLinks.push(attr)
      }
      break
    }
  }

  return { preLinks, entryFile }
}

export function renderLinkAttr(file: string) {
  file = "/" + file

  if (file.endsWith(".js")) {
    return { rel: "modulepreload", href: file, crossOrigin: "true" }
  } else if (file.endsWith(".css")) {
    return { rel: "stylesheet", href: file }
  } else if (file.endsWith(".gif")) {
    return { rel: "preload", as: "image", type: "image/gif", href: file }
  } else if (file.endsWith(".jpg") || file.endsWith(".jpeg")) {
    return { rel: "preload", as: "image", type: "image/jpeg", href: file }
  } else if (file.endsWith(".png")) {
    return { rel: "preload", as: "image", type: "image/png", href: file }
  }
}
