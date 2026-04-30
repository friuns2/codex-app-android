const { existsSync, lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } = require('node:fs')
const { dirname, join } = require('node:path')
const { spawnSync } = require('node:child_process')

const PTY_PACKAGES = [
  'node-pty',
]

function packageRoot(name) {
  try {
    return dirname(require.resolve(`${name}/package.json`))
  } catch {
    return null
  }
}

function isBrokenSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink() && !existsSync(realpathSync(path))
  } catch {
    try {
      return lstatSync(path).isSymbolicLink() && !existsSync(path)
    } catch {
      return false
    }
  }
}

function patchMakefile(makefile) {
  const source = readFileSync(makefile, 'utf8')
  const patched = source.replace(
    /^cmd_copy = ln -f "\$<" "\$@" 2>\/dev\/null \|\| \(rm -rf "\$@" && cp -af "\$<" "\$@"\)$/m,
    'cmd_copy = rm -rf "$@" && cp -af "$<" "$@"',
  )
  if (patched !== source) {
    writeFileSync(makefile, patched)
  }
}

for (const name of PTY_PACKAGES) {
  const root = packageRoot(name)
  if (!root) continue

  const buildDir = join(root, 'build')
  const makefile = join(buildDir, 'Makefile')
  const binary = join(buildDir, 'Release', 'pty.node')
  if (!existsSync(makefile) || !isBrokenSymlink(binary)) continue

  try {
    patchMakefile(makefile)
    rmSync(binary, { force: true })
    const result = spawnSync('make', ['BUILDTYPE=Release', '-C', buildDir], {
      stdio: 'inherit',
    })
    if (result.status !== 0) {
      console.warn(`[postinstall] Failed to repair ${name} native PTY build`)
    }
  } catch (error) {
    console.warn(`[postinstall] Failed to repair ${name} native PTY build: ${error.message}`)
  }
}
