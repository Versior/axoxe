# AXOXE brand

**AXOXE** is the product name in prose. The approved logo reads **Axoxe**, with a capital A and lowercase xoxe. Do not translate the name or substitute a numeral.

> Where moments stay.

AXOXE is a self-hosted space for thoughts, moments, and reflection.

## Visual identity

- `axoxe-logo.svg`: the approved brand logo is the complete name **Axoxe**, exported as five vector letter outlines. It has no runtime font dependency or embedded font files.
- The lettering uses Fraunces Italic at weight 850, optical size 144, SOFT 50 and WONK 1, with adjusted pair spacing. The tall capital A, curling x terminals, oval o and open e preserve the selected preview's contours and proportions.
- `axoxe-logo-dark.svg`: the white wordmark for dark surfaces.
- `axoxe-mark.svg` and `axoxe-mark-dark.svg`: application tiles containing the same complete five-letter wordmark. These are layout exports, not separate symbols.
- `axoxe-symbol.svg`: an existing compatibility filename containing the full wordmark.
- Ink: `#191917`. Warm white: `#f7f5f0`. The inverse wordmark uses `#ffffff` on dark surfaces. Preserve the proportions and at least one quarter of the capital height as clear space when placing the logo in page layouts.
- Use all five letters together. Do not abbreviate the logo to AX, add a monogram, or add a badge, accent dot, decorative border, gradient, or shadow.

`axoxe-preview.svg` and `axoxe-preview.png` show only the complete wordmark on warm white. This design was selected for replacement on 2026-11-14 and supersedes the previous compact sans-serif lettering.

The selected source is the earlier capital-A Fraunces preview supplied by the user. The underlying [Fraunces typeface](https://github.com/undercasetype/Fraunces) is licensed under the SIL Open Font License 1.1; its copyright and license are preserved in `FRAUNCES-OFL.txt`. The logo is a typeface-based wordmark with adjusted spacing, not wholly original lettering. No third-party brand artwork is included.

The application assets in `web/public/`, the documentation logo in `docs/imgs/`, and the site and Hub icons use this full-name identity. PNG and ICO assets are exports of the same wordmark on application tiles.

## Source and attribution

- Website: <https://www.axoxe.com/>
- AXOXE source: <https://github.com/Versior/axoxe>
- Upstream: [Ech0](https://github.com/lin-snow/Ech0), based on v5.9.9.
- License: AGPL-3.0-or-later. Existing copyright and third-party notices remain attached to their original authors.

The GitHub repository is `Versior/axoxe`. Product source links use this canonical path.

## Compatibility

Branding does not change the `github.com/lin-snow/ech0` Go module, `ECH0_*` configuration keys, `X-Ech0-*` integration headers, database names, capsule formats, or importer identifiers. These names are compatibility contracts. Existing instance settings, custom titles, and uploaded content are preserved.

Current README, website and PWA screenshots are captured from the AXOXE UI with synthetic demo data. The promotional video uses real components with scripted fixtures and the approved closing wordmark. Archived upstream references remain in the archive directories. These previews do not show the live deployment; the live website changes only after a new build is deployed.

## Builds and exports

Build the application with Node.js 26+, pnpm 12.14.0, Go 1.27.4+, and a C compiler. Build the CLI with Bun 1.4.4+. `@axoxe/cli` is the private source package and prepared distribution name; public npm publication is not assumed.

The asset renderer uses FFmpeg for the JPEG cover; the optional SVG renderer can be installed outside the repository:

```shell
npm install --prefix /tmp/axoxe-brand-tools @resvg/resvg-js
AXOXE_BRAND_TOOLS=/tmp/axoxe-brand-tools node scripts/generate-brand-assets.mjs
```

The generator exports the SVG, PNG, ICO, and both PNG/JPEG sharing covers, including the design library and prototype wordmarks. Keep legacy asset aliases paired with the new assets.

Current promotional exports are separate from the icon generator: capture `docs/assets/social-preview/social-preview.html` at 1280×640, and the six cards in `docs/assets/carousel/AXOXE_carousel/index.html` at 1242×1656. Their PNG/JPEG files must be refreshed alongside the HTML sources. Architecture exports follow their HTML/SVG/Excalidraw sources; the PDF is a single-page static image export. The video source and final closing chapter use the shared wordmark.

The main SPA imports its wordmark, default tile and browser icons from generated `web/src/assets/brand/` files. Vite gives them content-based URLs, so a new design does not reuse a browser’s cached logo URL. The public compatibility files remain available; PWA icon URLs carry content digests.

Hub metadata uses its own deployment origin. Configure `VITE_HUB_SITE_ORIGIN` before publishing it; this fork does not advertise the upstream Hub as its own deployment. Cloudflare project names are `axoxe-site` and `axoxe-hub`.
