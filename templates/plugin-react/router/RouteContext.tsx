// @ts-nocheck
import { LocalData } from "@w-hite/album"
import { createContext } from "react"

export type RouteLoaderStage = "loading" | "success" | "fail"
export type RouteLoaderValue = { value: any, pending: ((stage: RouteLoaderStage, value: any) => any)[], stage: RouteLoaderStage }

export type RouteContextValue = {
  loader: Map<string, RouteLoaderValue>
  localData: LocalData
  parentContext?: RouteContextValue
}

export const RouteContext = createContext<RouteContextValue>(null as any)
