export type ClientRoute = {
  name: string
  path: string
  fullPath: string
  component: string
  router: string
  children: ClientRoute[]
}

export type ServerRoute = {
  name: string
  reg: RegExp
  path: string
  fullPath: string
  actionPath?: string
  children: ServerRoute[]
}

export type ParseRouteContext = {
  dumpInput: string
  parentClientPath: string
  parentServerPath: string
}
