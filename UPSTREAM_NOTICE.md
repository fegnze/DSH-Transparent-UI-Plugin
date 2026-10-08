# Upstream notice and attribution

This repository is a compatibility update of **DSH-Transparent-UI-Plugin**.

## Original project

- Maintainer: [WYH66666666](https://github.com/WYH66666666)
- Original project contributor: [imccyu](https://github.com/imccyu)
- Repository: https://github.com/WYH66666666/DSH-Transparent-UI-Plugin
- License: GNU Affero General Public License v3.0

## Prior DSH adaptation

- Author: `du-u-uck`
- Repository: https://github.com/du-u-uck/DSH-Transparent-UI-Plugin

## Earlier DSH 0.1.5-rc.2 compatibility adaptation

- Publisher: `lllong0908`
- Repository: https://github.com/lllong0908/DSH-Transparent-UI-Plugin
- Target: DeepSeek Harness `0.1.5-rc.2`

### Historical changes in that adaptation

- Replaced the removed `@deepseek-ai/dsh-client-runtime/client` client dependency with `@deepseek-ai/dsh-client-store`.
- Restored `ctx.settingsScope.bind({ namespace: 'settings.aqua' })`.
- Updated `settings.plugin.item` to the current keyed registration model.
- Registered settings surfaces with `ctx.slots.inject(...)`.
- Updated package metadata and generated type declarations.

## Current DSH 0.2.0-rc.2 desktop compatibility fork

- Maintainer: [fegnze](https://github.com/fegnze)
- Repository: https://github.com/fegnze/DSH-Transparent-UI-Plugin
- Target: DeepSeek Harness desktop `0.2.0-rc.2`
- Package: `@deepseek-ai/dsh-client-ui-aqua`

The current fork removes the now-obsolete settingsScope binding described in the historical section, registers controls in General settings, and fixes client bundle identity, icon exports and CSS module collisions. Further changes address sidebar-only fluid bounds, ambient contrast, unified primary glass materials, under-toolbar scrolling and native desktop drag-region conflicts.

These are compatibility and behavior changes on top of the original theme. Original authorship and the prior adaptation credits are retained. The inherited visual examples are not current desktop acceptance screenshots.

## npm package separation

The legacy unscoped npm package `dsh-client-ui-aqua` is not this desktop compatibility fork. The command:

```sh
dsh plugin --profile web add dsh-client-ui-aqua
```

addresses that different package and is not the desktop installation or upgrade procedure for this repository. The old `1.3.1` build referenced the removed `@deepseek-ai/dsh-client-runtime/client` API. For the current recommended GitHub installation, see [README.md](<README.md>) or [README.zh.md](<README.zh.md>).

This repository remains distributed under the AGPL-3.0 license included in [LICENSE](<LICENSE>). The upstream authorship notices must not be removed from redistributed copies.
