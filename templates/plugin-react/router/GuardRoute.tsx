// @ts-nocheck
import type { GuardRouteProps, LocalData, GuardLoader } from "@w-hite/album"
import { queryString } from "@w-hite/album/utils/common/queryString"
import { useRoutesMap, RouterRoute } from "@w-hite/album"
import { callPromiseWithCatch } from "../utils/callWithCatch"
import { useContext, useEffect, useRef, useState } from "react"
import {
  useLocation,
  useParams,
  useNavigate,
  NavigateFunction,
  matchPath
} from "react-router-dom"
import {
  RouteContext,
  RouteContextValue,
  RouteLoaderValue
} from "./RouteContext"

export function GuardRoute(props: GuardRouteProps) {
  const { children, onEnter, route } = props

  const location = useLocation()
  const navigate = useNavigate()

  const parentContext = useContext(RouteContext)
  const local: LocalData = useRef<any>({}).current
  const context = useRef<RouteContextValue>({
    localData: local,
    parentContext: null,
    loader: null
  } as any).current

  const [Component, setComponent] = useState(
    !parentContext && onEnter ? null : children
  )

  if (parentContext) {
    Object.assign(local, parentContext.localData)
    local.route = route

    context.parentContext = parentContext
    context.loader = parentContext.loader
  } else {
    Object.assign(local, {
      ...location,
      params: useParams(),
      query: queryString.parse(location.search),
      route
    })
    context.loader = new Map()
  }

  useEffect(() => {
    _doEach()
  }, [location.pathname])

  if (import.meta.env.SSR) {
    _doEach()
  }

  function _doEach() {
    doEach({
      useComponent: { Component, setComponent },
      local,
      context,
      props,
      navigate
    })
  }

  return (
    <RouteContext.Provider value={context}>{Component}</RouteContext.Provider>
  )
}

type InnerRouteContext = {
  useComponent: { Component: any; setComponent: any }
  local: LocalData
  context: RouteContextValue
  props: GuardRouteProps
  navigate: NavigateFunction
}

async function doEach(ctx: InnerRouteContext) {
  const { useComponent, context, local, props, navigate } = ctx
  const { Component, setComponent } = useComponent
  if (!context.parentContext && props.onEnter) {
    const curPath = local.pathname
    const res = await callPromiseWithCatch(
      props.onEnter,
      [local, navigate],
      "GuardRoute-onEnter has a error"
    )
    if (res !== true || curPath !== context.localData.pathname) return
  } else if (Component !== props.children) {
    setComponent(props.children)
  }

  doLoader(ctx)
}

async function doLoader(ctx: InnerRouteContext) {
  const { context, local } = ctx
  if (context.parentContext) return

  const curPath = local.pathname
  const routesList = [...useRoutesMap()].find(([path]) =>
    matchPath(path, curPath)
  )!
  const loaderList = collectLoaders(routesList[1])
  await Promise.all([
    loaderList.map(async ([loaderFn, route]) => {
      const _options = context.loader.get(route.fullPath)
      if (_options && _options.stage === "loading") return

      let options: RouteLoaderValue
      context.loader.set(
        route.fullPath,
        (options = { stage: "loading", value: null, pending: [] })
      )
      try {
        options.value = await loaderFn(local)
        options.stage = "success"
      } catch (e) {
        options.value = e
        options.stage = "fail"
      }
      if (curPath !== context.localData.pathname) return
      for (const set of options.pending) {
        set(options.stage, options.value)
        options.pending.length = 0
      }
    })
  ])
}

function collectLoaders(
  route: any,
  loaders: any = []
): [GuardLoader, RouterRoute][] {
  const { meta, parent } = route
  if (meta && meta.loader) loaders.push([meta.loader, route])
  if (parent) return collectLoaders(parent, loaders)
  return loaders
}
