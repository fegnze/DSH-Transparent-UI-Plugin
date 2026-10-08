/**
 * Runtime seam stamper.
 *
 * The Aqua stylesheet keys off stable data-* hooks (`data-dsh-frame`,
 * `data-dsh-sidebar-root`, `data-hero-headline`, …). In the monorepo those
 * hooks are authored into the base packages' source; for a self-contained
 * distribution (installed against a stock DSH) this module stamps them onto
 * the matching elements at runtime, so the stylesheet works with zero base
 * edits. Each selector uses only stable attributes already present in the
 * stock UI (`data-composer-card`, `data-conversation-composer-overlay`,
 * ARIA roles) or lightningcss-preserved class-name substrings.
 *
 * Stamps are idempotent and inert without the `data-dsh-aqua` root attribute
 * (the whole stylesheet is gated on it), so they are simply left in place when
 * the layer flips off — "off" still renders the exact stock UI.
 */

interface Seam {
  /** Attribute to stamp (bare name; value is always ''). */
  readonly attribute: string
  /** CSS selector for the element(s) to stamp. */
  readonly selector: string
  /** Stamp only the first (topmost) match, not every descendant match. */
  readonly first?: boolean
}

const SEAMS: readonly Seam[] = [
  // The layout frame: the sidebar column's direct parent.
  { attribute: 'data-dsh-frame', selector: ':has(> [class*="sidebarCol"])' },
  // The sidebar content root (topmost `root` under the column — settings
  // internals also carry a `root` class but sit deeper, so first match wins).
  { attribute: 'data-dsh-sidebar-root', selector: '[class*="sidebarCol"] [class*="root"]', first: true },
  // New-session button (the raised-surface seam).
  { attribute: 'data-dsh-surface', selector: 'button[class*="newSession"]' },
  // Trajectory view (the only composer-overlay view today).
  { attribute: 'data-dsh-trajectory', selector: '[data-conversation-composer-overlay]' },
  // Details panel (topmost `root` under the details column).
  { attribute: 'data-dsh-details', selector: '[class*="detailsCol"] [class*="root"]', first: true },
  // Composer bar root: the composer card's direct parent.
  { attribute: 'data-dsh-inputbar', selector: ':has(> [data-composer-card])' },
  // Composer attach "+" button.
  { attribute: 'data-dsh-add', selector: '[data-composer-card] [class*="add"]' },
  // Session stats line under the composer (composer.dock slot).
  { attribute: 'data-dsh-stats', selector: '[data-slot="conversation.composer.dock"] [class*="root"]' },
  // Spotlight / hover-tilt panes: the floating-glass surfaces the cursor
  // glow and the geometric press target. The inputbar (composer + its
  // docked stats band) is ONE spot so the fused piece tilts and glows
  // together; the small + bead and chat bubbles stay out so the effect
  // reads as "the glass panes", not every surface.
  { attribute: 'data-dsh-aqua-spot', selector: 'header', first: true },
  { attribute: 'data-dsh-aqua-spot', selector: '[class*="sidebarCol"]', first: true },
  { attribute: 'data-dsh-aqua-spot', selector: '[data-dsh-inputbar]' },
  { attribute: 'data-dsh-aqua-spot', selector: '[data-dsh-trajectory]' },
  { attribute: 'data-dsh-aqua-spot', selector: '[data-dsh-surface]' },
  // The sidebar wordmark button (its badge plate gets the official pill).
  { attribute: 'data-dsh-wordmark', selector: '[class*="sidebarCol"] [class*="brand"]', first: true },
]

function stamp(seam: Seam): void {
  if (seam.first) {
    const el = document.querySelector(seam.selector)
    if (el !== null && !el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, '')
    return
  }
  for (const el of document.querySelectorAll(seam.selector)) {
    if (!el.hasAttribute(seam.attribute)) el.setAttribute(seam.attribute, '')
  }
}

function stampAll(): void {
  for (const seam of SEAMS) stamp(seam)
}

/**
 * Stamp the seams once, then keep them stamped as React remounts nodes.
 * @returns a disposer that disconnects the observer.
 */
export function startSeamStamper(): () => void {
  stampAll()
  // Keep the fluid board restricted to the live sidebar bounds. ResizeObserver
  // also follows layout drag/collapse without polling or reacting to canvas frames.
  let sidebar: Element | null = null
  const updateFluidBounds = (): void => {
    const rect = sidebar?.getBoundingClientRect()
    document.documentElement.style.setProperty('--dsh-aqua-fluid-left', `${rect?.left ?? 0}px`)
    document.documentElement.style.setProperty('--dsh-aqua-fluid-width', `${rect?.width ?? 0}px`)
  }
  const resize = new ResizeObserver(updateFluidBounds)
  const refresh = (): void => {
    stampAll()
    const next = document.querySelector('[class*="sidebarCol"]')
    if (next !== sidebar) {
      resize.disconnect()
      sidebar = next
      if (sidebar !== null) resize.observe(sidebar)
    }
    updateFluidBounds()
  }
  // Measure each resident conversation independently (including split views).
  const headers = new Map<HTMLElement, HTMLElement>()
  const updateHeaderBounds = (): void => {
    for (const [header, phase] of headers) {
      const rect = header.getBoundingClientRect()
      const margin = Number.parseFloat(getComputedStyle(header).marginTop) || 0
      phase.style.setProperty('--dsh-aqua-header-overlap', `${Math.ceil(rect.height + margin)}px`)
    }
  }
  const headerResize = new ResizeObserver(updateHeaderBounds)
  const refreshHeaders = (): void => {
    const live = new Set(document.querySelectorAll<HTMLElement>('[data-phase] header'))
    for (const [header, phase] of headers) {
      if (!live.has(header)) {
        headerResize.unobserve(header)
        phase.style.removeProperty('--dsh-aqua-header-overlap')
        headers.delete(header)
      }
    }
    for (const header of live) {
      const phase = header.closest<HTMLElement>('[data-phase]')
      if (phase && !headers.has(header)) {
        headers.set(header, phase)
        headerResize.observe(header)
      }
    }
    updateHeaderBounds()
  }
  const refreshAll = (): void => { refresh(); refreshHeaders() }
  refreshAll()
  const observer = new MutationObserver(refreshAll)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('resize', updateFluidBounds)
  return () => {
    observer.disconnect()
    resize.disconnect()
    headerResize.disconnect()
    for (const phase of headers.values()) phase.style.removeProperty('--dsh-aqua-header-overlap')
    headers.clear()
    window.removeEventListener('resize', updateFluidBounds)
    document.documentElement.style.removeProperty('--dsh-aqua-fluid-left')
    document.documentElement.style.removeProperty('--dsh-aqua-fluid-width')
  }
}
