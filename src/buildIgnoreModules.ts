export type IgnoreModules = {
  rules?: (string | RegExp)[]
  disables?: {
    commonStart?: boolean
    underlineStart?: boolean
  }
}

const regCommonStart = /^commons/
const regUnderlineStart = /^_/

export function buildIgnoreModules(ignores?: IgnoreModules) {
  if (!ignores) ignores = {}

  const _ignores: RegExp[] = []

  const disables: IgnoreModules["disables"] = ignores.disables ?? {}
  if (disables.commonStart !== false) {
    _ignores.push(regCommonStart)
  }
  if (disables.underlineStart !== false) {
    _ignores.push(regUnderlineStart)
  }

  if (Array.isArray(ignores.rules)) {
    for (const rule of ignores.rules) {
      if (typeof rule === "string") {
        _ignores.push(new RegExp("^" + rule + "$"))
      }
      if (rule instanceof RegExp) {
        _ignores.push(rule)
      }
    }
  }

  return _ignores
}
