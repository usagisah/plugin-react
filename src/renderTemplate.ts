import { readFile } from "fs/promises"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templates = new Map<string, string>()

export async function renderTemplate(filePath: string, params: Record<string, string>) {
  let file = templates.get(filePath)
  if (!file) {
    file = await readFile(resolve(__dirname, "../templates/" + filePath), "utf-8")
    templates.set(filePath, file)
  }
  for (const key in params) {
    const reg = new RegExp(`(['"])\\$` + key + `\\$\\1`)
    file = file.replace(reg, params[key]).replaceAll("// @ts-expect-error", "")
  }

  return file
}
