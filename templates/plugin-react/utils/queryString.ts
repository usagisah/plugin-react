const unlessStartReg = /^\??[#&=]?/

const trimDecode = (value: string) => {
  let res = ""
  try {
    const v1 = decodeURIComponent(value).trim()
    const v2 = unlessStartReg.exec(v1)
    if (v2) {
      res = v1.slice(v2[0].length)
    }
  } catch {}
  return res
}

const tryJson = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function parse(url: string) {
  const res: Record<string, any> = {}
  for (const item of trimDecode(url).split("&")) {
    const [k, v] = item.split("=")
    if (!k) continue
    res[k] = v ? tryJson(v) : ""
  }
  return res
}

export function stringify<T extends Object>(obj: T, prefix = "?"): string {
  const res: string[] = []
  for (const k in obj) {
    if (k === "" || !obj.hasOwnProperty(k)) continue

    let v: any = obj[k]
    if (isNaN(v) || v === undefined || v === null) v = ""
    v = encodeURIComponent(v)

    v === "" ? res.push(k) : res.push(k + "=" + v)
  }
  return prefix + res.join("&")
}

export const queryString = { parse, stringify }