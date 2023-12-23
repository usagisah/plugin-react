export type SSRComposeCache = {
  filePath: string
  importPath: string
  css: string[]
}

export type SSRComposeManifest = Record<string, SSRComposeCache>
