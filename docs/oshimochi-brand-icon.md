# Oshimochi icon prototype — Codex handoff

This document describes an optional brand icon candidate, **not an approved
product rename**. Keep the repository name, app title, storage namespace,
manifest identifiers, and Firebase/backup work unchanged unless requested.

## Asset

- `icons/oshimochi-themeable.svg` — one flat vector design, with no copyrighted
  character or specific merchandise depiction.
- The picture is a mochi mascot beside a blank hanging tapestry. The tapestry
  is deliberate: organizing tapestry merchandise inspired the app.
- Use one SVG geometry for every color. Do not maintain separate generated PNGs
  per accent; they drift geometrically.

## Theme integration

The app already sets `document.documentElement.dataset.accent` and the CSS
`--accent` variable in `src/styles/foundation.css`. Its options screen has
seven accent choices and a light/dark mode.

**For DOM UI only**, inline the SVG markup into the DOM (or render it as an
inline SVG component). Then supply these CSS variables on the SVG or a parent:

```css
.oshimochi-icon {
  --oshimochi-bg: var(--accent);
  --oshimochi-outline: var(--accent-ink);
  --oshimochi-soft: color-mix(in srgb, var(--accent) 22%, white);
  --oshimochi-eye: color-mix(in srgb, var(--accent) 70%, #14395e);
  --oshimochi-white: #fff;
  --oshimochi-cloth: #fff;
  --oshimochi-cheek: #f6b6c6;
}
```

CSS variables inherit into **inline** SVG. An SVG loaded with `<img>`, CSS
`background-image`, or a web manifest is isolated from the document and **will
not automatically respond to** the app's `--accent`. Such references show the
SVG's fixed blue fallbacks. Do not promise a dynamically recoloring installed
PWA launcher icon: export static icons separately if/when a brand change is
approved.

## Suggested follow-up for Codex

1. Inspect the latest UI and `src/styles/foundation.css` theme tokens.
2. Propose a minimal inline-SVG integration for the sidebar brand mark or
   another suitable app-visible location. Keep the design at one geometry and
   use `--accent` rather than per-color assets.
3. Check legibility at 24, 44, 48, 192 and 512 px, and under all seven accent
   colors including dark mode; revise only if needed.
4. If runtime imports/assets change, follow the explicit service-worker asset
   list convention and bump `CACHE_NAME`; run `npm run check`.
5. Do not rename the project, replace manifest icons, or alter database keys
   as part of this prototype without a separate decision.

The icon is currently an **asset plus integration guidance only**, with no
runtime UI changes in this commit.
