import { AlbumSSRRenderOptions } from "@w-hite/album/server"
import { isPlainObject } from "@w-hite/album/utils/check/simple"
import { renderToPipeableStream } from "react-dom/server"
import { createSSRRouter } from "../router/createSSRRouter"
import { SSRComposeContext } from "../ssr-compose/SSRComposeContext"
import { SSRContext } from "./SSRContext"
import { SSRServerShared } from "./SSRServerShared"
import { resolveActionRouteData } from "./resolveActionRouteData"
// @ts-expect-error
import userSsrEntry from "'$mainServerPath$'"
import { Writable } from "stream"

export async function ssrRender(renderOptions: AlbumSSRRenderOptions) {
  const { ssrContext, ssrComposeContext } = renderOptions
  const { logger, ssrCompose, req, res, serverRouteData, serverDynamicData } = ssrContext
  const { sendMode } = ssrContext.ssrRender
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
  if (ssrCompose) app = <SSRComposeContext.Provider value={ssrComposeContext!}>{app}</SSRComposeContext.Provider>

  const { pipe } = renderToPipeableStream(app, {
    onShellReady() {
      res.header("content-type", "text/html")
      if (sendMode === "pipe") pipe(res)
    },
    onAllReady() {
      let clientJsonData = ""
      for (const id of Object.getOwnPropertyNames(serverDynamicData)) {
        const value = serverDynamicData[id]
        try {
          clientJsonData += `<script type="text/json" id="server-data-${id}">${JSON.stringify(value)}</script>`
        } catch {
          logger.error("server-data 必须能够被 JSON.stringify 序列化", "失败信息", { id: value }, "ssrRender")
        }
      }
      if (Object.keys(serverRouteData).length > 0) {
        try {
          clientJsonData += `<script type="text/json" id="server-router-data">${JSON.stringify(serverRouteData)}</script>`
        } catch {
          logger.error("server-router-data 必须能够被 JSON.stringify 序列化", "失败信息", serverRouteData, "ssrRender")
        }
      }

      let clientScript = ""
      if (ssrCompose) {
        let cssCode = ""
        let jsCode = ""
        for (const sourcePath of Object.getOwnPropertyNames(sources)) {
          const source = sources![sourcePath]
          if (source === false) continue
          source.css.forEach(css => (cssCode += `{type:2,paths:["${css}"]},`))

          let importers = ""
          source.importPaths.forEach(p => (importers += `"${p}",`))
          jsCode += `{sid:"${sourcePath}",type:1,paths:[${importers}]},`
        }
        const loadCode = `const {loadModules}=window.__$_album_ssr_compose;const m=await loadModules([${cssCode + jsCode}]);`
        clientScript = `<script type="module">await import("${browserScript}");${loadCode}import("${mainEntryPath}");</script>`
      }

      if (sendMode === "string") {
        let code = ""
        pipe(
          new Writable({
            write(c, _, cb) {
              code += c.toString()
              cb()
            }
          })
        )
        const flag = "</head>"
        const index = code.indexOf(flag)
        if (index > -1) {
          res.send(code.replace(flag, flag + clientJsonData + clientScript))
        } else {
          res.send(clientJsonData + clientScript + code)
        }
      } else {
        res.write(clientJsonData + clientScript + `<script type="module" src="${mainEntryPath}"><\/script>`)
      }
    }
  })
}
