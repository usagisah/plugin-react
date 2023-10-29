// @ts-ignore
import userSsrEntry from "'$mainServerPath$'"
import type { AlbumSSRRenderOptions, SSRComposeContextProps } from "@w-hite/album/ssr"
import { isPlainObject } from "@w-hite/album/utils/utils"
import { renderToPipeableStream } from "react-dom/server"
import { createSSRRouter } from "../router/createSSRRouter"
import { SSRComposeContext } from "../ssr-compose/SSRComposeContext"
import { renderRemoteComponent } from "../ssr-compose/renderRemoteComponent"
import { SSRContext } from "./SSRContext"
import { SSRServerShared } from "./SSRServerShared"
import { resolveActionRouteData } from "./resolveActionRouteData"

export async function ssrRender(renderOptions: AlbumSSRRenderOptions) {
  const { ssrComposeOptions, ctlOptions, serverContext, ssrContextOptions } = renderOptions
  const { req, res } = ctlOptions
  const { logger, inputs, serverMode, configs } = serverContext
  const { ssrCompose } = configs
  const { PreRender, mainEntryPath, browserScript } = await SSRServerShared.resolveContext({ inputs, serverMode, ssrCompose: !!ssrCompose })
  const actionData = await resolveActionRouteData(ssrContextOptions, serverContext)
  const { App = null, Head = null, data } = await (userSsrEntry as any)(createSSRRouter(req.originalUrl), ssrContextOptions.ssrSlideProps)
  const serverRouteData = (ssrContextOptions["serverRouteData"] = {
    ...actionData,
    ...(isPlainObject(data) ? data : {})
  })
  const serverDynamicData = ssrContextOptions.serverDynamicData
  let app = (
    <html lang="en">
      <head>
        <PreRender />
        {Head}
      </head>
      <body>{App}</body>
    </html>
  )
  let ssrComposeContextProps: SSRComposeContextProps | null = null
  {
    if (ssrComposeOptions) {
      async function _renderRemoteComponent(renderProps: any) {
        return renderRemoteComponent({
          renderProps,
          ssrRenderOptions: {
            ctlOptions,
            serverContext,
            ssrComposeOptions,
            ssrContextOptions
          },
          ssrComposeContextProps: ssrComposeContextProps!
        })
      }
      ssrComposeContextProps = {
        sources: {},
        renderRemoteComponent: _renderRemoteComponent,
        ssrComposeOptions
      } as SSRComposeContextProps

      app = <SSRComposeContext.Provider value={ssrComposeContextProps}>{app}</SSRComposeContext.Provider>
    }
    app = <SSRContext.Provider value={ssrContextOptions}>{app}</SSRContext.Provider>
  }

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

      if (ssrComposeContextProps) {
        res.write(`<script type="module" src="${browserScript}"></script>`)

        let script = ['<script type="module">', "", "</script>"]
        let promisesTemp = ""
        let mapTemp = ""
        let index = 0

        const { sources } = ssrComposeContextProps
        for (const sourcePath of Object.getOwnPropertyNames(sources)) {
          const source = sources[sourcePath]
          if (source === false) continue

          source.assets.css.forEach(css => {
            res.write(`<link rel="stylesheet" href="${css}" />`)
          })

          promisesTemp += `import("${source.importPath}"),`
          mapTemp += `["${sourcePath}", map[${index}].default],`
          index++
        }

        if (index > 0) {
          script[1] = `const map = await Promise.all([${promisesTemp}]);\nwindow.__$_album_ssr_compose.sources = new Map([${mapTemp}]);`
        }
        res.write(script.join(""))
      }

      res.write(`<script type="module" src="${mainEntryPath}"></script>`)
    }
  })
}
