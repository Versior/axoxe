// SPDX-License-Identifier: AGPL-3.0-or-later

import bundledCatalog from '../../public/music-apis.json'
import { normalizeMetingTrack } from './musicPlayer'

const catalogURL = 'https://raw.githubusercontent.com/Versior/axoxe/main/web/public/music-apis.json'
const preferredEndpoints = new Map<string, string>()

type MusicSource = { server: string; type: string; id: string }

async function refreshEndpoints() {
  try {
    const response = await fetch(catalogURL, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`Music API catalog HTTP ${response.status}`)
    const payload: unknown = await response.json()
    const endpoints = (payload as { endpoints?: unknown }).endpoints
    if (
      !Array.isArray(endpoints) ||
      !endpoints.every(
        (url): url is string => typeof url === 'string' && url.startsWith('https://'),
      )
    ) {
      throw new Error('Invalid music API catalog')
    }
    return endpoints
  } catch {
    return bundledCatalog.endpoints
  }
}

export function buildMetingURL(base: string, info: MusicSource) {
  const params: Record<string, string> = { ...info, auth: '', r: String(Math.random()) }
  if (/:(server|type|id|auth|r)\b/.test(base)) {
    return Object.entries(params).reduce(
      (url, [key, value]) => url.replaceAll(`:${key}`, encodeURIComponent(value)),
      base,
    )
  }
  return `${base}${base.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`
}

export async function loadMetingTrack(
  info: MusicSource,
  customAPI: string,
  signal: AbortSignal,
  failedEndpoints: Set<string>,
) {
  const sourceKey = `${info.server}|${customAPI.trim()}`
  const firstEndpoint =
    preferredEndpoints.get(sourceKey) ?? (customAPI.trim() || bundledCatalog.endpoints[0]!)
  const endpoints = [firstEndpoint]
  let lastError: unknown = new Error('No available public music API')
  for (const endpoint of endpoints) {
    signal.throwIfAborted()
    if (!failedEndpoints.has(endpoint)) {
      try {
        const response = await fetch(buildMetingURL(endpoint, info), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        })
        if (!response.ok) throw new Error(`Meting API HTTP ${response.status}`)
        const track = normalizeMetingTrack(await response.json())
        if (!track) throw new Error('Meting API returned no playable track')
        preferredEndpoints.set(sourceKey, endpoint)
        return { track, endpoint }
      } catch (error) {
        signal.throwIfAborted()
        failedEndpoints.add(endpoint)
        lastError = error
      }
    }
    if (endpoints.length === 1) {
      const refreshed = await refreshEndpoints()
      endpoints.push(
        ...new Set(
          [...refreshed, ...bundledCatalog.endpoints].filter((url) => url !== firstEndpoint),
        ),
      )
    }
  }
  throw lastError
}
