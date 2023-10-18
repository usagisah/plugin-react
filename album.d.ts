import "@w-hite/album"
import { ReactNode } from "react"
import { NavigateFunction, Location } from "react-router-dom"

declare module "@w-hite/album" {
  export type FC<P = {}> = {
    (props: P & { children?: ReactNode; [key: string]: any }, context?: any):
      | ReactNode
      | JSX.Element
    [key: string]: any
  }

  export type GuardOnEnter = (
    params: LocalData,
    navigate: NavigateFunction
  ) => any

  export type GuardLoader = (local: LocalData) => any

  export type GuardRouteProps = {
    children?: any
    onEnter?: GuardOnEnter
    route: RouterRoute
  }

  export type LocalData = Location & {
    params: Record<string, any>
    query: Record<string, any>
    route: RouterRoute
    [key: string]: any
  }

  export type AppRouterFC = FC<{ Layout: FC<any>; onEnter?: GuardOnEnter }>
}