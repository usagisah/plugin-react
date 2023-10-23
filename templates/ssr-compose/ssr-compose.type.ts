import { AlbumSSRContextProps } from "@w-hite/album/ssr"

export type SSRComposeSourceAssets = {
  css: Set<string>
}

export type SSRComposeSourceCache = {
  [props: string]:
    | {
        html: string
      }
    | false
}

export type SSRComposeSources = {
  [sourcePath: string]:
    | {
        httpPath: string
        assets: SSRComposeSourceAssets
        cache: SSRComposeSourceCache
      }
    | false
}

export type SSRComposeOptions = {
  moduleRoot: string
  viteComponentBuild: (props: {
    input: string
    outDir: string
  }) => Promise<void>
}

export type SSRComposeContextProps = {
  sources: SSRComposeSources
  ssrComposeOptions: SSRComposeOptions
  renderRemoteComponent: (renderProps: {
    sourcePath: string
    props: Record<string, any>
  }) => Promise<SSRComposeRenderRemoteComponentReturn>
}

/* --------------  -------------- */

export type SSRComposeCache = {
  lastChange: number
  originFilePath: string
  filePath: string
  httpPath: string
  assets: {
    css: string[]
  }
}

export type SSRComposeManifest = Record<string, SSRComposeCache>

export type SSRComposeRenderRemoteComponentOptions = {
  renderProps: {
    sourcePath: string
    props: Record<string, any>
  }
  ssrContextProps: AlbumSSRContextProps
  ssrComposeContextProps: SSRComposeContextProps
}

export type SSRComposeRenderRemoteComponentReturn = {
  httpPath: string
  serverDynamicData: AlbumSSRContextProps["serverDynamicData"]
  assets: SSRComposeCache["assets"]
  html: string
}
