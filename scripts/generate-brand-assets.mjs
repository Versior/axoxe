#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 AXOXE contributors

// Install the optional renderer outside the repository:
// npm install --prefix /tmp/axoxe-brand-tools @resvg/resvg-js
// AXOXE_BRAND_TOOLS=/tmp/axoxe-brand-tools node scripts/generate-brand-assets.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(process.env.AXOXE_BRAND_TOOLS || root, 'package.json'))
const { Resvg } = require('@resvg/resvg-js')
const logo = await readFile(join(root, 'docs/brand/axoxe-logo.svg'), 'utf8')
const inverse = svg => svg.replace(/#191917|#f7f5f0|#ffffff/g, color => color === '#191917' ? '#ffffff' : '#191917')
const darkLogo = inverse(logo)
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
const embed = (svg, x, y, width, height) => {
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1]
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/[ \t]+$/gm, '')
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`
}
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title desc">
  <title id="title">Axoxe</title>
  <desc id="desc">The full Axoxe wordmark centered on an application tile.</desc>
  <rect width="256" height="256" fill="#f7f5f0"/>
  ${embed(logo, 4, 91, 248, 74)}
</svg>`
const dark = inverse(mark)
const write = async (path, data) => {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), data)
}

await write('web/public/axoxe.svg', mark)
await write('web/public/axoxe-dark.svg', dark)
await write('web/public/axoxe-wordmark.svg', logo)
await write('web/public/axoxe-wordmark-dark.svg', darkLogo)
await write('web/public/axoxe.png', png(mark, 512))
await write('web/public/axoxe-dark.png', png(dark, 512))
// Compatibility URLs for saved settings and clients from the upstream project.
await write('web/public/Ech0.svg', mark)
await write('web/public/Ech0.png', png(mark, 512))
await write('web/public/rEch0.svg', dark)
await write('web/public/rEch0.png', png(dark, 512))
await write('docs/brand/axoxe-logo.png', png(logo, 1640))
await write('docs/brand/axoxe-logo-dark.svg', darkLogo)
await write('docs/brand/axoxe-mark.svg', mark)
await write('docs/brand/axoxe-mark-dark.svg', dark)
// Existing file paths continue to resolve to the complete five-letter wordmark.
await write('docs/brand/axoxe-symbol.svg', logo)
await write('site/public/wordmark.svg', logo)
await write('hub/public/wordmark.svg', logo)
await write('design/prototype/public/wordmark.svg', logo)
await write('docs/assets/carousel/AXOXE_carousel/mopmztw2-logo.svg', logo)
for (const path of ['docs/imgs/logo.svg', 'web/public/favicon.svg', 'site/public/logo.svg', 'site/public/favicon.svg', 'site/public/arch/logo.svg', 'hub/public/logo.svg', 'hub/public/favicon.svg']) {
  await write(path, mark)
}

const sizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon-96x96.png': 96,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
  'web-app-manifest-192x192.png': 192,
  'web-app-manifest-512x512.png': 512,
}
for (const [name, size] of Object.entries(sizes)) {
  const image = png(mark, size)
  await write(`web/public/${name}`, image)
  await write(`hub/public/${name}`, image)
}
const maskable = mark.replace('x="4" y="91" width="248" height="74"', 'x="32" y="99" width="192" height="58"')
await write('web/public/maskable-icon.png', png(maskable, 512))
await write('hub/public/maskable-icon.png', png(maskable, 512))

// ICO supports PNG entries, keeping every size derived from the same SVG.
const icoSizes = [16, 32, 48]
const images = icoSizes.map(size => png(mark, size))
const header = Buffer.alloc(6 + images.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)
let offset = header.length
images.forEach((image, i) => {
  const entry = 6 + i * 16
  header[entry] = icoSizes[i]
  header[entry + 1] = icoSizes[i]
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
})
for (const path of ['web/public/favicon.ico', 'hub/public/favicon.ico', 'site/public/favicon.ico']) {
  await write(path, Buffer.concat([header, ...images]))
}

const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f5f0"/>
  ${embed(logo, 178, 200, 844, 230)}
</svg>`
await write('docs/assets/og-cover/og-cover.svg', cover)
await write('web/public/og-cover.png', png(cover, 1200))
await write('web/public/og-cover.jpg', execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-vcodec', 'png',
  '-i', 'pipe:0', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg',
  '-q:v', '2', 'pipe:1',
], { input: png(cover, 1200), maxBuffer: 8 * 1024 * 1024 }))

const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640">
  <rect width="1280" height="640" fill="#f7f5f0"/>
  ${embed(logo, 184, 195, 912, 250)}
</svg>`
await write('docs/brand/axoxe-social.svg', social)

const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="640" viewBox="0 0 1600 640">
  <rect width="1600" height="640" fill="#f7f5f0"/>
  ${embed(logo, 240, 168, 1120, 304)}
</svg>`
await write('docs/brand/axoxe-preview.svg', preview)
await write('docs/brand/axoxe-preview.png', png(preview, 1600))
console.log('AXOXE SVG, PNG, ICO and sharing assets generated.')
