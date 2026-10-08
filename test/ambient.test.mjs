import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { Window } from 'happy-dom'

const meshBundle = await build({
  entryPoints: [new URL('../src/client/mesh.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'iife', globalName: 'meshEngine',
  platform: 'browser', target: 'es2022', tsconfigRaw: {},
})

function mountMeshFixture(reduced) {
  const window = new Window({ url: 'http://localhost/' })
  const frames = new Map()
  let frameId = 0
  window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId }
  window.cancelAnimationFrame = id => frames.delete(id)
  window.matchMedia = () => ({ matches: reduced })
  window.IntersectionObserver = class { observe() {} disconnect() {} }
  const fills = []
  const strokes = []
  const ctx = {
    globalAlpha: 1,
    setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    fillRect() {
      const alpha = Number(/,\s*([\d.]+)\)$/.exec(this.fillStyle)[1])
      fills.push(alpha * this.globalAlpha)
    },
    stroke() { strokes.push(Number(/,\s*([\d.]+)\)$/.exec(this.strokeStyle)[1])) },
  }
  window.HTMLCanvasElement.prototype.getContext = () => ctx
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { configurable: true, get: () => 360 })
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { configurable: true, get: () => 270 })
  vm.runInContext(meshBundle.outputFiles[0].text, vm.createContext(window))
  const handle = window.meshEngine.mountMesh(window.document.body)
  const frame = () => {
    const [id, callback] = frames.entries().next().value
    frames.delete(id)
    callback(1000)
  }
  return { window, ctx, handle, fills, strokes, frame }
}

test('mesh draws the requested node alpha once in both animated and static modes', async () => {
  for (const reduced of [false, true]) {
    const fixture = mountMeshFixture(reduced)
    try {
      if (!reduced) fixture.frame()
      assert.ok(fixture.fills.length > 0)
      assert.ok(fixture.strokes.length > 0)
      assert.ok(fixture.fills.every(alpha => alpha === 0.3), 'node alpha must be 0.3, not 0.3 squared')
      assert.ok(fixture.strokes.every(alpha => alpha === 0.15))
      assert.equal(fixture.ctx.globalAlpha, 1)
    } finally {
      fixture.handle.dispose()
      await fixture.window.happyDOM.close()
    }
  }
})

test('brightness veil is above the fluid but below all ambient decorations', async () => {
  const source = await readFile(new URL('../src/client/aqua.module.css', import.meta.url), 'utf8')
  const css = (await build({
    stdin: { contents: source, loader: 'css' }, write: false, tsconfigRaw: {},
  })).outputFiles[0].text
  const window = new Window({ url: 'http://localhost/' })
  try {
    window.document.documentElement.setAttribute('data-dsh-aqua', '')
    window.document.head.innerHTML = `<style>${css}</style>`
    window.document.body.innerHTML = `<div data-dsh-aqua-ambient>
      <canvas data-dsh-aqua-fluid-canvas></canvas>
      <div data-dsh-aqua-whale data-scheme="light"><canvas></canvas></div>
      <canvas data-dsh-aqua-mesh></canvas><svg data-aqua-critter="fish"></svg>
    </div>`
    const ambient = window.document.querySelector('[data-dsh-aqua-ambient]')
    assert.equal(window.getComputedStyle(ambient).zIndex, '-1', 'decorations stay behind the foreground UI')
    assert.equal(window.getComputedStyle(ambient).pointerEvents, 'none')
    assert.match(css, /\[data-dsh-aqua-ambient\]::after\s*\{[^}]*z-index: 1;/)
    assert.equal(window.getComputedStyle(window.document.querySelector('[data-dsh-aqua-fluid-canvas]')).zIndex, '0')
    for (const selector of ['[data-dsh-aqua-whale]', '[data-dsh-aqua-mesh]', '[data-aqua-critter]']) {
      assert.equal(window.getComputedStyle(window.document.querySelector(selector)).zIndex, '2')
    }
  } finally {
    await window.happyDOM.close()
  }
})
