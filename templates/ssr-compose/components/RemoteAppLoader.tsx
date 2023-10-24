import type { SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/ssr"
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
  [propKey: string]: any
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
    throw "缺少一个字符串类型的 sourcePath 参数"
  }

  if (import.meta.env.SSR) {
    const ssrContext = useContext(SSRContext)
    const { serverDynamicData, ssrSlideProps } = ssrContext
    const { logger } = ssrSlideProps

    const composeContext = useContext(SSRComposeContext)
    const { sources, renderRemoteComponent } = composeContext

    const _props = JSON.stringify(props)

    let _source = sources[_sourcePath]
    if (_source === false || (_source && _source.cache[_props] === false)) {
      return null
    }

    const _cache = _source?.cache[_props]
    if (_cache) {
      return createElement(
        isString(wrapperName) && wrapperName.length > 0 ? wrapperName : "div",
        {
          ...(isPlainObject(wrapperProps) ? wrapperProps : {}),
          dangerouslySetInnerHTML: { __html: _cache.html }
        }
      )
    }

    throw new Promise<void>(async resolve => {
      try {
        const res: SSRComposeRenderRemoteComponentReturn = await (remote
          ? fetch(sourcePath, {
              method: "post",
              body: JSON.stringify({
                props: _props
              }),
              headers: {
                "album-remote-source": ""
              }
            }).then(r => r.json())
          : renderRemoteComponent({ props, sourcePath }))
        Object.assign(serverDynamicData, res.serverDynamicData)
        if (!_source) {
          _source = sources[sourcePath] = {
            importPath: res.importPath,
            assets: {
              css: new Set()
            },
            cache: {}
          }
        }
        for (const value of res.assets.css) {
          _source.assets.css.add(value)
        }
        _source.cache[_props] = { html: res.html }
        resolve()
      } catch (e) {
        logger.error(
          `拉取资源过程出现错误，相关所有操作已被迫中断，回退到 null`,
          "失败的资源信息:",
          { sourcePath, props },
          "错误信息:",
          e,
          "ssr-compose"
        )
        if (!_source) {
          _source = sources[sourcePath] = false
        } else {
          _source.cache[_props] = false
        }
        resolve()
      }
    })
  }

  return null
}
