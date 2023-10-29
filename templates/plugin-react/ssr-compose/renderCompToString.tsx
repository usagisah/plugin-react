import type { SSRComposeRenderRemoteComponentOptions, ServerDynamicData } from "@w-hite/album/ssr"

import { renderToPipeableStream } from "react-dom/server"
import { Writable } from "stream"
import { SSRContext } from "../ssr/SSRContext"
import { SSRComposeContext } from "./SSRComposeContext"

export function renderComponentToString(filePath: string, renderOptions: SSRComposeRenderRemoteComponentOptions) {
  return new Promise<{
    html: string
    serverDynamicData: ServerDynamicData
  }>(async (resolve, reject) => {
    const { renderProps, ssrRenderOptions, ssrComposeContextProps } = renderOptions
    const serverDynamicData: ServerDynamicData = (ssrRenderOptions.ssrContextOptions.serverDynamicData = {})
    const Component: any = await import(/*@vite-ignore*/ filePath).then(m => m.default)
    const app = (
      <SSRContext.Provider value={ssrRenderOptions.ssrContextOptions}>
        <SSRComposeContext.Provider value={ssrComposeContextProps}>
          <Component {...renderProps.props} />
        </SSRComposeContext.Provider>
      </SSRContext.Provider>
    )

    let html = ""
    const writeStream = new Writable({
      write(chunk, encoding, callback) {
        html += chunk.toString()
        callback()
      }
    })
    const { pipe } = renderToPipeableStream(app, {
      onAllReady() {
        pipe(writeStream)
        resolve({ html, serverDynamicData })
      },
      onError(error) {
        reject(error)
      }
    })
  })
}
