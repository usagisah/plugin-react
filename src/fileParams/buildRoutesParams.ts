export function buildRoutesParams(routes: any[]) {
  let str_defines = ""
  let str_imports = ""
  let str_useRoutes = "[" + nextRoute(routes, 0) + "]"
  function nextRoute(routes: any[], deep: number) {
    let _useRoute_code = ""
    for (const route of routes) {
      // import router meta
      let _import_meta = null
      if (route.router) {
        _import_meta = route.name + "_meta"
        str_imports += `import ${_import_meta} from "${route.router}"\n`
      }

      // lazy import component
      str_defines += `const ${route.name} = ${route.component}\n`

      // routers = []
      const childrenUseRoutes = nextRoute(route.children, deep + 1)
      const _component = deep === 0 ? `({onEnter}: any, route: any) => <GuardRoute route={route} onEnter={onEnter}>{${route.name}}</GuardRoute>` : `(_: any, route: any) => <GuardRoute route={route}>{${route.name}}</GuardRoute>`
      const _useRoute = "{" + [`parent: null`, `name: "${route.name}"`, `path: "${route.path}"`, `fullPath: "${route.fullPath}"`, `component: ${_component}`, `meta: ${_import_meta ?? "{}"}`, `children: [${childrenUseRoutes}]`].join(", ") + "},"
      _useRoute_code += _useRoute
    }
    return _useRoute_code
  }

  return { str_defines, str_imports, str_useRoutes }
}
