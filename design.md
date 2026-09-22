# Design — Porto (Diwan Purnama CV)

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Produced by `hallmark redesign` (scope: app). Amendments go here, never into a
single page.

## Genre

modern-minimal — the dev-tool / instrument-panel register. Cool engineered
paper, ruler-drawn hairlines, exactly one electric cobalt signal, machine-readout
mono labels. It reads like good infrastructure: calm, precise, fast.

## Macrostructure family

- **Document pages** — `Workbench`. A persistent hairline rail carrying
  navigation and identity, against a single scrolling evidence column. The rail
  is `position: sticky`, never a second scroll container. Vary the archetypes
  *inside* the column: numbered sections, ruled skill rows, a dark graphite
  band for the timeline, a ruled project index. Applies to `/`.
- **App pages** — `Workbench`, function-first. Same rail-and-canvas logic
  inverted: a flush header bar, a sticky graphite action bar, hairline-ruled
  form groups. **No enrichment** — the controls carry the page. Applies to
  `/admin`.
- **Marketing pages** — none today. Reserved; if a landing route is added, it
  uses `Marquee Hero` and must not import the Document or App archetypes.

### Variants — the one allowed second scroll container

The Document page's rail is `position: sticky; top: 0; height: 100dvh` with
`overflow-y: auto` **on the rail only, and only from `lg` (64rem) up**. This is
the single documented exception to "never a second scroll container": the rail's
content (identity, bio, nav, education, languages, socials, contact) exceeds a
short laptop viewport, and the alternative — clipped, unreachable navigation — is
strictly worse. Below `lg` the rail is a normal stacked block in the one
document flow. No other page may add a scroll container.

## Theme

Cobalt. Cool light ground, one electric cobalt signal (< 5 % of any viewport),
depth from 1px rules rather than shadow or blur.

- `--color-paper`   oklch(98.5% 0.004 250)  — engineered near-white, never `#fff`
- `--color-paper-2` oklch(96.5% 0.006 250)  — raised surface
- `--color-paper-3` oklch(93.5% 0.008 250)  — hover surface
- `--color-ink`     oklch(24% 0.02 258)     — cool charcoal, never `#000`
- `--color-ink-2`   oklch(34% 0.018 257)    — body text (9.0:1 on paper)
- `--color-ink-3`   oklch(52% 0.014 257)    — meta text (4.9:1 on paper)
- `--color-rule`    oklch(89% 0.008 250)    — decorative hairline
- `--color-rule-strong` oklch(60% 0.014 255) — control borders, 3.3:1 on paper
- `--color-accent`  oklch(52% 0.20 256)     — THE signal. 5.6:1 on paper
- `--color-accent-hover` oklch(46% 0.19 256) — pressed/hover fill only
- `--color-accent-ink` oklch(99% 0.004 250) — text on accent, 5.9:1
- `--color-accent-on-dark` oklch(72% 0.15 256) — accent for the graphite band, 5.8:1
- `--color-focus`   oklch(52% 0.20 256)     — 2px focus ring
- `--color-graphite` oklch(22% 0.016 260)   — the one dark band
- `--color-graphite-2` oklch(26.5% 0.016 260)
- `--color-graphite-rule` oklch(34% 0.016 260)
- `--color-graphite-ink` oklch(88% 0.008 250)   — 11.0:1 on graphite
- `--color-graphite-ink-2` oklch(70% 0.012 255) — 6.4:1 on graphite
- `--color-danger`  oklch(48% 0.17 25)
- `--color-danger-ink` oklch(99% 0.004 250)

**One accent, no variants.** `--color-accent` at L 52 % is deliberately deeper
than the catalog's `L 58 %` so a single token clears 4.5:1 both as a fill behind
white text *and* as text on paper. On the graphite band, swap to
`--color-accent-on-dark` — L 52 % cobalt only reaches 2.3:1 there.

## Typography

- Display: Space Grotesk, weight 500/600, style normal
- Body:    Geist, weight 400/500
- Mono:    Geist Mono, weight 400/500

Three families is the ceiling and this project sits on it. Mono is **not** an
outlier here — it is the third *system* face, tagging every machine-readout
role: eyebrows, section numerals, category labels, periods, status, metadata,
file paths. It never appears as body prose.

Geist is retained from the existing stack (`next/font`, `layout.tsx`) rather
than swapped for the catalog's Inter: Inter is on the banned-defaults list, Geist
is the allowlisted equivalent, and it is already loaded. Space Grotesk is added
for display only.

- Display tracking: -0.025em
- Type scale ratio: 1.25 (major third)
- Type scale anchor: `--text-display: clamp(2.5rem, 5vw + 1rem, 4.5rem)`
- Body measure: `65ch` default, `72ch` max
- `font-variant-numeric: tabular-nums` on every period, version and count.

**No italic headers.** No `background-clip: text`.

## Spacing

4-point named scale, values in `tokens.css`. Pages must use named tokens
(`var(--space-md)`) or the Tailwind `--spacing-*` mirror — never raw values.

