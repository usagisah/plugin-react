import type { AlbumSSRContext, AlbumSSROptions } from "@w-hite/album/ssr"
import { createSSRRouter } from "./plugin-react/router/createSSRRouter"
import { readFileSync } from "fs"
import { resolve } from "path"
import { renderToPipeableStream } from "react-dom/server"
import { isPlainObject } from "./plugin-react/utils/type"
import { serverRoutes } from "./plugin-react/router/routes.ssr"
import { SSRContext } from "./plugin-react/ssr/SSRContext"
import userSsrEntry from "$mainServerPath$"

let staticInfo: {
  PreRender: any
  manifest: Record<string, any>
  mainEntryPath: string
}

export default async function ssrEntry(
  options: AlbumSSROptions,
  context: AlbumSSRContext
) {
  const { req, res } = options
  const { logger, inputs, mode } = context
  const {
    App = null,
    Head = null,
    data
  } = await (userSsrEntry as any)(createSSRRouter(req.url), options, context)

  const serverRouteData = {
    ...(await resolveRouteData(req.url, context)),
    ...(isPlainObject(data) ? data : {})
  }

  const serverDynamicData = new Map<string, any>()

  if (!staticInfo) buildStaticInfo(options, context)
  const { PreRender, mainEntryPath } = staticInfo

  const app = (
    <SSRContext.Provider
      value={{
        serverRouteData,
        serverDynamicData,
        req,
        logger,
        inputs,
        mode
      }}
    >
      <html lang="en">
        <head>
          <PreRender />
          {Head}
        </head>
        <body>{App}</body>
      </html>
    </SSRContext.Provider>
  )

  const { pipe } = renderToPipeableStream(app, {
    onShellReady() {
      res.header("content-type", "text/html")
      pipe(res)
    },
    onAllReady() {
      serverDynamicData.forEach((value, id) => {
        try {
          res.write(
            `<script type="text/json" id="server-data-${id}">${JSON.stringify(
              value
            )}</script>`
          )
        } catch {
          logger.error("server data must be serializable to JSON.stringify")
        }
      })
      if (Object.keys(serverRouteData).length > 0) {
        res.write(
          `<script type="text/json" id="server-router-data">${JSON.stringify(
            serverRouteData
          )}</script>`
        )
      }
      res.write(`<script type="module" src="${mainEntryPath}"></script>`)
    }
  })
}

async function resolveRouteData(url: string, { logger }: AlbumSSRContext) {
  let res: any = {}
  const route = serverRoutes.find(v => v.reg.test(url))
  if (route && route.actionFactory) {
    try {
      const mod: any = await route.actionFactory()
      if (!mod || !(typeof mod.default === "function")) {
        throw (
          "router-action export default is not a function at " +
          route.actionPath
        )
      }

      res = await mod.default()
      if (!isPlainObject(res)) {
        res = {}
      }
    } catch (e) {
      logger.error(e, "ssr")
    }
  }

  return res
}

function buildStaticInfo(options: AlbumSSROptions, context: AlbumSSRContext) {
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
      staticInfo.mainEntryPath = "$mainEntryPath$"
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
