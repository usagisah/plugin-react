// @ts-nocheck
import { useContext } from "react"
import { SSRContext } from "../ssr/SSRContext"

export async function useServer(fn: any) {
  if (import.meta.env.SSR) {
    const { ssrSlideProps } = useContext(SSRContext)
    try {
      if (!(typeof fn === "function")) {
        throw "fn must be Function"
      }

      await fn(ssrSlideProps)
    } catch (e: any) {
      ssrSlideProps.logger.error(e, "useServer")
    }
    return
  }
}
