import * as esbuild from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const root = fileURLToPath(new URL('..', import.meta.url))
const cssPlugin = {
  name: 'dsh-plugin-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async ({ path: file }) => {
      const result = await esbuild.build({
        stdin: { contents: `import styles from ${JSON.stringify(file)}; export default styles`, resolveDir: root, loader: 'js' },
        bundle: true, write: false, format: 'esm', tsconfigRaw: {},
        // Each stylesheet is compiled separately: identifier minification would
        // restart at .a/.b in every module and cause cross-module collisions.
        loader: { '.css': 'local-css' }, outdir: 'out', minifySyntax: true, minifyWhitespace: true,
        minifyIdentifiers: false,
      })
      const js = result.outputFiles.find(f => f.path.endsWith('.js')).text
      const css = result.outputFiles.find(f => f.path.endsWith('.css')).text
      const id = `${pkg.name}/${path.basename(file)}`
      return {
        loader: 'js',
        contents: `${js}\nconst id = ${JSON.stringify(id)};\nif (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css=' + JSON.stringify(id) + ']')) {\nconst tag = document.createElement('style'); tag.dataset.plugin = ${JSON.stringify(pkg.name)}; tag.dataset.pluginCss = id; tag.textContent = ${JSON.stringify(css)}; document.head.appendChild(tag);\n}`,
      }
    })
  },
}
await mkdir(path.join(root, 'lib'), { recursive: true })
const result = await esbuild.build({
  absWorkingDir: root, entryPoints: ['src/client/index.ts'], bundle: true,
  write: false, format: 'cjs', platform: 'browser', target: 'es2022',
  tsconfigRaw: {}, jsx: 'automatic', external: ['@deepseek-ai/*', 'react', 'react/*'],
  plugins: [cssPlugin], legalComments: 'inline',
})
const client = `window.__ModuleLoader__.load({\n  id: ${JSON.stringify(pkg.name)},\n  factory: (require) => {\n    const module = { exports: {} };\n    const exports = module.exports;\n${result.outputFiles[0].text}\n    return module.exports;\n  }\n});\n`
await writeFile(path.join(root, 'lib/client.js'), client)
await esbuild.build({
  absWorkingDir: root, entryPoints: ['src/index.ts', 'src/invariant.ts'],
  bundle: true, format: 'esm', platform: 'node', target: 'es2022',
  tsconfigRaw: {}, external: ['@deepseek-ai/*'], outdir: 'lib',
})
console.log('Built Aqua host, invariant, and DSH module-loader client bundles.')
