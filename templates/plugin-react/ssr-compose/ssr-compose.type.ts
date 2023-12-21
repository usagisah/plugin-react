export type SSRComposeCache = {
  filePath: string
  importPath: string
  assets: {
    css: string[]
  }
}

export type SSRComposeManifest = Record<string, SSRComposeCache>
