import type {
  AlbumSSRContext,
  AlbumSSROptions,
  AlbumSSRContextProps
} from "@w-hite/album/ssr"
import { createSSRRouter } from "./plugin-react/router/createSSRRouter"
import { renderToPipeableStream } from "react-dom/server"
import { isPlainObject } from "./plugin-react/utils/type"
import { SSRContext } from "./plugin-react/ssr/SSRContext"
import { resolveActionRouteData } from "./plugin-react/ssr/resolveActionRouteData"
import { buildStaticInfo } from "./plugin-react/ssr/buildStaticInfo"
import { renderRemoteComponent as _renderRemoteComponent } from "./main.ssr.compose"
import userSsrEntry from "$mainServerPath$"
import { SSRComposeContext } from "./ssr-compose/SSRComposeContext"
import {
  SSRComposeContextProps,
  SSRComposeOptions
} from "./ssr-compose/ssr-compose.type"

export default async function ssrEntry(
  options: AlbumSSROptions,
  context: AlbumSSRContext,
  composeOptions: SSRComposeOptions
) {
  const { req, res, headers } = options
  const { logger, inputs, mode, meta, outputs, serverMode, ssrCompose } =
    context
  const ssrContextProps: AlbumSSRContextProps = {
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

  let ssrComposeContextProps: SSRComposeContextProps | null = null
  {
    if (composeOptions) {
      function renderRemoteComponent (renderProps: any){
        return _renderRemoteComponent({
          renderProps,
          ssrContextProps,
          ssrComposeContextProps: ssrComposeContextProps!
        })
      }
      ssrComposeContextProps = {
        sources: {},
        renderRemoteComponent,
        ssrComposeOptions: composeOptions
      } as SSRComposeContextProps
    }
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
  let app = (
    <html lang="en">
      <head>
        <PreRender />
        {Head}
      </head>
      <body>{App}</body>
    </html>
  )
  {
    app = <SSRContext.Provider>{app}</SSRContext.Provider>
    if (ssrComposeContextProps) {
      app = (
        <SSRComposeContext.Provider value={ssrComposeContextProps}>
          {app}
        </SSRComposeContext.Provider>
      )
    }
  }
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

      if (ssrComposeContextProps) {
        let promisesTemp = ""
        let mapTemp = ""
        let index = 0

        const { sources } = ssrComposeContextProps
        for (const sourcePath of Object.getOwnPropertyNames(sources)) {
          const source = sources[sourcePath]
          if (source === false) continue

          source.assets.css.forEach(css => {
            res.write(`<link rel="stylesheet" href="${css}">`)
          })
          
          promisesTemp += `import("${source.httpPath}"),`
          mapTemp += `["${sourcePath}", map[${index}].default],`
          index++
        }

        res.write(`<script type="module">const map = await Promise.all([${promisesTemp}]);window.__$_album_ssr_compose_remote_map = new Map([${mapTemp};</script>`)
      }

      res.write(`<script type="module" src="${mainEntryPath}"></script>`)
    }
  })
}
