import { createRemoteAppLoader } from "./RemoteAppLoader"

const _w: any = window
_w.__$_album_ssr_compose = {
  sources: new Map(),
  createRemoteAppLoader,
  loadModules
}

const loadMap: Record<string, any> = {}
// type 1-js 2-css
async function loadModules(mods: { sid?: string; type: 1 | 2; paths: string[] }[]) {
  const { sources } = _w.__$_album_ssr_compose
  const promises = mods.map(({ sid, type, paths }) => {
    const ps = paths.map(path => {
      const id = type + "_" + path
      if (id in loadMap) return
      loadMap[id] = true

      const link = document.createElement("link")
      if (type === 1) {
        link.rel = "modulepreload"
        link.as = "script"
        link.crossOrigin = ""
        link.href = path
        document.head.appendChild(link)
        return import(/*@vite-ignore*/ path)
          .then(r => sources.set(sid, r.default))
          .catch(e => {
            sources.set(sid, null)
            console.error(`加载远程资源失败:(js-${path})`)
            console.error(e)
          })
      } else if (type === 2) {
        link.rel = "stylesheet"
        link.href = path
        document.head.appendChild(link)
        return new Promise(r => {
          link.addEventListener("load", r)
          link.addEventListener("error", () => {
            console.error(`加载远程资源失败:(css-${path})`)
            r(null)
          })
        })
      } else {
        throw "未知的加载格式"
      }
    })
    return Promise.allSettled(ps)
  })
  await Promise.all(promises)
}
