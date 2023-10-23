import { renderToPipeableStream } from "react-dom/server"
import { Writable } from "stream"
import { SSRComposeRenderRemoteComponentOptions } from "./ssr-compose.type"

export function renderComponentToString(
  filePath: string,
  renderOptions: SSRComposeRenderRemoteComponentOptions
) {
  return new Promise<{
    html: string
    serverDynamicData: Map<string, any>
  }>(async (resolve, reject) => {
    const serverDynamicData = new Map()
    const app = await buildRootComponent(
      filePath,
      serverDynamicData,
      renderOptions
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

async function buildRootComponent(
  filePath: string,
  serverDynamicData: Map<string, any>,
  renderOptions: SSRComposeRenderRemoteComponentOptions
) {
  const { ssrContextProps, ssrComposeContextProps } = renderOptions
  ssrContextProps.serverDynamicData = serverDynamicData

  const Component: any = await import(/*@vite-ignore*/ filePath).then(
    m => m.default
  )
  return (
    <SSRContext.Provider value={ssrContextProps}>
      <SSRComposeContext.Provider value={ssrComposeContextProps}>
        <Component {...ssrComposeContextProps.props} />
      </SSRComposeContext.Provider>
    </SSRContext.Provider>
  )
}
