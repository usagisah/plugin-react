export type ServerRoute = {
  name: string
  reg: RegExp
  fullPath: string
  actionPath: string | null
  actionFactory: (() => Promise<unknown>) | null
}

export const serverRoutes: ServerRoute[] = [
  // @ts-expect-error
  "$serverRoutesCode$"
]
