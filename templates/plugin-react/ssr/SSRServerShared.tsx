import { AlbumContext } from "@w-hite/album/server"
import { readFileSync } from "fs"
import { dirname, relative, resolve } from "path"
import { fileURLToPath } from "url"
import { SSRComposeManifest } from "../ssr-compose/ssr-compose.type"

type Props = {
  serverMode: AlbumContext["serverMode"]
  inputs: AlbumContext["inputs"]
  ssrCompose: boolean
}

export class SSRServerShared {
  PreRender: any
  manifest?: Record<string, any>
  mainEntryPath = ""

  __dirname = dirname(fileURLToPath(import.meta.url))
  root?: string
  browserScript?: string

  ssrComposeManifest?: SSRComposeManifest

  constructor(public props: Props) {}

  static shared: SSRServerShared
  static async resolveContext(props: Props) {
    if (SSRServerShared.shared) return SSRServerShared.shared
    const _c = (SSRServerShared.shared = new SSRServerShared(props))
    await _c.init()
    return _c
  }

  async init() {
    const { serverMode, inputs } = this.props
    if (serverMode === "start") {
      this.root = inputs.startInput
      this.buildStartStaticInfo()
      this.ssrComposeManifest = {}
    } else {
      this.buildDevStaticInfo()
    }
  }

  buildStartStaticInfo() {
    const file = readFileSync(resolve(this.__dirname!, "../client/manifest.json"), "utf-8")
    const manifest = (this.manifest = JSON.parse(file))
    const isSSRCompose = this.props.ssrCompose
    const { preLinks, entryFile } = renderPreLinks(this.props.ssrCompose ? `/${__app_id__}/` : "/", manifest)
    this.mainEntryPath = isSSRCompose ? `/${__app_id__}/${entryFile.file}` : "/" + entryFile.file
    this.browserScript = isSSRCompose ? `/${__app_id__}/browser.js` : "/browser.js"
    this.PreRender = () => (
      <>
        {preLinks.map((attrs: any, index: number) => (
          <link key={index} {...attrs} />
        ))}
      </>
    )
  }

  buildDevStaticInfo() {
    const { cwd, realClientInput, dumpInput } = this.props.inputs
    this.manifest = {}
    this.mainEntryPath = "/" + relative(cwd, realClientInput)
    this.browserScript = "/" + relative(cwd, resolve(dumpInput, "plugin-react/ssr-compose/browser.ts"))
    this.PreRender = () => (
      <>
        <script type="module" dangerouslySetInnerHTML={{ __html: `import { injectIntoGlobalHook } from "/@react-refresh";injectIntoGlobalHook(window);window.$RefreshReg$ = () => {};window.$RefreshSig$ = () => (type) => type;` }}></script>
        <script type="module" src="/@vite/client"></script>
      </>
    )
  }
}

export function renderPreLinks(prefix: string, manifest: Record<string, any>) {
  let preLinks: any[] = []
  let entryFile: any = {}
  for (const key in manifest) {
    const value = manifest[key]
    entryFile = value
    if (value.isEntry) {
      const preloadFiles = [...(value.assets ?? []), ...(value.css ?? [])]
      for (const path of preloadFiles) {
        const attr = renderLinkAttr(prefix + path)
        if (attr) preLinks.push(attr)
      }

      for (const filePath of value.imports ?? []) {
        const attr = renderLinkAttr(prefix + manifest[filePath].file)
        preLinks.push(attr)
      }
      break
    }
  }

  return { preLinks, entryFile }
}

export function renderLinkAttr(file: string) {
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
