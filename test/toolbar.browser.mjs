// Optional real Chromium hit-test regression. No browser package/server required:
// DSH_TEST_CHROME=/path/to/chrome node test/toolbar.browser.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'

const chrome = process.env.DSH_TEST_CHROME || process.argv[2]
if (!chrome) throw new Error('Set DSH_TEST_CHROME to a Chromium executable to run native input regression.')
const root = fileURLToPath(new URL('..', import.meta.url))
const scratch = path.join(root, '.npm-stage')
await mkdir(scratch, { recursive: true })
const profile = await mkdtemp(path.join(scratch, 'toolbar-browser-'))
const cssSource = await readFile(process.env.DSH_TEST_CSS || path.join(root, 'src/client/aqua.module.css'), 'utf8')
const css = (await build({ stdin: { contents: cssSource, loader: 'css' }, write: false, tsconfigRaw: {} })).outputFiles[0].text
const js = (await build({
  stdin: {
    contents: `import { startSeamStamper } from './src/client/seam-stamper.ts';
      import { startSpotlight } from './src/client/spotlight.ts';
      startSeamStamper(); startSpotlight();
      window.clicks = {};
      for (const button of document.querySelectorAll('header button')) {
        window.clicks[button.id] = 0;
        button.addEventListener('click', () => window.clicks[button.id]++);
      }`, resolveDir: root, loader: 'js',
  }, bundle: true, write: false, format: 'iife', tsconfigRaw: {},
})).outputFiles[0].text
const hostDrag = `html[data-platform=darwin] [data-window-drag]{-webkit-app-region:drag}
  html[data-platform=darwin] [data-window-drag-recall]{-webkit-app-region:no-drag}
  html[data-platform=darwin] :is(button,[role=tab]){-webkit-app-region:no-drag}`
const fixture = `<html data-platform="darwin" data-dsh-aqua data-dsh-float data-dsh-aqua-spotlight>
  <head><meta charset="utf-8"><style>${css}</style><style>
  ${hostDrag}
  html,body{margin:0;height:100%;--dsw-alias-bg-base:#F4F8FD;--dsh-aqua-frost:1.4;--dsh-aqua-blur:4px;--ds-ease-in-out:ease-in-out}
  .frame{display:flex;height:100%}.sidebarCol{width:280px;flex:none}.centerCol{flex:1}
  [data-phase]{display:flex;flex-direction:column;height:100%;position:relative}
  [data-slot]{display:contents}header{flex:none;display:flex;gap:16px;align-items:center}
  button{padding:8px 14px;height:36px}svg{width:16px;height:16px}
  .chatBody{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}
  [data-conversation-scroll]{flex:1;overflow:auto}.transcript{min-height:2400px}
  .adversarialBodyChild{position:absolute;left:0;right:0;top:-120px;height:180px;z-index:9999}
  </style></head><body><div class="frame"><div class="sidebarCol"></div><div class="centerCol">
  <div data-phase="active"><div data-slot="conversation.header"><header data-window-drag>
    <button id="preset"><svg><rect width="16" height="16" /></svg> Preset</button>
    <button id="mode">Mode</button><button id="chat" role="tab">Chat</button>
    <button id="trajectory" role="tab">Trajectory</button><button id="menu"><svg><circle r="6" cx="8" cy="8" /></svg></button>
  </header></div><div data-slot="conversation.body"><div class="chatBody" data-conversation-content>
    <div data-conversation-scroll><div class="transcript">Transcript under glass</div></div>
    <div class="adversarialBodyChild"></div>
  </div></div></div></div></div><script>${js}</script></body></html>`
const html = path.join(profile, 'fixture.html')
await writeFile(html, fixture)
let browser
let socket
let stderr = ''
let rejectConnect
const pending = new Map()
let sequence = 0
const deadline = setTimeout(() => {
  const error = new Error('Chromium toolbar regression exceeded 60 seconds')
  rejectConnect?.(error)
  for (const { reject } of pending.values()) reject(error)
  browser?.kill('SIGTERM')
}, 60000)
try {
  const address = await new Promise((resolve, reject) => {
    rejectConnect = reject
    browser = spawn(chrome, [
      '--headless', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-component-update', '--disable-gpu', '--remote-debugging-port=0',
      `--user-data-dir=${profile}`, '--window-size=1200,900', 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    browser.on('error', reject)
    browser.on('exit', (code, signal) => reject(new Error(`Chromium exited before connection: ${code ?? signal}`)))
    browser.stderr.on('data', chunk => {
      stderr += chunk
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr)
      if (match) resolve(match[1])
    })
  })
  socket = new WebSocket(address)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const handler = pending.get(message.id)
    if (!handler) return
    pending.delete(message.id)
    if (message.error) handler.reject(new Error(JSON.stringify(message.error)))
    else handler.resolve(message.result)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  await send('Page.enable', {}, sessionId)
  await send('Page.navigate', { url: pathToFileURL(html).href }, sessionId)
  // A real page-load event barrier rather than assuming navigate implies ready.
  const ready = await evaluate(`new Promise(resolve => {
    const wait = () => window.clicks ? resolve(true) : requestAnimationFrame(wait); wait();
  })`)
  assert.equal(ready, true)
  let attempted = 0
  for (const press of [false, true]) {
    await evaluate(`document.documentElement.toggleAttribute('data-dsh-aqua-press', ${press});
      document.querySelector('[data-conversation-scroll]').scrollTop = 300;
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`)
    for (let round = 0; round < 10; round++) {
      for (const id of ['preset', 'mode', 'chat', 'trajectory', 'menu']) {
        const point = await evaluate(`(() => {
          const button = document.getElementById('${id}');
          const target = button.querySelector('svg') || button;
          const r = target.getBoundingClientRect();
          const x = r.x + r.width/2, y = r.y + r.height/2;
          return { x, y, hit: document.elementFromPoint(x,y)?.closest('button')?.id };
        })()`)
        assert.equal(point.hit, id, `toolbar hit-test lost ${id}`)
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y }, sessionId)
        await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        const styles = await evaluate(`(() => {
          const header = document.querySelector('header');
          const target = document.getElementById('${id}');
          const icon = target.querySelector('svg');
          return { region: getComputedStyle(header).webkitAppRegion, button: getComputedStyle(target).webkitAppRegion,
            icon: icon ? getComputedStyle(icon).webkitAppRegion : 'no-drag', transform: getComputedStyle(header).transform,
            hit: document.elementFromPoint(${point.x},${point.y})?.closest('button')?.id };
        })()`)
        assert.equal(styles.region, 'no-drag')
        assert.equal(styles.button, 'no-drag')
        assert.equal(styles.icon, 'no-drag')
        assert.equal(styles.transform, 'none')
        assert.equal(styles.hit, id, 'hover must not move a target under the pointer')
        for (const type of ['mousePressed', 'mouseReleased']) {
          await send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 }, sessionId)
        }
        attempted++
      }
    }
  }
  const clicks = await evaluate('window.clicks')
  assert.ok(Object.values(clicks).every(count => count === 20), JSON.stringify(clicks))
  console.log(JSON.stringify({ attempted, received: Object.values(clicks).reduce((a,b) => a+b, 0), pressModes: 2,
    dragRegion: 'no-drag', stableToolbar: true, adversarialBodyZ: 9999, fixture: 'isolated Chromium, not live DSH' }))
  await send('Browser.close')
} finally {
  clearTimeout(deadline)
  socket?.close()
  browser?.kill('SIGTERM')
}
