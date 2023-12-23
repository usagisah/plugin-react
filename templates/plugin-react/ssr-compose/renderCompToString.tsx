import { SSRComposeRenderRemoteComponentOptions } from "@w-hite/album/server"
import { renderToPipeableStream } from "react-dom/server"
import { Writable } from "stream"
import { SSRContext } from "../ssr/SSRContext"
import { SSRComposeContext } from "./SSRComposeContext"

export function renderComponentToString(filePath: string, renderOptions: SSRComposeRenderRemoteComponentOptions) {
  return new Promise<Record<string, any>>(async (resolve, reject) => {
    const { renderProps, ssrContext, ssrComposeContext } = renderOptions
    const { serverDynamicData } = ssrContext
    const _serverDynamicData = (ssrContext.serverDynamicData = {})
    const Component: any = await import(/*@vite-ignore*/ filePath).then(m => m.default)
    const app = (
      <SSRComposeContext.Provider value={ssrComposeContext!}>
        <SSRContext.Provider value={ssrContext}>
          <Component {...renderProps.props} />
        </SSRContext.Provider>
      </SSRComposeContext.Provider>
    )

    let html = ""
    const writeStream = new Writable({
      write(chunk, _, cb) {
        html += chunk.toString()
        cb()
      }
    })
    const { pipe } = renderToPipeableStream(app, {
      onAllReady() {
        pipe(writeStream)
        ssrContext.serverDynamicData = serverDynamicData
        resolve({ serverDynamicData: _serverDynamicData, html })
      },
      onError(error) {
        reject(error)
      }
    })
  })
}
