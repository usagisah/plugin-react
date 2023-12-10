import { SSRComposeRenderRemoteComponentReturn } from "@w-hite/album/ssr"
import { isPlainObject, isString } from "@w-hite/album/utils/check/simple"
import { createElement, useContext } from "react"
import { SSRContext } from "../ssr/SSRContext"
import { SSRComposeContext } from "./SSRComposeContext"

type RemoteAppLoaderProps = {
  sourcePath: string
  wrapperName?: string
  wrapperProps?: Record<string, any>
  [propKey: string]: any
}

export function createRemoteAppLoader(props: { remote: boolean; url: string }) {
  const { remote, url } = props

  function RemoteAppLoader(_props: RemoteAppLoaderProps) {
    let { sourcePath, wrapperName, wrapperProps, ...props } = _props
    if (typeof sourcePath !== "string" || sourcePath.length === 0) throw "缺少一个字符串类型的 sourcePath 参数"
    if (sourcePath.startsWith("/")) sourcePath = sourcePath.slice(1)

    const _sourcePath = remote + "_" + sourcePath
    if (import.meta.env.SSR) {
      const ssrContext = useContext(SSRContext)
      const { serverDynamicData, req: request, res: response, headers, logger } = ssrContext

      const composeContext = useContext(SSRComposeContext)
      const { sources, renderRemoteComponent } = composeContext

      const _props = JSON.stringify(props)

      let _source = sources[_sourcePath]
      if (_source === false || (_source && _source.cache[_props] === false)) {
        return null
      }

      const _cache = _source?.cache[_props]
      if (_cache) {
        return createElement(isString(wrapperName) && wrapperName.length > 0 ? wrapperName : "div", {
          ...(isPlainObject(wrapperProps) ? wrapperProps : {}),
          dangerouslySetInnerHTML: { __html: _cache.html }
        })
      }

      throw new Promise<void>(async resolve => {
        try {
          let fetchUrl: string
          if (remote) {
            const _url = url.endsWith("/") ? url : url + "/"
            fetchUrl = _url + sourcePath
          }
          const res: SSRComposeRenderRemoteComponentReturn = await (remote
            ? fetch(fetchUrl!, {
                method: "post",
                body: JSON.stringify({ props }),
                headers: {
                  "album-remote-source": "",
                  "Content-Type": "application/json"
                }
              }).then(async r => {
                const res = await r.json()
                if (res.code !== 200) {
                  throw res.message
                }
                return res.result
              })
            : renderRemoteComponent({ props, sourcePath }, { req: request, res: response, headers }))
          Object.assign(serverDynamicData, res.serverDynamicData)
          if (!_source) {
            _source = sources[_sourcePath] = {
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
          logger.error(`拉取资源过程出现错误，相关所有操作已被迫中断，回退到 null`, "失败的资源信息:", JSON.stringify({ sourcePath, props }), "错误信息:", e, "ssr-compose")
          if (!_source) {
            _source = sources[_sourcePath] = false
          } else {
            _source.cache[_props] = false
          }
          resolve()
        }
      })
    }

    const w: any = globalThis.window
    if (!w["__$_album_ssr_compose"]) {
      const messages = "客户端无法找预加载的资源，请检查服务器配置是否存在问题"
      console.error("[error]", "ssr-compose -> ", messages)
      throw messages
    }

    const Component = w["__$_album_ssr_compose"].sources.get(_sourcePath)
    if (!Component) {
      console.error("[error]", "ssr-compose -> ", `无法找到匹配的资源（${sourcePath}），请检查服务器数据拉取是否存在问题`)
      return null
    }
    return createElement(isString(wrapperName) && wrapperName.length > 0 ? wrapperName : "div", {
      ...(isPlainObject(wrapperProps) ? wrapperProps : {}),
      children: createElement(Component, { ...props })
    })
  }
  return RemoteAppLoader
}
