// @ts-nocheck
import { createElement, useContext } from "react"
import { SSRComposeContext } from "../SSRComposeContext"
import { SSRContext } from "../../plugin-react/ssr/SSRContext"
import { isString, isPlainObject } from "@w-hite/album/utils/check/check"

type RemoteAppLoaderProps = {
  type?: "component"
  remote?: boolean
  sourcePath: string
  wrapperName?: string
  wrapperProps?: Record<string, any>
  [key: string]: any
}

export function RemoteAppLoader(_props: RemoteAppLoaderProps) {
  const {
    type = "component",
    remote = false,
    sourcePath,
    wrapperName,
    wrapperProps,
    ...props
  } = _props
  const _sourcePath = !!remote + "_" + sourcePath
  if (!_sourcePath) {
  }

  if (import.meta.env.SSR) {
    const ssrContext = useContext(SSRContext)
    const { ssrSlideProps, serverRouteData } = ssrContext
    const { logger } = ssrSlideProps

    const composeContext = useContext(SSRComposeContext)
    const { sources, renderRemoteComponent } = composeContext

    const _props = JSON.stringify(props)
    const _source = sources[_sourcePath]
    if (_source && _source.props === _props) {
      return createElement(
        isString(wrapperName) && wrapperName.length > 0 ? wrapperName : "div",
        {
          ...(isPlainObject(wrapperProps) ? wrapperProps : {}),
          dangerouslySetInnerHTML: { __html: _source.html }
        }
      )
    }

    throw new Promise<void>(async resolve => {
      try {
        const res: any = await (remote
          ? fetch(sourcePath, {
              method: "post",
              body: JSON.stringify({
                props: _props
              }),
              headers: {
                "album-remote-source": ""
              }
            })
          : renderRemoteComponent({ sourcePath, props, sources, serverRouteData }))
        sources[_sourcePath] = {
          props: _props,
          html: res.html,
          preLoads: res.preLoads,
          httpPath: res.httpPath
        }
        resolve()
      } catch (e) {
        logger.error("拉取资源过程出现错误", e, "ssr-compose")
        sources[_sourcePath] = {
          props: _props,
          html: ""
        }
        resolve()
      }
    })
  }

  return null
}
