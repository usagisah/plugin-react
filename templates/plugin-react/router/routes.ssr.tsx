export type ServerRoute = {
  name: string
  reg: RegExp
  actionPath: string | null
  actionFactory: (() => Promise<unknown>) | null
}

export const serverRoutes: ServerRoute[] = [
$serverRoutesCode$
]