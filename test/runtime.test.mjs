import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { Window } from 'happy-dom'

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('client starts without removed settingsScope and exposes reachable settings', async () => {
  const window = new Window({ url: 'http://localhost/' })
  // Disable GPU-dependent decorations for a deterministic DOM lifecycle test.
  window.localStorage.setItem('dsh.ui-aqua.enabled', 'false')
  window.localStorage.setItem('dsh.ui-aqua.mode', 'compat')
  window.localStorage.setItem('dsh.ui-aqua.background', 'wallpaper')
  window.localStorage.setItem('dsh.ui-aqua.wallpaper', 'data:image/png;base64,AA==')
  for (const flag of ['whale', 'critters', 'mesh', 'spotlight', 'press']) window.localStorage.setItem(`dsh.ui-aqua.${flag}`, 'false')
  let plugin
  const dependencies = new Set()
  const storeModule = {
    defineStore: spec => ({ spec, state: spec.init() }),
  }
  window.__ModuleLoader__ = {
    load: ({ id, factory }) => {
      assert.equal(id, pkg.name)
      plugin = factory(name => {
        dependencies.add(name)
        if (name === '@deepseek-ai/dsh-client-store') return storeModule
        if (name === 'react') return { useRef: () => ({ current: null }) }
        if (name === 'react/jsx-runtime') {
          const jsx = (type, props) => { assert.ok(type, 'JSX component must exist in current runtime'); return { type, props } }
          return { jsx, jsxs: jsx, Fragment: Symbol.for('react.fragment') }
        }
        if (name === '@deepseek-ai/dsh-client-ui-primitives') return { IconCheckOutlineRegular: () => null }
        throw new Error(`Unexpected module dependency: ${name}`)
      })
    },
  }
  vm.runInContext(code, vm.createContext(window))
  assert.deepEqual(Array.from(plugin.inject), ['theme', 'slots', 'locale'])
  const disposers = []
  const entries = []
  const listeners = new Map()
  const ctx = {
    effect(fn) { const off = fn(); if (off) disposers.push(off) },
    on(name, listener) { listeners.set(name, listener); return () => listeners.delete(name) },
    locale: { register: () => () => {} },
    theme: {
      getTheme: () => ({ active: { colorScheme: 'light' } }),
      overrideTokens(source, tokens) {
        assert.equal(source, pkg.name)
        assert.ok(tokens['--dsw-alias-bg-layer-1'])
        return () => {}
      },
    },
    slots: {
      inject(name, callback) { assert.equal(name, 'settings.general.item'); callback() },
      register(options, component) { entries.push({ options, component }); return () => {} },
    },
  }
  plugin.apply(ctx)
  assert.equal(entries.length, 2)
  assert.deepEqual(entries.map(e => e.options.id), ['aqua-toggle', 'aqua'])
  assert.ok(entries[0].options.order < entries[1].options.order)
  let toggle
  for (const { options, component } of entries) {
    const handle = options.store
    const actions = Object.fromEntries(Object.entries(handle.spec.actions).map(([name, action]) => [name, (...args) => action(handle.state, ...args)]))
    const injected = options.inject(actions)
    assert.equal(handle.state.enabled, false)
    const rendered = component({ ...injected, t: key => key, useStore: selector => selector(handle.state) })
    if (options.id === 'aqua-toggle') { assert.equal(rendered.type, 'div'); toggle = injected.setEnabled }
    else assert.equal(rendered, null)
  }
  toggle(true)
  assert.equal(window.document.documentElement.hasAttribute('data-dsh-aqua'), true)
  assert.equal(window.document.documentElement.hasAttribute('data-dsh-compat'), true)
  assert.equal(entries[0].options.store.state.enabled, true)
  assert.equal(entries[1].options.store.state.enabled, true)
  // Render both settings entries while enabled, including every decoration icon.
  for (const { options, component } of entries) {
    const handle = options.store
    for (const flag of ['whale', 'critters', 'mesh', 'spotlight', 'press']) handle.state[flag] = true
    const actions = Object.fromEntries(Object.entries(handle.spec.actions).map(([name, action]) => [name, (...args) => action(handle.state, ...args)]))
    const injected = options.inject(actions)
    for (const flag of ['whale', 'critters', 'mesh', 'spotlight', 'press']) handle.state[flag] = true
    assert.ok(component({ ...injected, t: key => key, useStore: selector => selector(handle.state) }))
  }
  toggle(false)
  assert.equal(window.document.documentElement.hasAttribute('data-dsh-aqua'), false)
  for (const dispose of disposers.reverse()) dispose()
  assert.equal(window.document.documentElement.hasAttribute('data-dsh-aqua'), false)
  assert.equal(window.document.querySelectorAll('style[data-plugin-css]').length, 4)
  for (const name of dependencies) {
    if (name.startsWith('@deepseek-ai/')) assert.ok(pkg.dsh.client.inject.includes(name), `undeclared module ${name}`)
  }
  await window.happyDOM.close()
})

test('package declares current store dependency and ships profile overlay', () => {
  assert.equal(pkg.peerDependencies['@deepseek-ai/dsh-client-store'], '^0.2.0-rc.2')
  assert.equal(pkg.peerDependencies['@deepseek-ai/dsh-client-runtime'], undefined)
  assert.ok(pkg.files.includes('cordis.patch.yml'))
  assert.equal(pkg.engines.dsh, '0.2.0-rc.2')
})

test('profile overlay imports the installed scoped package, not the obsolete npm name', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const name = patch.match(/^\s+name:\s*['"]([^'"]+)['"]/m)?.[1]
  assert.equal(name, pkg.name)
  const host = await import(new URL('../lib/index.js', import.meta.url))
  assert.equal(typeof host.apply, 'function')
})
