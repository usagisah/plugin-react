// @ts-nocheck
import { SSRContext } from "../plugin-react/ssr/SSRContext"
import { SSRComposeContext } from "./SSRComposeContext"
import { renderRemoteComponent as _renderRemoteComponent } from "../main.ssr.compose"
import { queryString } from "../plugin-react/utils/queryString"

export async function buildRootComponent(
  filePath: string,
  options: any,
  serverDynamicData: Map<string, any>
) {
  const {
    props,
    sources,
    serverRouteData,
    albumSSROptions,
    albumSSRContext,
    ssrContextProps
  } = options

  const { req, headers } = albumSSROptions
  const { logger, inputs, mode, meta, outputs, serverMode } = albumSSRContext
  const _ssrContextProps: any = ssrContextProps ?? {
    ssrSlideProps: {
      req,
      headers,
      mode,
      serverMode,
      logger,
      inputs,
      outputs,
      meta,
      query: resolveQuery(req.url),
      params: {}
    },
    serverRouteData,
    serverDynamicData: null
  }
  _ssrContextProps.serverDynamicData = serverDynamicData

  const _ssrComposeContextProps: any = {
    sources,
    renderRemoteComponent(props: any) {
      return _renderRemoteComponent({ ...options, ...props })
    }
  }

  const Component: any = await import(/*@vite-ignore*/ filePath).then(
    m => m.default
  )
  return (
    <SSRContext.Provider value={_ssrContextProps}>
      <SSRComposeContext.Provider value={_ssrComposeContextProps}>
        <Component {...props} />
      </SSRComposeContext.Provider>
    </SSRContext.Provider>
  )
}

function resolveQuery(url: string) {
  const index = url.indexOf("?")
  const search = index > -1 ? url.slice(index) : ""
  return queryString.parse(search)
}
