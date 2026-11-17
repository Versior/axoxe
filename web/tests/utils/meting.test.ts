// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const source = { server: 'netease', type: 'song', id: '591321' }
const fetchMock = vi.fn<typeof fetch>()
const trackResponse = () => Response.json([{ name: 'Song', url: 'https://example.test/song.mp3' }])
const load = async (customAPI = '', failedEndpoints = new Set<string>()) => {
  const { loadMetingTrack } = await import('../../src/utils/meting')
  return loadMetingTrack(source, customAPI, new AbortController().signal, failedEndpoints)
}

describe('Meting failure-triggered source updates', () => {
  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('uses the current API without fetching the catalog during normal playback', async () => {
    fetchMock.mockResolvedValue(trackResponse())
    const result = await load('https://custom.example.test/api')

    expect(result.endpoint).toBe('https://custom.example.test/api')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refreshes after a failure and remembers the successful source for the next load', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ endpoints: ['https://new.example.test/api'] }))
      .mockResolvedValueOnce(trackResponse())
      .mockResolvedValueOnce(trackResponse())
    const failed = new Set<string>()

    expect((await load('https://old.example.test/api', failed)).endpoint).toBe(
      'https://new.example.test/api',
    )
    expect(failed.has('https://old.example.test/api')).toBe(true)
    expect((await load('https://old.example.test/api')).endpoint).toBe(
      'https://new.example.test/api',
    )
    expect(fetchMock.mock.calls.map(([url]) => String(url).split('?')[0])).toEqual([
      'https://old.example.test/api',
      'https://raw.githubusercontent.com/Versior/axoxe/main/web/public/music-apis.json',
      'https://new.example.test/api',
      'https://new.example.test/api',
    ])
  })

  it('uses bundled candidates when catalog download fails', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json([]))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(trackResponse())

    expect((await load('https://empty.example.test/api')).endpoint).toBe(
      'https://api.injahow.cn/meting/',
    )
  })

  it('skips sources whose audio failed, then stops after all candidates fail', async () => {
    const failed = new Set(['https://api.injahow.cn/meting/'])
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ endpoints: ['https://api.injahow.cn/meting/', 'https://v.iarc.top/'] }),
      )
      .mockResolvedValueOnce(new Response('', { status: 502 }))

    await expect(load('', failed)).rejects.toThrow('Meting API HTTP 502')
    expect(failed.size).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not refresh or change sources when the caller cancels', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementationOnce(async () => {
      controller.abort()
      throw controller.signal.reason
    })
    const { loadMetingTrack } = await import('../../src/utils/meting')

    await expect(loadMetingTrack(source, '', controller.signal, new Set())).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('preserves query parameters and custom Meting templates', async () => {
    const { buildMetingURL } = await import('../../src/utils/meting')
    const url = new URL(buildMetingURL('https://example.test/api?quality=high', source))
    expect(url.searchParams.get('quality')).toBe('high')
    expect(url.searchParams.get('id')).toBe(source.id)
    expect(buildMetingURL('https://example.test/:server/:type/:id', source)).toBe(
      'https://example.test/netease/song/591321',
    )
  })
})
