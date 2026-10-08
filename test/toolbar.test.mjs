import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'
import { Window } from 'happy-dom'

const spotlightBundle = await build({
  entryPoints: [new URL('../src/client/spotlight.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'iife', globalName: 'spotlightEngine',
  platform: 'browser', target: 'es2022', tsconfigRaw: {},
})

test('native toolbar keeps cursor glow but never moves under the pointer when press is enabled', async () => {
  const window = new Window({ url: 'http://localhost/' })
  const frames = new Map()
  let nextFrame = 0
  window.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame }
  window.cancelAnimationFrame = id => frames.delete(id)
  window.matchMedia = () => ({ matches: false })
  window.document.documentElement.setAttribute('data-dsh-aqua-press', '')
  window.document.documentElement.setAttribute('data-dsh-aqua-spotlight', '')
  window.document.body.innerHTML = `<header data-window-drag data-dsh-aqua-spot><button>Action</button></header>
    <div data-dsh-surface data-dsh-aqua-spot><button>Other surface</button></div>`
  for (const spot of window.document.querySelectorAll('[data-dsh-aqua-spot]')) {
    spot.getBoundingClientRect = () => new window.DOMRect(0, 0, 300, 100)
    Object.defineProperty(spot, 'offsetWidth', { get: () => 300 })
    Object.defineProperty(spot, 'offsetHeight', { get: () => 100 })
  }
  vm.runInContext(spotlightBundle.outputFiles[0].text, vm.createContext(window))
  const stop = window.spotlightEngine.startSpotlight()
  const hover = spot => {
    spot.querySelector('button').dispatchEvent(new window.PointerEvent('pointerover', {
      bubbles: true, clientX: 240, clientY: 35,
    }))
    const pending = [...frames]
    frames.clear()
    for (const [, callback] of pending) callback(1000)
  }
  try {
    const header = window.document.querySelector('header')
    for (let i = 0; i < 20; i++) {
      hover(header)
      assert.equal(header.style.transform, '')
      assert.equal(header.style.transformOrigin, '')
      assert.ok(header.hasAttribute('data-spot-on'))
      assert.ok(header.querySelector('[data-dsh-aqua-glow]'), 'glow overlay remains available')
    }
    const surface = window.document.querySelector('[data-dsh-surface]')
    hover(surface)
    assert.match(surface.style.transform, /perspective\(800px\)/, 'press still works on non-toolbar panes')
  } finally {
    stop()
    await window.happyDOM.close()
  }
})
