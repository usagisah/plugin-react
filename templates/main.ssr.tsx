// @ts-nocheck
import type { AlbumSSRContext, AlbumSSROptions } from "@w-hite/album/ssr"
import { createSSRRouter } from "./plugin-react/router/createSSRRouter"
import { renderToPipeableStream } from "react-dom/server"
import { isPlainObject } from "./plugin-react/utils/type"
import { SSRContext } from "./plugin-react/ssr/SSRContext"
import { resolveActionRouteData } from "./plugin-react/ssr/resolveActionRouteData"
import { buildStaticInfo } from "./plugin-react/ssr/buildStaticInfo"
import userSsrEntry from "$mainServerPath$"

export default async function ssrEntry(
  options: AlbumSSROptions,
  context: AlbumSSRContext
) {
  const { req, res, headers } = options
  const { logger, inputs, mode, meta, outputs, serverMode } = context
  const ssrContextProps: any = {
    ssrSlideProps: {
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
    serverDynamicData: new Map()
  }
  const actionData = await resolveActionRouteData(ssrContextProps, context)
  const {
    App = null,
    Head = null,
    data
  } = await (userSsrEntry as any)(
    createSSRRouter(req.url),
    ssrContextProps.ssrSlideProps
  )
  const serverRouteData = (ssrContextProps["serverRouteData"] = {
    ...actionData,
    ...(isPlainObject(data) ? data : {})
  })
  const serverDynamicData = ssrContextProps.serverDynamicData
  const { PreRender, mainEntryPath } = buildStaticInfo(options, context)
  const app = (
    <SSRContext.Provider value={ssrContextProps}>
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
      serverDynamicData.forEach((value: any, id: string) => {
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
