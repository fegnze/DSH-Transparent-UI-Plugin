# @deepseek-ai/dsh-client-ui-aqua

English | [中文](README.zh.md)

## DSH 0.2.0-rc.2 client port (1.3.6)

Fixes installation without client activation: removes the missing `settingsScope` dependency/binding, moves the master switch from the removed `settings.plugin.item` to `settings.general.item`, and replaces the obsolete runtime peer with the store module actually used by the client.

Checked against the desktop application's bundled interfaces. Simulated-DOM tests cover module loading, settings registration, theme enable/disable and cleanup. **Real desktop visual acceptance is still pending**; video, WebGL and other plugin combinations require live verification.

### Attribution

- Original project: [WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin)
- Original contributor: [imccyu](https://github.com/imccyu)
- Prior DSH adaptation: [du-u-uck/DSH-Transparent-UI-Plugin](https://github.com/du-u-uck/DSH-Transparent-UI-Plugin)
- DSH 0.1.5-rc.2 compatibility update: [lllong0908/DSH-Transparent-UI-Plugin](https://github.com/lllong0908/DSH-Transparent-UI-Plugin)

Please keep the original project and prior adaptation credits when redistributing this work. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the fixed contributor list and [UPSTREAM_NOTICE.md](UPSTREAM_NOTICE.md) for the full notice.

> [!WARNING]
> `dsh plugin --profile web add dsh-client-ui-aqua` does **not** install this compatibility update. It downloads the old npm package `dsh-client-ui-aqua@1.3.1`, which still imports the removed `@deepseek-ai/dsh-client-runtime/client` module and fails on `DSH 0.1.5-rc.2`. Use the GitHub installer or local-source installation below.


Aqua is a highly customizable glassmorphism theme for the DeepSeek Harness web UI. The header, sidebar, composer, stats line, and trajectory view all become panes of frosted glass. you can put video for wallpaper and Switch it off and the stock UI comes back exactly, with no source changes to DSH itself.

![](assets/1.png)

![](assets/2.png)

![](assets/3.png)

![](assets/4.png)

## Features

- **Two modes**: **Mica** restyles the layout into floating glass cards (blur and frost adjustable), while **Compatibility Mode** keeps the stock layout byte-for-byte and only swaps the material to generic glass — other plugins' UI gets the same treatment automatically
- **Free backdrop**: a living fluid board (hue adjustable) or your own wallpaper (fills the page, aspect preserved, with its own blur and frost); light wallpapers look best in light mode, dark wallpapers in dark mode
- **Background brightness**: follows the resolved scheme — dark mode darkens (0–50), light mode brightens (50–100), 50 is unchanged
- **Particle whale**: the deepseek.com/harness centerpiece fish (a 2D port of the site's particle engine), centered in the chat area right of the sidebar — white particles on dark, gray on light, toggleable in settings
- **Glossy "Harness" badge**: in dark mode the sidebar wordmark wears the official nameplate pill (135° gradient ring + soft glow); light mode keeps the stock plate
- **Edge fades**: 5px gradient blur bands pinned to the top and bottom of the page, above the chat content — scrolling content melts into the edges; faint white veil on light, faint black on dark
- One switch: off restores the stock UI exactly, and every effect is removed with the plugin

## Installation

### Current desktop application (recommended)

Use the desktop **Settings → Plugin manager** with GitHub source `https://github.com/fegnze/DSH-Transparent-UI-Plugin`, branch `main`. DSH 0.2.0-rc.2 has no in-place upgrade or update check in this UI: uninstall the old plugin, reinstall the source, then reload the desktop window. Refreshing the plugin list does not fetch a newer version.

Desktop uses the `desktop` profile. The legacy installer below targets `web` and is not a desktop installation procedure. Do not modify the desktop profile with an older CLI runtime.

### Local build and regression tests

```sh
npm install --legacy-peer-deps
npm run bundle
npm test
```

The build no longer needs the original author's monorepo or Windows paths. `npm test` uses a simulated DOM and instrumented draw calls, not a real desktop GPU/visual acceptance run.

Optional real Chromium toolbar regression (Node 22+, use your own browser executable):

```sh
DSH_TEST_CHROME='/path/to/chrome' npm run test:browser
```

This launches an isolated headless fixture with the desktop drag rules, display-contents slot wrappers, under-header scrolling and a high-z body overlay. It verifies the computed native drag exclusion, stationary hover geometry and 100 consecutive input clicks with press enabled/disabled. It does not attach to the live desktop and cannot verify Electron's macOS native hit routing. Enabling Aqua deliberately makes the floating toolbar non-draggable; other desktop drag areas remain unchanged. Temporary browser profiles stay under the ignored `.npm-stage/` directory.

### Legacy Web installer (reference only)

No npm account and no git needed (falls back to a plain zip download).

**Windows (one command):**

```powershell
powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest 'https://github.com/lllong0908/DSH-Transparent-UI-Plugin/raw/main/install.ps1' -OutFile install.ps1; .\install.ps1"
```

Installs the **latest release** by default. The script links the plugin into the profile's `node_modules` and registers `ui-aqua` in `cordis.patch.yml` (idempotent - safe to run again).

Pin a version or track the dev branch:

```powershell
.\install.ps1 -Version 'v1.3.3'   # a specific release
.\install.ps1 -Version 'main'     # the development branch
```

**macOS / Linux (manual, three steps):**

```sh
git clone --depth 1 --branch v1.3.3 https://github.com/lllong0908/DSH-Transparent-UI-Plugin.git
ln -s "$PWD/DSH" "$DSH_HOME/profiles/node_modules/@deepseek-ai/dsh-client-ui-aqua"
```

then append to `$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: ui-aqua
      name: '@deepseek-ai/dsh-client-ui-aqua'
```

### Not supported: npm one-liner

```sh
dsh plugin --profile web add dsh-client-ui-aqua
```

The npm registry currently serves `dsh-client-ui-aqua@1.3.1` from the original upstream repository. That package is not the `DSH 0.1.5-rc.2` compatibility build and will produce a module-table/import error.

If it was already installed, remove it before installing this fork:

```powershell
dsh plugin --profile web remove dsh-client-ui-aqua
```

## Usage

Reload the web UI. Aqua is **on by default**; the master switch lives in **Settings → General → Glass theme, below Appearance** (always accessible, even while disabled), and every other control sits directly under **Settings → General → Appearance** (no title of its own): mode, blur/frost (Mica mode), fluid color, background brightness, backdrop (fluid/wallpaper) with its wallpaper controls, and the particle-whale toggle. With the master switch off, the whole control block under Appearance is hidden.
