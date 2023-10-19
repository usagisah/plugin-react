import { execa } from "execa"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

await execa("npm", ["whoami"])

const pkgPath = resolve("package.json")
const pkgFile = readFileSync(pkgPath, "utf-8")
try {
  const pkg = JSON.parse(pkgFile)
  pkg.dependencies["@w-hite/album"] = "^0.2.0"
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8")
  await execa("npm", ["publish", "--access", "public"], {
    stdout: process.stdout,
    stderr: process.stderr
  })
} finally {
  writeFileSync(pkgPath, pkgFile)
}