## Motion

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`
- Durations: `--dur-micro: 120ms`, `--dur-short: 220ms`, `--dur-long: 600ms`
- Reveal pattern: fade + 10px rise, once, `--dur-long`, on section entry only.
  Never on hover. `transform` / `opacity` only.
- Hover: 1px border-colour shift to accent, or an accent underline-grow on a
  text link. No scale, no bounce, no parallax.
- Reduced-motion fallback: opacity-only, ≤ 150 ms — in practice the reveal is
  skipped entirely and content ships fully visible and static.
- A reveal must never be the only thing making content visible: if the engine
  does not run, everything renders.

## Microinteractions stance

- Silent success. No toasts, no confetti, no celebratory copy. The admin save
  reports `Saved · v4` inline, in mono, and stops.
- No `alert()`, no `confirm()`. Destructive actions confirm in place.
- Focus: 2px `--color-focus` ring at 2px offset on **every** focusable control,
  via `:focus-visible` only. Never `:focus`-only, never `outline: none`.
- Hover delay 0 ms, focus delay 0 ms. No hover-only affordances — anything that
  appears on hover must also be reachable by keyboard and visible on touch.
- Disabled controls carry `disabled` + `aria-disabled`, `cursor: not-allowed`,
  and a text state change — never opacity alone.

## CTA voice

- Primary CTA: solid `--color-accent` fill, `--color-accent-ink` text, 6px
  radius, 1px transparent border, mono 500 label in sentence case. Copy names
  the destination: *"Email me"*, *"Save changes"*, *"Log in"*. Never "click
  here", never a pill, never a gradient.
- Secondary CTA: transparent fill, 1px `--color-rule-strong` border, 6px radius,
  `--color-ink` text, trailing `↗` for anything that leaves the page.
- Tertiary: plain text link with an accent underline-grow on hover.
- Labels are single-line at every viewport 320–1920 px. Shorten the label before
  letting it wrap.

## Per-page allowances

- Document pages (`/`) MAY use enrichment: the hero's graphite spec card, the
  ruled index, the single dark band. That band appears **once per page**.
- App pages (`/admin`) MUST NOT use enrichment. Function carries the page. The
  only dark surface allowed is the sticky action bar. The reveal engine is
  **not** mounted on app pages either — a form that fades in while you are
  typing into it is decoration working against the task. Only the Document
  page mounts `RevealScript`.
- Content pages: typography only.
- No page may use: gradients (including `bg-gradient-*`), drop shadows beyond
  `0 1px 2px`, glassmorphism, background texture or pattern, aurora blobs,
  drawn browser/terminal chrome, or more than one dark band.

## What pages MUST share

- The wordmark: the name in Space Grotesk 600, tight tracking, no icon.
- `--color-accent` and its placement: focus rings, the one primary button, the
  active rail item, the section numeral of the section in view. ≤ 5 % per view.
- The display + body + mono trio and their roles.
- The CTA voice (6px radius, mono 500 label, bordered secondary with `↗`).
- Section heading rhythm: mono numeral + mono uppercase label + hairline rule,
  then the content. No decorative accent bars, no side stripes.
- Hairline-first depth. If a surface needs separating, it gets a 1px rule.

## What pages MAY differ on

- Archetype inside the family: the Document page numbers its sections and rules
  its lists; the App page uses grouped form rows and a sticky action bar. Both
  are Workbench, both use the system's type, colour and CTA voice.
- Hero archetype on Document pages only (asymmetric title-left / artefact-right;
  never centred).
- Enrichment — Document pages only.

## Exports

Drop-in formats for re-using this design system in other projects.

### tokens.css

See `tokens.css` at the project root. `src/app/globals.css` is the live source
that Tailwind compiles; the two are kept value-identical by hand.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:  oklch(98.5% 0.004 250);
  --color-ink:    oklch(24% 0.02 258);
  --color-accent: oklch(52% 0.20 256);
  --spacing-md:   1.5rem;
  --text-md:      1.125rem;
  --ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
}
@theme inline {
  --font-display: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif;
  --font-body:    var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-outlier: var(--font-geist-mono), ui-monospace, monospace;
}
```

Fonts must be `@theme inline` — `next/font` defines its variables on the
element, so a non-inlined `var()` chain would resolve to nothing.

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":  { "$value": "oklch(98.5% 0.004 250)", "$type": "color" },
    "ink":    { "$value": "oklch(24% 0.02 258)",    "$type": "color" },
    "accent": { "$value": "oklch(52% 0.20 256)",    "$type": "color" },
    "graphite": { "$value": "oklch(22% 0.016 260)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk", "$type": "fontFamily" },
    "body":    { "$value": "Geist",         "$type": "fontFamily" },
    "mono":    { "$value": "Geist Mono",    "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:         98.5% 0.004 250;   /* paper */
  --foreground:         24%   0.02  258;   /* ink */
  --primary:            52%   0.20  256;   /* accent */
  --primary-foreground: 99%   0.004 250;   /* accent-ink */
  --muted:              96.5% 0.006 250;   /* paper-2 */
  --muted-foreground:   52%   0.014 257;   /* ink-3 */
  --border:             89%   0.008 250;   /* rule */
  --input:              60%   0.014 255;   /* rule-strong */
  --ring:               52%   0.20  256;   /* focus */
  --radius:             6px;
}
```
