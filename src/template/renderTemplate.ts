import fg from "fast-glob"
import { readFileSync } from "fs"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const templates = scanTemplates()

async function scanTemplates() {
  const templates = new Map<string, string>()
  const cwd = resolve(__dirname, "../../templates")
  const files = await fg(cwd + "/**/*.{tsx,ts}")
  await Promise.all(
    files.map(async file => {
      templates.set(file.slice(cwd.length + 1), readFileSync(file, "utf-8").replace("// @ts-nocheck", ""))
    })
  )
  return templates
}

export async function renderTemplate(fileName: string, params: Record<string, string>) {
  const temp = await templates
  let file = temp.get(fileName)
  for (const key in params) {
    const reg = new RegExp(`(['"])\\$` + key + `\\$\\1`)
    file = file.replace(reg, params[key])
  }
  return file
}
