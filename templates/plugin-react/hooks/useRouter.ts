import { useContext } from "react"
import { RouteContext } from "../router/RouteContext"

export function useRouter() {
  const ctx = useContext(RouteContext)
  return { ...ctx.localData }
}
