#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 AXOXE contributors

// Uses the same external renderer as generate-brand-assets.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(process.env.AXOXE_BRAND_TOOLS || root, 'package.json'))
const { Resvg } = require('@resvg/resvg-js')
const output = join(root, 'docs/assets/readme')
await mkdir(output, { recursive: true })
const logo = await readFile(join(root, 'docs/brand/axoxe-logo.svg'), 'utf8')
const logoBody = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g, '')
const wordmark = (x, y, w, color) => `<svg x="${x}" y="${y}" width="${w}" height="${w * 198.923 / 721.727}" viewBox="-5 -71.322 721.727 198.923">${logoBody.replaceAll('#191917', color)}</svg>`
const text = (x, y, size, content, color = '#191917', weight = 400) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${content}</text>`
const save = async (name, svg, width) => {
  await writeFile(join(output, name + '.svg'), svg)
  await writeFile(join(output, name + '.png'), new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng())
}

for (const mode of ['light', 'dark']) {
  const bg = mode === 'light' ? '#f7f5f0' : '#191917'
  const ink = mode === 'light' ? '#191917' : '#f7f5f0'
  const muted = mode === 'light' ? '#65645d' : '#b7b6ab'
  const line = mode === 'light' ? '#d9d6cd' : '#44443e'
  const accent = mode === 'light' ? '#b44f2f' : '#ec9c76'
  await save('hero-' + mode, `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="620" viewBox="0 0 1280 620" role="img" aria-labelledby="title desc">
    <title id="title">Axoxe — Where moments stay.</title>
    <desc id="desc">A self-hosted personal timeline. Write, connect, and own your content.</desc>
    <rect width="1280" height="620" rx="18" fill="${bg}"/>
    ${text(64, 63, 13, 'A PERSONAL TIMELINE. YOUR OWN LITTLE CORNER.', muted, 600)}
    ${text(1102, 63, 13, 'OPEN SOURCE', muted, 600)}
    <path d="M64 86H1216" stroke="${line}"/>
    ${wordmark(60, 127, 660, ink)}
    <circle cx="1195" cy="162" r="21" fill="${accent}"/>
    <path d="M1184 162h22m-11-11v22" stroke="${bg}" stroke-width="2"/>
    ${text(68, 372, 43, 'Where moments stay.', ink, 500)}
    ${text(70, 415, 19, 'Thoughts, photographs, links. A life in small entries.', muted)}
    <path d="M64 464H1216" stroke="${line}"/>
    ${[[64, '01', 'WRITE', 'A quieter space for everyday thoughts.'], [470, '02', 'CONNECT', 'Share a timeline. Keep a conversation.'], [864, '03', 'OWN', 'Your server. Your files. Your way.']].map(([x, n, title, copy]) => `${text(x, 505, 13, n, accent, 600)}${text(x + 34, 505, 13, title, ink, 700)}${text(x, 540, 16, copy, muted)}`).join('')}
    ${text(64, 591, 12, 'SELF-HOSTED / GO + VUE / AGPL-3.0-OR-LATER', muted)}
    ${text(992, 591, 12, 'github.com/Versior/axoxe', muted)}
  </svg>`, 1600)
}

const box = (x, y, w, title, subtitle) => `<rect x="${x}" y="${y}" width="${w}" height="86" rx="10" fill="#fff" stroke="#d9d6cd"/>${text(x + 20, y + 35, 19, title, '#191917', 600)}${text(x + 20, y + 62, 13, subtitle, '#65645d')}`
await save('architecture', `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760" role="img" aria-labelledby="title desc">
  <title id="title">AXOXE architecture</title>
  <desc id="desc">One Go process serves the Vue application and REST API. Requests flow through handlers, services, repositories and SQLite. Services publish events through Busen; VireFS handles local and S3 storage. MCP calls services and Copilot calls external LLM providers.</desc>
  <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#b44f2f" stroke-width="1.5"/></marker></defs>
  <rect width="1280" height="760" rx="18" fill="#f7f5f0"/>
  ${text(56, 54, 12, 'UNDER THE SURFACE', '#b44f2f', 700)}
  ${text(56, 99, 30, 'One binary. A complete personal timeline.', '#191917', 600)}
  ${text(56, 134, 15, 'The SPA, API and background workers run together in a single Go process.', '#65645d')}
  <rect x="40" y="242" width="1200" height="412" rx="14" fill="none" stroke="#bcb8ad" stroke-dasharray="5 6"/>
  ${text(56, 268, 12, 'GO PROCESS / WIRE DEPENDENCY INJECTION', '#65645d', 600)}
  ${box(56, 165, 346, 'Browser / PWA', 'Vue 3 · Pinia · Vue Router · UnoCSS')}
  ${box(467, 165, 345, 'API clients', 'REST · OpenAPI · SSE')}
  ${box(880, 165, 344, 'External AI clients', 'MCP · scoped access tokens')}
  ${box(56, 302, 346, 'HTTP &amp; handlers', 'Gin · Huma · auth · scopes · rate limits')}
  ${box(467, 302, 345, 'Domain services', 'Content · comments · auth · migration')}
  ${box(880, 302, 344, 'Repositories', 'GORM · transactions · durable settings')}
  ${box(56, 445, 346, 'Storage / VireFS', 'Local files · S3-compatible object stores')}
  ${box(467, 445, 345, 'Events / Busen', 'Webhooks · indexing · cache invalidation')}
  ${box(880, 445, 344, 'Copilot / Agent', 'RAG · tools · OpenAI / Anthropic providers')}
  ${text(56, 585, 15, 'Scheduled snapshots', '#65645d')}
  ${text(467, 585, 15, 'Job and task lifecycle', '#65645d')}
  <g stroke="#b44f2f" stroke-width="1.5" fill="none" marker-end="url(#arrow)">
    <path d="M229 252V297"/><path d="M639 252V288H229V297"/>
    <path d="M1052 252V288H639V297"/>
    <path d="M403 345H458"/><path d="M813 345H871"/>
    <path d="M639 389V436"/><path d="M611 389V414H229V436"/>
    <path d="M668 389V414H1052V436"/>
    <path d="M1224 345H1231V541H1052V550"/>
  </g>
  ${box(880, 554, 344, 'SQLite + sqlite-vec', 'Embedded database · vector search')}
  ${text(56, 680, 13, 'Solid arrows show request / dependency flow.', '#65645d')}
  ${text(56, 705, 13, 'Busen subscribers handle asynchronous side effects.', '#65645d')}
