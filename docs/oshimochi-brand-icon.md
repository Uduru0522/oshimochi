# Oshimochi Brand Icon

`icons/oshimochi-themeable.svg` is the shared brand asset. It depicts a mochi
mascot beside a hanging tapestry, reflecting the app's collectible-goods use.
The browser tab, sidebar, and installed app use this same geometry.

## Sidebar

The sidebar uses an inline SVG with a `use` reference to the asset's
`oshimochi-mark` root. The `.brand-mark` rule in
`src/styles/foundation.css` supplies the background, outline, soft fill, and
eye colors through CSS custom properties. Changes to the app accent update the
mark without separate color assets.

The mark is decorative because the adjacent heading already names the app.

## Browser And Installed App

The favicon and web manifest reference the SVG directly. These references use
the asset's fixed blue palette because they do not inherit page styles. The
manifest declares a scalable icon for ordinary use; it does not promise a
theme-changing or maskable launcher icon.

## Verification

Check the shared geometry at 24, 44, 48, 192, and 512 pixels. Check the sidebar
under all seven accents in light and dark mode, plus the narrow layout.

The SVG is part of the explicit service-worker asset list. When changing it,
follow [Development](development.md#update-offline-assets) and run
`npm run check`.
