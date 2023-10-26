// @ts-ignore
import userSsrEntry from "'$mainServerPath$'"
import type { AlbumSSRContextProps, AlbumSSRRenderOptions, SSRComposeContextProps } from "@w-hite/album/ssr"
import { SSRServerContext } from "./SSRServerContext"
import { isPlainObject } from "@w-hite/album/utils/utils"
import { renderToPipeableStream } from "react-dom/server"
import { renderRemoteComponent } from "../ssr-compose/renderRemoteComponent"
import { createSSRRouter } from "../router/createSSRRouter"
import { SSRContext } from "./SSRContext"
import { resolveActionRouteData } from "./resolveActionRouteData"
import { SSRComposeContext } from "../ssr-compose/SSRComposeContext"

export async function ssrRender(renderOptions: AlbumSSRRenderOptions) {
  const { PreRender, mainEntryPath, browserScript } = SSRServerContext.ctx
  const { context, ssrOptions, ssrComposeOptions } = renderOptions
  const { req, res, headers } = ssrOptions
  const { logger, inputs, mode, meta, outputs, serverMode } = context
  const pathname = (req as any).albumOptions.pathname
  const ssrContextProps: AlbumSSRContextProps = {
    ssrSlideProps: {
      pathname,
      req,
      headers,
      mode,
      serverMode,
      logger,
      inputs,
      outputs,
      meta,
      query: {},
      params: {}
    },
    serverRouteData: {},
    serverDynamicData: {}
  }
  const actionData = await resolveActionRouteData(ssrContextProps, context)
  const { App = null, Head = null, data } = await (userSsrEntry as any)(createSSRRouter(pathname), ssrContextProps.ssrSlideProps)
  const serverRouteData = (ssrContextProps["serverRouteData"] = {
    ...actionData,
    ...(isPlainObject(data) ? data : {})
  })
  const serverDynamicData = ssrContextProps.serverDynamicData
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
          ssrContextProps,
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
    app = <SSRContext.Provider value={ssrContextProps}>{app}</SSRContext.Provider>
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
