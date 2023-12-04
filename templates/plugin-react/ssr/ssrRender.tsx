import { AlbumSSRRenderOptions } from "@w-hite/album/ssr"
import { isPlainObject } from "@w-hite/album/utils/check/simple"
import { renderToPipeableStream } from "react-dom/server"
import { createSSRRouter } from "../router/createSSRRouter"
import { SSRComposeContext } from "../ssr-compose/SSRComposeContext"
import { SSRContext } from "./SSRContext"
import { SSRServerShared } from "./SSRServerShared"
import { resolveActionRouteData } from "./resolveActionRouteData"
// @ts-expect-error
import userSsrEntry from "'$mainServerPath$'"

export async function ssrRender(renderOptions: AlbumSSRRenderOptions) {
  const { ssrContext, ssrComposeContext } = renderOptions
  const { logger, ssrCompose, req, res, serverRouteData, serverDynamicData } = ssrContext
  const { sources } = ssrComposeContext ?? {}
  const { PreRender, mainEntryPath, browserScript } = await SSRServerShared.resolveContext(renderOptions)
  const { App = null, Head = null, data } = await (userSsrEntry as any)(createSSRRouter(req.originalUrl), ssrContext)

  Object.assign(serverRouteData, await resolveActionRouteData(ssrContext), isPlainObject(data) ? data : {})

  let app = (
    <SSRContext.Provider value={ssrContext}>
      <html lang="en">
        <head>
          <PreRender />
          {Head}
        </head>
        <body>{App}</body>
      </html>
    </SSRContext.Provider>
  )
  if (ssrCompose) app = <SSRComposeContext.Provider value={ssrComposeContext}>{app}</SSRComposeContext.Provider>

  const { pipe } = renderToPipeableStream(app, {
    onShellReady() {
      res.header("content-type", "text/html")
      pipe(res)
    },
    onAllReady() {
      for (const id of Object.getOwnPropertyNames(serverDynamicData)) {
        const value = serverDynamicData[id]
        try {
          res.write(`<script type="text/json" id="server-data-${id}">${JSON.stringify(value)}</script>`)
        } catch {
          logger.error("server-data 必须能够被 JSON.stringify 序列化", "失败信息", { id: value }, "ssrRender")
        }
      }

      if (Object.keys(serverRouteData).length > 0) {
        try {
          res.write(`<script type="text/json" id="server-router-data">${JSON.stringify(serverRouteData)}</script>`)
        } catch {
          logger.error("server-router-data 必须能够被 JSON.stringify 序列化", "失败信息", serverRouteData, "ssrRender")
        }
      }

      if (ssrCompose) {
        let script = ['<script type="module">', `await import("${browserScript}");`, "", `{import("${mainEntryPath}");}`, "</script>"]
        let promisesTemp = ""
        let mapTemp = ""
        let index = 0

        for (const sourcePath of Object.getOwnPropertyNames(sources)) {
          const source = sources[sourcePath]
          if (source === false) continue

          source.assets.css.forEach(css => res.write(`<link rel="stylesheet" href="${css}" />`))
          promisesTemp += `import("${source.importPath}"),`
          mapTemp += `["${sourcePath}", map[${index}].default],`
          index++
        }

        script[2] = `const map = await Promise.all([${promisesTemp}]);\nwindow.__$_album_ssr_compose.sources = new Map([${mapTemp}]);`
        res.write(script.join(""))
        return
      }

      res.write(`<script type="module" src="${mainEntryPath}"></script>`)
    }
  })
}