</svg>`, 1600)

const desktop = await readFile(join(root, 'web/public/screenshot-desktop.png'))
const mobile = await readFile(join(root, 'web/public/screenshot-mobile.png'))
const preview = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <rect width="1600" height="1000" rx="22" fill="#ece9e1"/>
  ${text(56, 59, 13, 'THE ACTUAL APP / DESKTOP + MOBILE', '#65645d', 600)}
  <rect x="46" y="95" width="1330" height="828" rx="15" fill="#fff" stroke="#d3cfc3"/>
  <circle cx="70" cy="120" r="5" fill="#bcb7aa"/><circle cx="90" cy="120" r="5" fill="#bcb7aa"/><circle cx="110" cy="120" r="5" fill="#bcb7aa"/>
  ${text(660, 125, 12, 'AXOXE / timeline', '#65645d')}
  <image href="data:image/png;base64,${desktop.toString('base64')}" x="57" y="145" width="1308" height="767" preserveAspectRatio="xMidYMin meet"/>
  <rect x="1240" y="246" width="314" height="680" rx="32" fill="#191917"/>
  <clipPath id="mobile"><rect x="1250" y="258" width="294" height="656" rx="23"/></clipPath>
  <image href="data:image/png;base64,${mobile.toString('base64')}" x="1250" y="258" width="294" height="656" preserveAspectRatio="xMidYMin slice" clip-path="url(#mobile)"/>
  ${text(56, 970, 14, 'Built from this repository. All posts and accounts shown use synthetic demonstration data.', '#65645d')}
</svg>`
await writeFile(join(output, 'product-preview.png'), new Resvg(preview).render().asPng())
console.log('Generated README covers, architecture diagram and product preview.')
