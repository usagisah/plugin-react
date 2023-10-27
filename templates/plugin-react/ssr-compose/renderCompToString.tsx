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
    const { app, serverDynamicData } = await buildRootComponent(filePath, renderOptions)

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

async function buildRootComponent(filePath: string, renderOptions: SSRComposeRenderRemoteComponentOptions) {
  const { renderProps, ssrContextProps, ssrComposeContextProps } = renderOptions
  const serverDynamicData: ServerDynamicData = (ssrContextProps.serverDynamicData = {})

  const Component: any = await import(/*@vite-ignore*/ filePath).then(m => m.default)
  return {
    app: (
      <SSRContext.Provider value={ssrContextProps}>
        <SSRComposeContext.Provider value={ssrComposeContextProps}>
          <Component {...renderProps.props} />
        </SSRComposeContext.Provider>
      </SSRContext.Provider>
    ),
    serverDynamicData
  }
}
