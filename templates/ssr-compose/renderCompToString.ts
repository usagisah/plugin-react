import { renderToPipeableStream } from "react-dom/server"
import { Writable } from "stream"

export function renderComponentToString(app: any) {
  return new Promise<string>((resolve, reject) => {
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
        resolve(html)
      },
      onError(error) {
        reject(error)
      }
    })
  })
}
