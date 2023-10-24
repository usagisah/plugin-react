export type SSRComposeCache = {
  lastChange: number
  originFilePath: string
  filePath: string
  importPath: string
  assets: {
    css: string[]
  }
}

export type SSRComposeManifest = Record<string, SSRComposeCache>
