// SPDX-License-Identifier: AGPL-3.0-or-later

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import MusicPlayerCard from '@/components/advanced/extension/cards/MusicPlayerCard.vue'
import { useSettingStore } from '@/stores/setting'

vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))

let wrapper: VueWrapper
afterEach(() => wrapper?.unmount())

const neteaseSong = {
  extension: { type: 'MUSIC', payload: { url: 'https://music.163.com/#/song?id=591321' } },
} as const

describe('Music card audio source failures', () => {
  it('resolves an existing song through the default catalog when the setting is empty', async () => {
    setActivePinia(createPinia())
    const settings = useSettingStore()
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json([{ name: 'Example song', url: 'https://example.test/full.mp3' }]),
      )
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    wrapper = mount(MusicPlayerCard, { props: { echo: neteaseSong } })
    expect(fetchMock).not.toHaveBeenCalled()

    settings.loading = false
    await flushPromises()

    const audio = wrapper.get('audio')
    expect(audio.attributes('src')).toBe('https://example.test/full.mp3')
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).origin).toBe('https://api.injahow.cn')
    vi.spyOn(audio.element, 'duration', 'get').mockReturnValue(187)
    await audio.trigger('loadedmetadata')
    expect(wrapper.get('input[type="range"]').attributes('max')).toBe('187')
    expect(wrapper.text()).toContain('03:07')
  })

  it('updates sources after an audio error and exhausts candidates without looping', async () => {
    setActivePinia(createPinia())
    const settings = useSettingStore()
    settings.loading = false
    settings.SystemSetting.meting_api = 'https://broken-audio.example.test/api'
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ url: 'https://example.test/broken.mp3' }]))
      .mockResolvedValueOnce(Response.json({ endpoints: ['https://fresh.example.test/api'] }))
      .mockResolvedValueOnce(Response.json([{ url: 'https://example.test/fresh.mp3' }]))
      .mockImplementation(async () => Response.json([]))
    vi.stubGlobal('fetch', fetchMock)
    wrapper = mount(MusicPlayerCard, { props: { echo: neteaseSong } })
    await flushPromises()
    expect(wrapper.find('audio').attributes('src')).toBe('https://example.test/broken.mp3')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await wrapper.find('audio').trigger('error')
    await flushPromises()
    expect(wrapper.find('audio').attributes('src')).toBe('https://example.test/fresh.mp3')
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await wrapper.find('audio').trigger('error')
    await flushPromises()
    expect(wrapper.find('audio').exists()).toBe(false)
    expect(wrapper.text()).toContain('extensionCard.musicUnavailable')
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })
})
