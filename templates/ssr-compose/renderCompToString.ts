import { renderToPipeableStream } from "react-dom/server"
import { Writable } from "stream"
import { buildRootComponent } from "./buildRootComponent"

export function renderComponentToString(filePath: string, options: any) {
  return new Promise<any>(async (resolve, reject) => {
    const serverDynamicData = new Map()
    const app = await buildRootComponent(filePath, options, serverDynamicData)

    let html = ""
    let preloads: any[] = []
    const writeStream = new Writable({
      write(chunk, encoding, callback) {
        html += chunk.toString()
        callback()
      }
    })
    const { pipe } = renderToPipeableStream(app, {
      onAllReady() {
        pipe(writeStream)

        serverDynamicData.forEach((value: any, id: string) => {
          preloads.push({
            type: "serverData",
            value: `<script type="text/json" id="server-data-${id}">${JSON.stringify(
              value
            )}</script>`
          })
        })

        resolve({ html, preloads })
      },
      onError(error) {
        reject(error)
      }
    })
  })
}
