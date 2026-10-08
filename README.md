# Aqua — DSH Transparent UI Plugin

English | [中文](<README.zh.md>)

A customizable glass theme for DeepSeek Harness. The conversation toolbar, sidebar, composer, statistics bar and settings panel use translucent surfaces, with a sidebar fluid backdrop, a particle whale and an interactive mesh behind the application content.

**This repository is a desktop compatibility fork, not the original theme project.**

## Origin and attribution

The original theme, visual design and implementation belong to the original project and its contributors:

- **Original project / maintainer:** [WYH66666666/DSH-Transparent-UI-Plugin](https://github.com/WYH66666666/DSH-Transparent-UI-Plugin) — [WYH66666666](https://github.com/WYH66666666).
- **Original project contributor:** [imccyu](https://github.com/imccyu).
- **Prior DSH adaptation:** [du-u-uck/DSH-Transparent-UI-Plugin](https://github.com/du-u-uck/DSH-Transparent-UI-Plugin).
- **DSH 0.1.5-rc.2 compatibility adaptation:** [lllong0908/DSH-Transparent-UI-Plugin](https://github.com/lllong0908/DSH-Transparent-UI-Plugin).
- **This DSH 0.2.0-rc.2 desktop compatibility fork:** [fegnze/DSH-Transparent-UI-Plugin](https://github.com/fegnze/DSH-Transparent-UI-Plugin).

This fork focuses on installation, client API compatibility and desktop rendering/interaction fixes. It does not replace the original authorship. Please retain the original project, contributor and prior adaptation credits when redistributing. See [CONTRIBUTORS.md](<CONTRIBUTORS.md>) and [UPSTREAM_NOTICE.md](<UPSTREAM_NOTICE.md>) for attribution details.

Distributed under [GNU AGPL-3.0](<LICENSE>); package metadata declares `AGPL-3.0-only`.

## Compatibility

| Item | Current target |
| --- | --- |
| Plugin package | `@deepseek-ai/dsh-client-ui-aqua` |
| Current plugin version | `1.3.19` |
| Target DSH version | Desktop `0.2.0-rc.2` |
| Desktop profile | `desktop` |
| Recommended installation | This GitHub repository, branch `main` |

Other DSH versions are not guaranteed. A working legacy Web CLI does not prove compatibility with the desktop Host. Do not use an older `dsh` CLI to modify the desktop profile.

## Install and upgrade

### Install in the current desktop application

1. Open the desktop **Plugin manager** page and choose **Add plugin**.
2. Enter this repository URL:

   ```text
   https://github.com/fegnze/DSH-Transparent-UI-Plugin
   ```

3. Use branch `main` (the default); install and enable the plugin if prompted.
4. Reload the whole desktop window, then open **Settings → General → Glass theme**.

> [!IMPORTANT]
> DSH `0.2.0-rc.2` does **not** provide an in-place upgrade or new-version check in its plugin management UI. To upgrade this GitHub installation, **uninstall the old plugin, reinstall the repository above, then reload the whole desktop window**. The list's Refresh action only reloads installed-plugin state; it does not download new commits. Check the installed version after reinstalling.

The theme stores its visual preferences in the current UI origin's localStorage (video media/handles may use IndexedDB). The plugin's teardown does not explicitly erase these preferences. Clearing the application's site data can reset them; a new plugin version does not automatically reset your slider values.

### Do not confuse this fork with the old npm package

The legacy command below addresses a **different, unscoped package**, not this fork:

```sh
dsh plugin --profile web add dsh-client-ui-aqua
```

It is not an installation or upgrade procedure for this desktop adaptation. The old unscoped build used removed client runtime APIs. Use the GitHub source above, rather than assuming npm resolves this repository's current version.

The inherited [PowerShell installer](<install.ps1>) targets the older Web setup. It is retained as historical tooling, **not** as the recommended desktop installer.

## Features and usage

The master switch and controls are in **Settings → General**. The master switch remains accessible when the theme is off; the additional controls are hidden while disabled. Changes apply to the current UI as the controls are adjusted.

- **Mica mode:** floating glass panes and themed layout. Toolbar, composer/statistics wrapper and settings panel share the same primary glass material.
- **Compatibility mode:** retains the host layout as much as possible and applies a more conservative glass treatment. Blur/frost controls are shown in Mica mode.
- **Sidebar fluid:** the fluid canvas follows the left sidebar's actual width, including resize/collapse. Hue and color depth are adjustable; the fluid no longer fills the chat column.
- **Image/video wallpaper:** an alternative backdrop with separate media controls. Availability depends on browser storage, file access and media decoding.
- **Particle whale, small fish and interactive mesh:** independently switchable background decorations. Brightness adjustment sits below the decorations, so brightening the board does not whiten them out. Foreground cards, modal masks and glass blur can still obscure them normally.
- **Cursor glow and hover press:** glow remains on the toolbar; geometric hover tilt is deliberately excluded from the native conversation toolbar to keep its controls stationary.
- **Under-toolbar scrolling:** in active Mica conversations, transcript content can scroll behind the toolbar; overlap follows the measured toolbar height.
- **Theme toggle:** disabling the theme removes its visual overrides and ambient engines without editing DSH application source.

### Material parameters

Blur and frost are different controls: **blur softens background detail**, while **frost changes the translucent surface fill**. Element text and buttons are not faded with an overall opacity.

| Parameter | Range / current behavior |
| --- | --- |
| Glass blur | `0–40px`; fresh-install default `20px` |
| Frost | `0–100`; fresh-install default `7` |
| Primary light glass | White base fill `42% × min(frost / 50, 1.4)` |
| Primary dark glass | Neutral cool-gray base fill `50% × min(frost / 50, 1.4)` |
| Background brightness | `50` unchanged; light mode `50–100` brightens, dark mode `0–50` darkens |
| Mesh lines / idle nodes | Alpha `0.15 / 0.3`; pointer interaction can locally emphasize nodes |

The toolbar, composer and settings panel share these primary material values. They can still look different because of different backdrop content, modal masks and shadows. The fused composer/statistics bar uses **one outer glass plate**, not two stacked fills. Other small surfaces may retain their own base alpha recipes.

> [!NOTE]
> With Aqua enabled, the floating conversation toolbar and its descendants are **non-draggable** to avoid Electron window-drag regions consuming clicks. Use other window drag areas. The plugin does not change those other regions.

## What this fork changes

- Migrates removed runtime/settings APIs to the current store and General-settings slot, and fixes scoped bundle identity and icon exports.
- Keeps independently compiled CSS module identifiers distinct to avoid settings layout collisions.
- Removes opaque structural fills that concealed ambient canvases in the current desktop layout.
- Restricts the fluid to the sidebar, fixes mesh node double-alpha multiplication and separates decoration contrast from backdrop brightness.
- Unifies primary glass surfaces, restores measured under-toolbar scrolling, and overrides the native toolbar drag rule with sufficient specificity.

These are compatibility and behavior changes on top of the original theme. They are not claims of original authorship or universal support for every DSH/plugin combination.

## Development and verification

Use Node.js `22+`. The build requires `esbuild`; the simulated-DOM tests also require `happy-dom`. If the declared DSH development packages are available in your environment:

```sh
npm install --legacy-peer-deps
npm run bundle
npm test
```

For a standalone checkout without the original DSH monorepo or access to its development packages, install only the build/test tools in an isolated directory (POSIX example, run from the repository root):

```sh
npm install --prefix .npm-stage/build-tools --no-package-lock esbuild@^0.25.12 happy-dom@^20.0.0
# Only for a fresh checkout with no existing node_modules directory:
ln -s .npm-stage/build-tools/node_modules node_modules
npm run bundle
npm test
```

The [build script](<scripts/build.mjs>) creates the Host entry and DSH module-loader client bundle. This repository ships the generated runtime bundle so GitHub installations can run without the original author's monorepo. DSH client peers are provided by the desktop Host; the isolated build tools do not make it a standalone web application.

Optional Chromium interaction regression (supply your own browser executable):

```sh
DSH_TEST_CHROME='/path/to/chrome' npm run test:browser
```

The [browser regression](<test/toolbar.browser.mjs>) uses an isolated headless fixture with desktop drag rules, display-contents slot wrappers, under-toolbar scrolling and a high-z body overlay. It checks computed drag exclusions, stable hover geometry and **100 consecutive input clicks**, with hover press enabled/disabled. Temporary fixture/browser profiles stay under ignored `.npm-stage/`.

### Verification boundaries

- `npm test`: simulated DOM lifecycle/settings/material checks and instrumented Canvas draw calls; not a GPU visual test.
- `npm run test:browser`: real Chromium fixture hit-testing; **not** attachment to the live DSH desktop or a test of Electron's macOS native input routing.
- Live desktop acceptance is still required for the latest toolbar fix, native window behavior, video/WebGL and combinations with other plugins.

When reporting a problem, include the DSH version, installed plugin version, Mica/Compatibility mode, color scheme, relevant slider values and a screenshot or Console error. Do not paste chat contents, credentials or private file data into a public issue. Report fork-specific issues to [this repository's issue tracker](https://github.com/fegnze/DSH-Transparent-UI-Plugin/issues).

## Upstream visual examples

The images below are retained from the inherited repository and illustrate the original theme. **They are not screenshots of this fork's current desktop acceptance tests**; fluid placement and other details can differ.

![Upstream Aqua example 1](<assets/1.png>)
![Upstream Aqua example 2](<assets/2.png>)
![Upstream Aqua example 3](<assets/3.png>)
![Upstream Aqua example 4](<assets/4.png>)
