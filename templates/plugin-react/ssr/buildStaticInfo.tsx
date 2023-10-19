import { AlbumSSRContext, AlbumSSROptions } from "@w-hite/album/ssr"
import { readFileSync } from "fs"
import { resolve } from "path"

let staticInfo: {
  PreRender: any
  manifest: Record<string, any>
  mainEntryPath: string
}

export function buildStaticInfo(
  options: AlbumSSROptions,
  context: AlbumSSRContext
) {
  if (staticInfo) return staticInfo
  const { mode, outputs } = context
  const { clientOutDir } = outputs

  staticInfo = {} as any

  switch (mode) {
    case "production": {
      const file = readFileSync(resolve(clientOutDir, "manifest.json"), "utf-8")
      const manifest = (staticInfo.manifest = JSON.parse(file))
      const { preLinks, entryFile } = buildPreLinks(manifest)
      staticInfo.PreRender = () => (
        <>
          {preLinks.map((attrs: any, index: number) => (
            <link key={index} {...attrs} />
          ))}
        </>
      )
      staticInfo.manifest = manifest
      staticInfo.mainEntryPath = "/" + entryFile.file
      break
    }
    case "development": {
      staticInfo.mainEntryPath = ".album/main.tsx"
      staticInfo.PreRender = () => (
        <>
          <script
            type="module"
            dangerouslySetInnerHTML={{
              __html:
                'import { injectIntoGlobalHook } from "/@react-refresh";injectIntoGlobalHook(window);window.$RefreshReg$ = () => {};window.$RefreshSig$ = () => (type) => type;'
            }}
          ></script>
          <script type="module" src="/@vite/client"></script>
        </>
      )
      break
    }
    default: {
      staticInfo.PreRender = () => null
    }
  }

  return staticInfo
}

function buildPreLinks(manifest: Record<string, any>) {
  let preLinks: any[] = []
  let entryFile: any = {}
  for (const key in manifest) {
    const value = manifest[key]
    entryFile = value
    if (value.isEntry) {
      const preloadFiles = [...(value.assets ?? []), ...(value.css ?? [])]
      for (const path of preloadFiles) {
        const attr = renderLinkArrAttr(path)
        if (attr) preLinks.push(attr)
      }

      for (const filePath of value.imports ?? []) {
        const attr = renderLinkArrAttr(manifest[filePath].file)
        preLinks.push(attr)
      }
      break
    }
  }

  function renderLinkArrAttr(file: string) {
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

  return { preLinks, entryFile }
}
