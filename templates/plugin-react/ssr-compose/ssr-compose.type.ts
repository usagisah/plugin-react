export type SSRComposeCache = {
  lastChange: number
  filePath: string
  importPath: string
  assets: {
    css: string[]
  }
}

export type SSRComposeManifest = Record<string, SSRComposeCache>
