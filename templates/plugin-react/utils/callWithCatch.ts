export const ErrorEmpty = Symbol()

export function callWithCatch(fn: any, params: any[], prefix: string) {
  try {
    return fn.apply(globalThis, params)
  } catch (e) {
    console.error(prefix, e)
  }
  return ErrorEmpty
}

export async function callPromiseWithCatch(fn: any, params: any[], prefix: string) {
  try {
    return await Promise.resolve(fn.apply(globalThis, params))
  } catch (e) {
    console.error(prefix, e)
    return null
  }
}
