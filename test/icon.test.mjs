import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Window } from 'happy-dom'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('package exposes a self-contained SVG icon accepted by desktop manifest constraints', async () => {
  assert.equal(pkg.icon, 'icon.svg', 'desktop reads the top-level icon field, not dsh.client')
  assert.ok(pkg.files.includes(pkg.icon), 'npm/Git installation must include the artwork')
  assert.equal(pkg.exports['./package.json'], './package.json', 'Host must resolve the exported manifest')
  assert.equal(path.isAbsolute(pkg.icon), false)
  assert.equal(/^[A-Za-z][A-Za-z\d+.-]*:/.test(pkg.icon), false)
  const resolved = await realpath(path.join(root, pkg.icon))
  assert.equal(path.dirname(resolved), await realpath(root))
  assert.ok((await stat(resolved)).isFile())
  const bytes = await readFile(resolved)
  assert.ok(bytes.length < 256 * 1024, 'Host rejects icons over 256 KiB')
  const svg = bytes.toString('utf8')
  const window = new Window()
  try {
    const document = new window.DOMParser().parseFromString(svg, 'image/svg+xml')
    const artwork = document.documentElement
    assert.equal(artwork.tagName.toLowerCase(), 'svg')
    assert.equal(artwork.getAttribute('xmlns'), 'http://www.w3.org/2000/svg')
    assert.equal(artwork.getAttribute('viewBox'), '0 0 64 64')
    assert.equal(document.querySelector('parsererror'), null)
    assert.equal(document.querySelector('script, foreignObject, image, use'), null, 'icon must not depend on external resources/code')
    assert.doesNotMatch(svg, /\son\w+\s*=|\b(?:href|src)\s*=|@import|url\(\s*['"]?(?:https?:|data:)/i)
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const [, id] of svg.matchAll(/url\(#([^)]*)\)/g)) {
      assert.ok(ids.includes(id), `unresolved paint/clip reference ${id}`)
    }
    assert.ok(document.querySelectorAll('path').length > 0)
  } finally {
    await window.happyDOM.close()
  }
})
