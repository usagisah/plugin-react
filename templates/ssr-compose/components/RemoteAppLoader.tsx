import { useContext } from "react"
import { SSRComposeContext } from "./SSRComposeContext"

type RemoteAppLoaderProps = {
  type?: "component"
  remote: boolean
  sourcePath: string
  wrapperName?: string
  wrapperProps?: Record<string, any>
  [key: string]: any
}

export function RemoteAppLoader(_props: RemoteAppLoaderProps) {
  const {
    type = "component",
    remote,
    sourcePath,
    wrapperName,
    wrapperProps,
    ...props
  } = _props
  if (import.meta.env.SSR) {
    const context = useContext(SSRComposeContext)
    const { renderRemoteComponent, sources, logger } = context
    if (sources[sourcePath]) {
      return
    }

    throw new Promise(async resolve => {
      const { status, httpEntry, preLoads, html, error } =
        await renderRemoteComponent({
          ...context,
          sourcePath,
          props,
          mountContext: false
        })
      if (status === "fail") {
        logger.error("拉取 remote-source error:", error, "ssr-compose")
        return resolve(null)
      }

      sources[sourcePath] = {
        html,
        preLoads,
        httpEntry
      }
      return resolve(null)
    })
  }

  return null
}
